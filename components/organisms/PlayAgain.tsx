'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { useMatchStore } from '@/store/match';

const defaults: Record<string, Record<string, string | number>> = {
  x01: { startingScore: '501', checkOut: 'double', checkIn: 'straight', firstTo: 1, sets: 0, firstThrow: 'alternate' },
  cricket: { firstTo: 1 },
  copycat: { firstTo: 3, firstThrow: 'alternate' },
};

export function PlayAgain({ matchId, gameId, settings }: {
  matchId: string; gameId: string; settings: Record<string, string | number>;
}) {
  const mode = useMatchStore(s => s.mode);
  const you = useMatchStore(s => s.you);
  const hostId = useMatchStore(s => s.hostId);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(gameId);
  const [values, setValues] = useState<Record<string, string | number>>({ ...settings, startingScore: String(settings.startingScore ?? 501) });
  const [nextId, setNextId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'remote' || !you || nextId) return;
    const controller = new AbortController();
    const check = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`, { signal: controller.signal, cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.nextMatchId) setNextId(data.nextMatchId);
        }
      } catch { /* A transient connection failure is retried on the next poll. */ }
    };
    void check();
    const timer = setInterval(() => { if (!document.hidden) void check(); }, 3000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [matchId, mode, you, nextId]);

  if (mode !== 'remote' || !you) return null;
  // A full navigation intentionally resets the match store and all scoring/achievement refs.
  if (nextId) return <Button onClick={() => window.location.assign(`/match/${nextId}`)}>Join next match</Button>;
  if (you !== hostId) return <p className="text-sm text-center text-chalk/60" role="status">Waiting for the host to set up another match.</p>;

  const field = (key: string, label: string, options: (string | number)[], labels?: string[]) => (
    <div className="flex flex-col gap-1 text-xs" key={key}>
      <label htmlFor={`rematch-${key}`}>{label}</label>
      <select id={`rematch-${key}`} className="min-h-11 w-full bg-slate text-chalk border border-chalk/20 px-2 text-base" value={values[key] ?? ''}
        onChange={e => setValues(v => ({ ...v, [key]: typeof options[0] === 'number' ? Number(e.target.value) : e.target.value }))}>
        {options.map((option, i) => <option key={option} value={option}>{labels?.[i] ?? option}</option>)}
      </select>
    </div>
  );
  async function create() {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/matches/${matchId}/rematch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId: selected, settings: values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create the next match');
      window.location.assign(`/match/${data.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Connection failed. Please retry.'); setBusy(false); }
  }
  return <div className="flex flex-col gap-2">
    <Button variant="secondary" aria-expanded={expanded} aria-controls="rematch-setup" onClick={() => setExpanded(!expanded)}>Play again</Button>
    {expanded && <form id="rematch-setup" className="flex flex-col gap-3 border border-chalk/20 p-3" onSubmit={e => { e.preventDefault(); void create(); }}>
      <p className="text-sm text-chalk/60">Same room and players. Choose the next game before opening the lobby.</p>
      <fieldset disabled={busy} className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1 text-xs col-span-2"><label htmlFor="rematch-game">Game</label>
          <select id="rematch-game" className="min-h-11 bg-slate border border-chalk/20 px-2 text-base" value={selected} onChange={e => {
            setSelected(e.target.value); setValues({ ...defaults[e.target.value], startingScore: String(defaults[e.target.value].startingScore ?? 501) });
          }}>
            <option value="x01">X01</option><option value="cricket">Cricket</option><option value="copycat">Copycat</option>
          </select>
        </div>
        {selected === 'x01' && <>
          {field('startingScore', 'Starting score', ['301', '501', '701'])}
          {field('checkOut', 'Check out', ['double', 'straight', 'master'], ['Double', 'Straight', 'Master'])}
          {field('checkIn', 'Check in', ['straight', 'double'], ['Straight', 'Double'])}
          {field('sets', 'Sets to win', [0, 1, 2, 3, 4, 5, 6, 7], ['No sets', '1', '2', '3', '4', '5', '6', '7'])}
        </>}
        {field('firstTo', selected === 'copycat' ? 'Points to win' : 'Legs to win', selected === 'copycat' ? [3, 5, 7, 9] : [1, 2, 3, 4, 5, 6, 7])}
        {selected !== 'cricket' && field('firstThrow', 'First throw', ['alternate', 'player1', 'random', 'bulloff'], ['Alternate', 'Player 1', 'Random', 'Bull-off'])}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Opening lobby…' : 'Open next match lobby'}</Button>
    </form>}
  </div>;
}
