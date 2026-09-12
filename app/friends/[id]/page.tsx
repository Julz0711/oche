'use client';
import { use, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Swords } from 'lucide-react';
import { Panel } from '@/components/atoms/Panel';
import { Button } from '@/components/atoms/Button';
import { AppBar, EmptyState, InlineFeedback, MetricGrid, ResultBadge, TextLink } from '@/components/molecules';
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
  if (status === 'unauthenticated') return <main className="social-page page-gutters">
    <AppBar eyebrow="Players" title="Head-to-head" />
    <EmptyState icon={Swords} title="Sign in to see this record" body="Head-to-head records are kept per account." action={<TextLink href="/signin">Sign in</TextLink>} />
  </main>;

  return <main className="social-page page-gutters">
    <AppBar
      back={{ href: '/friends', label: 'Back to friends' }}
      eyebrow="Head-to-head"
      title={data ? `You vs ${data.friend.name}` : 'Head-to-head'}
      action={<TextLink href={`/profile/${id}`} arrow="detail">View profile</TextLink>}
    />
    {error && <InlineFeedback tone="error">
      {error}{!data && <> <button type="button" className="underline" onClick={() => setRetry(n => n + 1)}>Retry</button></>}
    </InlineFeedback>}
    {data ? <>
      <p className="t-meta">One-on-one online matches, across all your games.</p>

      {/* The same unboxed metric grid used on the profile and statistics screens — three
          numbers in three bordered Panels was three boxes doing spacing's job. */}
      <MetricGrid
        cols={3}
        metrics={[
          { label: 'Played', value: data.summary.played },
          { label: 'Your wins', value: data.summary.wins },
          { label: 'Their wins', value: data.summary.losses },
        ]}
      />

      {data.games.length > 0 && <section className="flex flex-col gap-2">
        <div className="section-header"><h2>By game</h2></div>
        <table className="h2h-table">
          <thead><tr><th scope="col">Game</th><th scope="col">Played</th><th scope="col">You</th><th scope="col">Them</th></tr></thead>
          <tbody>{data.games.map(game => <tr key={game.gameId}>
            <th scope="row">{game.gameId}</th><td>{game.played}</td><td>{game.wins}</td><td>{game.losses}</td>
          </tr>)}</tbody>
        </table>
      </section>}

      <section className="flex flex-col gap-2">
        <div className="section-header"><h2>Recent matches</h2></div>
        {data.matches.length ? <div className="social-list">{data.matches.map(match =>
          <Link href={`/match/${match.id}`} key={match.id} className="block">
            <Panel notch="panel" className="social-person">
              <span className="flex flex-col gap-0.5 min-w-0">
                <strong className="uppercase">{match.gameId}</strong>
                <span className="t-meta">{match.completedAt ? new Date(match.completedAt).toLocaleDateString() : 'Completed match'}</span>
              </span>
              <ResultBadge won={match.won} />
            </Panel>
          </Link>)}
        </div> : <EmptyState
          icon={Swords}
          title="No matches together yet"
          body="Create an online room and share its code — results against each other start counting from the first game."
          action={<TextLink href="/">Start a match</TextLink>}
        />}
        {data.nextCursor && <Button className="mt-3 self-start" size="sm" variant="secondary" disabled={busy} onClick={more}>{busy ? 'Loading…' : 'Load more'}</Button>}
      </section>
    </> : !error && <div className="flex flex-col gap-3" aria-busy="true">
      <div className="skeleton h-20" />
      <div className="skeleton h-32" />
    </div>}
  </main>;
}
