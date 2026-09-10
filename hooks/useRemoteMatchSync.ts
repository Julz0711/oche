'use client';
import { useEffect, useState } from 'react';
import { Realtime } from 'ably';
import { useMatchStore } from '@/store/match';

export function useRemoteMatchSync(matchId: string | null) {
  const [connection, setConnection] = useState('connecting');
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([]);
  const [presenceReady, setPresenceReady] = useState(false);
  useEffect(() => {
    if (!matchId) return;
    setConnection('connecting'); setOnlinePlayers([]); setPresenceReady(false);
    const controller = new AbortController();
    let disposed = false, fetching = false, refreshAgain = false;
    const refresh = async () => {
      if (disposed) return;
      if (fetching) { refreshAgain = true; return; }
      fetching = true;
      try {
        const res = await fetch(`/api/matches/${matchId}`, { signal: controller.signal, cache: 'no-store' });
        if (res.ok) {
          const snapshot = await res.json();
          if (!disposed && useMatchStore.getState().matchId === matchId) {
            useMatchStore.getState().setGameState(snapshot.state, snapshot.status);
            useMatchStore.getState().setPlayers(snapshot.players);
          }
        }
      } catch { /* Polling and reconnection retry transient failures. */ }
      finally {
        fetching = false;
        if (refreshAgain && !disposed) { refreshAgain = false; void refresh(); }
      }
    };
    const client = new Realtime({ authUrl: `/api/ably/token?matchId=${matchId}`, authMethod: 'GET' });
    const channel = client.channels.get(`match:${matchId}`);
    const updatePresence = async () => {
      try {
        const members = await channel.presence.get();
        if (!disposed) { setOnlinePlayers([...new Set(members.map(member => member.clientId))]); setPresenceReady(true); }
      } catch { if (!disposed) setPresenceReady(false); }
    };
    channel.subscribe('state', () => { void refresh(); }).catch(() => {});
    channel.subscribe('lobby', () => { void refresh(); }).catch(() => {});
    channel.presence.subscribe(() => { void updatePresence(); }).catch(() => {});
    channel.presence.enter().then(updatePresence).catch(() => {});
    client.connection.on(change => {
      if (disposed) return;
      setConnection(change.current);
      if (change.current === 'connected') { void refresh(); void updatePresence(); }
      else setPresenceReady(false);
    });
    const foreground = () => { if (!document.hidden) void refresh(); };
    const mutation = (event: Event) => { if ((event as CustomEvent<string>).detail === matchId) void refresh(); };
    window.addEventListener('oche-match-refresh', mutation);
    window.addEventListener('online', foreground);
    document.addEventListener('visibilitychange', foreground);
    let lastPoll = Date.now();
    const poll = setInterval(() => {
      const healthy = client.connection.state === 'connected' && channel.state === 'attached';
      const interval = healthy ? 30_000 : 5_000;
      if (!document.hidden && Date.now() - lastPoll >= interval) {
        lastPoll = Date.now();
        void refresh();
      }
    }, 1000);
    void refresh();
    return () => {
      disposed = true; controller.abort(); clearInterval(poll);
      window.removeEventListener('oche-match-refresh', mutation);
      window.removeEventListener('online', foreground);
      document.removeEventListener('visibilitychange', foreground);
      channel.unsubscribe(); channel.presence.unsubscribe(); client.close();
    };
  }, [matchId]);
  return { connection, onlinePlayers, presenceReady };
}
