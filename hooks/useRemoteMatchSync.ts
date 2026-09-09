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

    // Navigating away can close the client while subscription is still pending.
    // Ably handles reconnects; lobby polling below covers unavailable transport.
    channel.subscribe('lobby', (msg) => {
      useMatchStore.getState().setPlayers(msg.data.players);
    }).catch(() => {});

    channel.subscribe('state', (msg) => {
      useMatchStore.getState().setGameState(msg.data.state, msg.data.status);
    }).catch(() => {});

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

    // Fallback poll for the lobby wait only: Ably's realtime push can be unavailable (no
    // ABLY_API_KEY configured, a token/connection failure) and a host stuck on "waiting for
    // player…" with no feedback is the worst version of that gap. Once the match leaves 'lobby'
    // this stops itself — live play stays on the real-time push path, not polling.
    const lobbyPoll = setInterval(() => {
      if (useMatchStore.getState().status === 'lobby') {
        refetchSnapshot();
      } else {
        clearInterval(lobbyPoll);
      }
    }, 3000);

    return () => {
      channel.unsubscribe();
      client.close();
      clearInterval(lobbyPoll);
    };
  }, [matchId]);
}
