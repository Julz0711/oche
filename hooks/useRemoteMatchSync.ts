// hooks/useRemoteMatchSync.ts
'use client';
import { useEffect } from 'react';
import { Realtime } from 'ably';
import { useMatchStore } from '@/store/match';

export function useRemoteMatchSync(matchId: string | null) {
  useEffect(() => {
    if (!matchId) return;

    const client = new Realtime({
      authUrl: `/api/ably/token?matchId=${matchId}`,
      authMethod: 'GET',
    });

    const channel = client.channels.get(`match:${matchId}`);

    channel.subscribe('lobby', (msg) => {
      useMatchStore.getState().setPlayers(msg.data.players);
    });

    channel.subscribe('state', (msg) => {
      useMatchStore.getState().setGameState(msg.data.state, msg.data.status);
    });

    const refetchSnapshot = async () => {
      const res = await fetch(`/api/matches/${matchId}`);
      if (!res.ok) return;
      const snapshot = await res.json();
      useMatchStore.getState().setGameState(snapshot.state, snapshot.status);
      useMatchStore.getState().setPlayers(snapshot.players);
    };

    let wasConnected = false;
    client.connection.on((stateChange) => {
      if (stateChange.current === 'connected') {
        if (wasConnected) {
          // reconnected after a drop — cover any messages published while we were offline
          refetchSnapshot();
        }
        wasConnected = true;
      }
    });

    return () => {
      channel.unsubscribe();
      client.close();
    };
  }, [matchId]);
}
