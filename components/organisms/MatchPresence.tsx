'use client';
import { identityIdOf, type MatchPlayerDoc } from '@/lib/matchLobby';

export function MatchPresence({ players, onlinePlayers, connection, presenceReady }: {
  players: MatchPlayerDoc[]; onlinePlayers: string[]; connection: string; presenceReady: boolean;
}) {
  return <div className="match-presence" aria-label="Player connection status">
    {players.map(player => {
      const online = onlinePlayers.includes(identityIdOf(player));
      const known = connection === 'connected' && presenceReady;
      const label = known ? online ? 'Online' : 'Away' : 'Unknown';
      return <span className="presence-player" key={identityIdOf(player)}><i data-online={known && online} aria-hidden="true" /><span className="truncate">{player.name}</span><small>{label}</small></span>;
    })}
    {connection !== 'connected' && <span role="status" className="text-sisal text-[11px]">Reconnecting · scores sync automatically</span>}
  </div>;
}
