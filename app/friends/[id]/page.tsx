'use client';
import { use, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Panel } from '@/components/atoms/Panel';
import { Button } from '@/components/atoms/Button';
import { BackLink } from '@/components/atoms/BackLink';
import type { HeadToHeadResponse } from '@/lib/friends/types';

export default function FriendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<HeadToHeadResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    setData(null); setError('');
    (async () => {
      try {
        const response = await fetch(`/api/friends/${id}`, { signal: controller.signal, cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) { setError(result.error ?? 'Could not load this record.'); return; }
        setData(result);
      } catch { if (!controller.signal.aborted) setError('Could not connect. Please try again.'); }
    })();
    return () => controller.abort();
  }, [id, status, retry]);
  async function more() {
    if (!data?.nextCursor || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/friends/${id}?cursor=${data.nextCursor}`, { cache: 'no-store' });
      const result: HeadToHeadResponse & { error?: string } = await response.json();
      if (!response.ok) { setError(result.error ?? 'Could not load more matches.'); return; }
      setData(current => current ? { ...result, matches: [...current.matches, ...result.matches] } : result);
    } catch { setError('Could not load more matches. Please try again.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/friends/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove' }) });
      if (!response.ok) { const body = await response.json(); setError(body.error ?? 'Could not remove friend.'); return; }
      router.replace('/friends');
    } catch { setError('Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  if (status === 'unauthenticated') return <main className="social-page page-gutters"><Link href="/signin" className="social-link">Sign in to view your friends</Link></main>;
  return <main className="social-page page-gutters">
    <BackLink href="/friends" label="Back to friends" />
    {error && <div role="alert" className="social-error"><span>{error}</span>{!data && <Button size="sm" variant="ghost" onClick={() => setRetry(n => n + 1)}>Retry</Button>}</div>}
    {data ? <>
      <header><p>Head-to-head</p><h1 className="break-words">You vs {data.friend.name}</h1><p>One-on-one online matches, across all your games.</p><Link className="social-link" href={`/profile/${id}`}>View player profile →</Link></header>
      <div className="grid grid-cols-3 gap-2">{[['Played', data.summary.played], ['Your wins', data.summary.wins], ['Their wins', data.summary.losses]].map(([label, value]) => <Panel key={label} notch="panel" className="p-3"><p className="text-xs text-sisal">{label}</p><p className="text-[28px] font-display font-bold">{value}</p></Panel>)}</div>
      {data.games.length > 0 && <Panel notch="panel" className="p-3"><h2 className="social-section-title">By game</h2><table className="w-full text-sm"><thead><tr className="text-xs text-sisal text-left"><th className="py-2">Game</th><th>Played</th><th>You</th><th>Them</th></tr></thead><tbody>{data.games.map(game => <tr key={game.gameId} className="border-t border-sisal/15"><th className="py-2 text-left uppercase">{game.gameId}</th><td>{game.played}</td><td>{game.wins}</td><td>{game.losses}</td></tr>)}</tbody></table></Panel>}
      <section><h2 className="social-section-title">Recent matches</h2>{data.matches.length ? <div className="social-list">{data.matches.map(match => <Link href={`/match/${match.id}`} key={match.id}><Panel notch="panel" className="social-person"><div><p className="uppercase font-bold">{match.gameId}</p><p className="text-xs text-sisal">{match.completedAt ? new Date(match.completedAt).toLocaleDateString() : 'Completed match'}</p></div><span className={match.won ? 'text-wire' : 'text-sisal'}>{match.won ? 'You won' : `${data.friend.name} won`}</span></Panel></Link>)}</div> : <p className="text-sm text-sisal">No matches yet. Create an online room and share its code with your friend.</p>}
        {data.nextCursor && <Button className="mt-3" size="sm" variant="secondary" disabled={busy} onClick={more}>{busy ? 'Loading…' : 'Load more'}</Button>}
      </section>
      <Link href="/" className="social-link">Start a game →</Link>
      <details className="border-t border-sisal/20 pt-2"><summary className="min-h-11 flex items-center text-xs text-sisal cursor-pointer">Manage friendship</summary>{confirmRemove ? <div className="flex flex-col gap-2"><p className="text-sm">Remove {data.friend.name} from your friends? Your match history will stay saved.</p><div className="flex gap-2"><Button size="sm" disabled={busy} onClick={remove}>Remove friend</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmRemove(false)}>Keep friend</Button></div></div> : <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(true)}>Remove friend</Button>}</details>
    </> : !error && <p className="text-sm text-sisal">Loading record…</p>}
  </main>;
}
