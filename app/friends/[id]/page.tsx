'use client';
import { use, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Panel } from '@/components/atoms/Panel';
import { Button } from '@/components/atoms/Button';
import { BackLink } from '@/components/atoms/BackLink';
import type { HeadToHeadResponse } from '@/lib/friends/types';

export default function FriendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const [data, setData] = useState<HeadToHeadResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
  if (status === 'unauthenticated') return <main className="social-page page-gutters"><Link href="/signin" className="social-link">Sign in to view your friends</Link></main>;
  return <main className="social-page page-gutters">
    <BackLink href="/friends" label="Back to friends" />
    {error && <div role="alert" className="social-error"><span>{error}</span>{!data && <Button size="sm" variant="ghost" onClick={() => setRetry(n => n + 1)}>Retry</Button>}</div>}
    {data ? <>
      <header><p>Head-to-head</p><h1 className="page-title">You vs {data.friend.name}</h1><p>One-on-one online matches, across all your games.</p><Link className="social-link" href={`/profile/${id}`}>View player profile →</Link></header>
      <div className="grid grid-cols-3 gap-2">{[['Played', data.summary.played], ['Your wins', data.summary.wins], ['Their wins', data.summary.losses]].map(([label, value]) => <Panel key={label} notch="panel" className="p-3"><p className="text-xs text-sisal">{label}</p><p className="text-[28px] font-display font-bold">{value}</p></Panel>)}</div>
      {data.games.length > 0 && <Panel notch="panel" className="p-3"><h2 className="social-section-title">By game</h2><table className="w-full text-sm"><thead><tr className="text-xs text-sisal text-left"><th className="py-2">Game</th><th>Played</th><th>You</th><th>Them</th></tr></thead><tbody>{data.games.map(game => <tr key={game.gameId} className="border-t border-sisal/15"><th className="py-2 text-left uppercase">{game.gameId}</th><td>{game.played}</td><td>{game.wins}</td><td>{game.losses}</td></tr>)}</tbody></table></Panel>}
      <section><h2 className="social-section-title">Recent matches</h2>{data.matches.length ? <div className="social-list">{data.matches.map(match => <Link href={`/match/${match.id}`} key={match.id}><Panel notch="panel" className="social-person"><div><p className="uppercase font-bold">{match.gameId}</p><p className="text-xs text-sisal">{match.completedAt ? new Date(match.completedAt).toLocaleDateString() : 'Completed match'}</p></div><span className={match.won ? 'text-wire' : 'text-sisal'}>{match.won ? 'You won' : `${data.friend.name} won`}</span></Panel></Link>)}</div> : <p className="text-sm text-sisal">No matches yet. Create an online room and share its code with your friend.</p>}
        {data.nextCursor && <Button className="mt-3" size="sm" variant="secondary" disabled={busy} onClick={more}>{busy ? 'Loading…' : 'Load more'}</Button>}
      </section>
      <Link href="/" className="social-link">Start a game →</Link>
    </> : !error && <p className="text-sm text-sisal">Loading record…</p>}
  </main>;
}
