// lib/realtime.ts
import { Rest } from 'ably';

let restClient: Rest | null = null;

function getRestClient(): Rest {
  if (!restClient) {
    const key = process.env.ABLY_API_KEY;
    if (!key) throw new Error('ABLY_API_KEY not set');
    restClient = new Rest({ key });
  }
  return restClient;
}

export function matchChannelName(matchId: string): string {
  return `match:${matchId}`;
}

export type MatchEvent =
  | { name: 'lobby'; data: { players: unknown[] } }
  | { name: 'state'; data: { state: unknown; status: string; winnerId?: string | null } };

/**
 * Best-effort broadcast: by the time this is called, the authoritative DB write it's announcing
 * has already committed, so a publish failure (missing ABLY_API_KEY, a transient Ably outage,
 * network blip) must never fail the caller's response or roll back what already succeeded —
 * clients without connectivity to this event still recover via useRemoteMatchSync's
 * reconnect-triggered refetch. Errors are logged, never thrown.
 */
export async function publishMatchEvent(matchId: string, event: MatchEvent): Promise<void> {
  try {
    const channel = getRestClient().channels.get(matchChannelName(matchId));
    // History grows across legs. Keep Ably messages constant-sized; clients load the
    // authoritative snapshot over HTTP instead of broadcasting history with every dart.
    await channel.publish(event.name, { refresh: true });
  } catch (err) {
    console.error(`publishMatchEvent failed for match ${matchId}, event '${event.name}':`, err);
  }
}

export async function createMatchToken(matchId: string, clientId: string) {
  const client = getRestClient();
  return client.auth.createTokenRequest({
    clientId,
    capability: { [matchChannelName(matchId)]: ['subscribe', 'presence'] },
  });
}
