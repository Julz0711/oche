'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, ArrowUpRight } from 'lucide-react';
import { Panel } from '@/components/atoms';
import { PlayerAvatar } from '@/components/profile/PlayerAvatar';
import { Button } from '@/components/atoms/Button';
import { StatsBoard } from './StatsBoard';
import { Achievements, type AchievementsData } from './Achievements';
import type { StatsBoard as Board } from '@/lib/stats/board';
import type { FriendPerson, FriendsResponse } from '@/lib/friends/types';

interface ProfileData { person: FriendPerson; periods: Board; achievements: AchievementsData; friends?: FriendPerson[] }
export function ProfileView({ friendId }: { friendId?: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { if (status === 'unauthenticated') router.replace('/signin'); }, [status, router]);
  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setError(''); setData(null);
    async function read(url: string) {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load profile.');
      return json;
    }
    async function load() {
      try {
        if (friendId) setData(await read(`/api/friends/${friendId}/profile`));
        else {
          const [stats, achievements, friends]: [{ periods: Board }, AchievementsData, FriendsResponse] = await Promise.all([read('/api/user/stats'), read('/api/user/achievements'), read('/api/friends')]);
          setData({ person: { id: userId!, name: '' }, periods: stats.periods, achievements, friends: friends.friends });
        }
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load profile.'); }
    }
    void load(); return () => controller.abort();
  }, [friendId, userId, attempt]);
  const person = friendId ? data?.person : { name: session?.user?.name || 'Player', image: session?.user?.image };
  return <main className="account-page page-gutters">
    <header className="page-heading"><div><p className="eyebrow">{friendId ? 'Player profile' : 'Your account'}</p><h1>{friendId ? person?.name || 'Player' : 'Profile'}</h1></div><Link className="quiet-action" href={friendId ? '/friends' : '/settings'}>{friendId ? '← Friends' : <><Settings size={16} /> Account settings</>}</Link></header>
    {error ? <Panel notch="panel" className="p-4"><p role="alert">{error}</p><Button variant="secondary" onClick={() => setAttempt(n => n + 1)}>Try again</Button></Panel> : !data ? <p role="status" className="text-sm text-sisal">Loading profile…</p> : <>
      <Panel notch="card" className="profile-identity"><PlayerAvatar name={person!.name} image={person?.image} large /><div className="min-w-0"><p className="eyebrow">{friendId ? 'Your friend' : 'Currently logged in as'}</p><h2 className="break-words font-display text-[28px] leading-tight">{person!.name}</h2></div>{friendId && <Link className="quiet-action ml-auto" href={`/friends/${friendId}`}>Head-to-head <ArrowUpRight size={16} /></Link>}</Panel>
      <div className="profile-layout"><div className="flex flex-col gap-4">
        <Panel notch="panel" className="account-section"><div className="section-heading"><h2>Match summary</h2>{!friendId && <Link href="/stats">Full statistics →</Link>}</div><StatsBoard board={data.periods} compact={!friendId} showHeatmap={Boolean(friendId)} /></Panel>
        <Panel notch="panel" className="account-section"><div className="section-heading"><h2>Achievements</h2></div><Achievements {...data.achievements} /></Panel>
      </div>{!friendId && <aside><Panel notch="panel" className="account-section"><div className="section-heading"><h2>Friends <span className="text-sisal">{data.friends?.length ?? 0}</span></h2><Link href="/friends">Manage →</Link></div>{data.friends?.length ? <div className="profile-friends">{data.friends.map(friend => <Link href={`/profile/${friend.id}`} className="profile-friend" key={friend.id}><PlayerAvatar name={friend.name} image={friend.image} /><span className="truncate">{friend.name}</span><ArrowUpRight size={15} className="ml-auto shrink-0 text-sisal" /></Link>)}</div> : <p className="text-sm text-sisal">Add a friend to see their profile and compare your matches. <Link className="text-wire" href="/friends">Find friends →</Link></p>}</Panel></aside>}</div>
    </>}
  </main>;
}
