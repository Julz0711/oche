'use client';
import { useState } from 'react';
import type { StatsBoard as Board, StatsPeriod } from '@/lib/stats/board';

export function StatsBoard({ board, compact = false }: { board: Board; compact?: boolean }) {
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const stats = board[period];
  return <div className="flex flex-col gap-3">
    <div className="period-picker" role="group" aria-label="Statistics period">
      {([['day', 'Today'], ['week', 'This week'], ['month', 'This month'], ['all', 'All time']] as const).map(([key, label]) =>
        <button key={key} type="button" aria-pressed={period === key} onClick={() => setPeriod(key)}>{label}</button>)}
    </div>
    <dl className="profile-totals" aria-live="polite">
      {([['Played', stats.totalMatches], ['Win rate', `${stats.winRate}%`], ['Wins', stats.wins], ['Losses', stats.losses]] as const).map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    {!compact && stats.games.length > 0 && <div className="overflow-x-auto"><table className="stats-board-table"><caption className="sr-only">Results by game for the selected period</caption><thead><tr><th>Game</th><th>Played</th><th>Wins</th><th>Win rate</th></tr></thead><tbody>{stats.games.map(game => <tr key={game.gameId}><th scope="row">{game.gameId}</th><td>{game.totalMatches}</td><td>{game.wins}</td><td>{game.winRate}%</td></tr>)}</tbody></table></div>}
    {stats.totalMatches === 0 && <p className="text-sm text-sisal">No completed matches in this period.</p>}
    <p className="text-[11px] text-sisal">Calendar periods use UTC · Weeks start Monday</p>
  </div>;
}
