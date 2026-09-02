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

export async function publishMatchEvent(matchId: string, event: MatchEvent): Promise<void> {
  const channel = getRestClient().channels.get(matchChannelName(matchId));
  await channel.publish(event.name, event.data);
}

export async function createMatchToken(matchId: string, clientId: string) {
  const client = getRestClient();
  return client.auth.createTokenRequest({
    clientId,
    capability: { [matchChannelName(matchId)]: ['subscribe'] },
  });
}
