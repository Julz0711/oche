'use client';
import { LoadingIndicator } from '@/components/atoms/LoadingIndicator';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Settings, Users } from 'lucide-react';
import { Panel } from '@/components/atoms';
import { PlayerAvatar } from '@/components/profile/PlayerAvatar';
import { Button } from '@/components/atoms/Button';
import { AppBar, EmptyState, InlineFeedback, TextLink } from '@/components/molecules';
import { StatsBoard } from './StatsBoard';
import { Achievements, type AchievementsData } from './Achievements';
import type { StatsBoard as Board } from '@/lib/stats/board';
import type { FriendPerson, FriendsResponse } from '@/lib/friends/types';

/** How many friends the profile previews before deferring to the Friends page. */
const FRIENDS_PREVIEW = 5;

interface ProfileData { person: FriendPerson; periods: Board; achievements: AchievementsData; friends?: FriendPerson[] }
export function ProfileView({ friendId }: { friendId?: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');
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
  async function removeFriend() {
    if (!friendId) return;
    setRemoving(true); setRemoveError('');
    try {
      const res = await fetch(`/api/friends/${friendId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove' }) });
      if (!res.ok) { const body = await res.json(); setRemoveError(body.error ?? 'Could not remove friend.'); return; }
      router.replace('/friends');
    } catch { setRemoveError('Could not connect. Please try again.'); }
    finally { setRemoving(false); }
  }
  const person = friendId ? data?.person : { name: session?.user?.name || 'Player', image: session?.user?.image };
  const name = person?.name || 'Player';

  return <main className="account-page page-gutters">
    {/* The player's name IS the page title — on your own profile as much as on a friend's.
        Titling your own "Profile" left your name nowhere on the screen, while a friend's page
        led with theirs; the avatar chip beside a generic word is not identity. The name is not
        repeated below in an identity card — the audit's "identity repeated multiple times". */}
    <AppBar
      back={friendId ? { href: '/friends', label: 'Back to friends' } : undefined}
      eyebrow={friendId ? 'Player profile' : 'Your account'}
      title={<span className="profile-title">
        <PlayerAvatar name={name} image={person?.image} />
        <span className="truncate">{name}</span>
      </span>}
      action={friendId
        ? <TextLink href={`/friends/${friendId}`} arrow="detail">Head-to-head</TextLink>
        : <TextLink href="/settings" arrow="none"><Settings size={15} aria-hidden="true" /> Settings</TextLink>}
    />

    {error ? <Panel className="p-4 flex flex-col items-start gap-3">
      <InlineFeedback tone="error">{error}</InlineFeedback>
      <Button variant="secondary" onClick={() => setAttempt(n => n + 1)}>Try again</Button>
    </Panel> : !data ? <LoadingIndicator label="Loading profile…" /> : <>
      <StatsBoard board={data.periods} compact={!friendId} showHeatmap={Boolean(friendId)}
        summaryAction={!friendId ? <TextLink href="/stats">Statistics</TextLink> : undefined} />

      {friendId && <Panel className="account-section">
        <div className="section-header"><h2>Friendship</h2></div>
        <p className="t-body">You and {name} are friends. Removing them keeps every match you played together in your history.</p>
        {removeError && <InlineFeedback tone="error">{removeError}</InlineFeedback>}
        {/* Destructive and rarely wanted, so it is a quiet text action rather than a
            full-width button, and it still asks before doing anything. */}
        {confirmRemove
          ? <div className="flex flex-wrap items-center gap-2">
              <p className="t-body">Remove {name} from your friends?</p>
              <Button size="sm" disabled={removing} onClick={removeFriend}>{removing ? 'Removing…' : 'Yes, remove'}</Button>
              <Button size="sm" variant="ghost" disabled={removing} onClick={() => setConfirmRemove(false)}>Cancel</Button>
            </div>
          : <button type="button" className="danger-action" onClick={() => setConfirmRemove(true)}>Remove friend</button>}
      </Panel>}

      <Panel className="account-section">
        <div className="section-header"><h2>Achievements</h2></div>
        <Achievements {...data.achievements} playerName={friendId ? name : undefined} />
      </Panel>

      {!friendId && <section aria-label="Friends"><Panel className="account-section">
        <div className="section-header">
          <h2>Friends <span className="section-header-count">{data.friends?.length ?? 0}</span></h2>
          <TextLink href="/friends">Manage friends</TextLink>
        </div>
        {/* Friends have their own row, so the preview never changes the summary's height. */}
        {data.friends?.length
          ? <div className="profile-friends">
              {data.friends.slice(0, FRIENDS_PREVIEW).map(friend =>
                <TextLink key={friend.id} href={`/profile/${friend.id}`} arrow="detail" className="profile-friend">
                  <PlayerAvatar name={friend.name} image={friend.image} />
                  <span className="truncate">{friend.name}</span>
                </TextLink>)}
              {data.friends.length > FRIENDS_PREVIEW &&
                <TextLink href="/friends" arrow="detail" className="profile-friend profile-friend-more">
                  {data.friends.length - FRIENDS_PREVIEW} more
                </TextLink>}
            </div>
          : <EmptyState
              icon={Users}
              title="No friends yet"
              body="Add a player to compare your matches and keep a head-to-head record."
              action={<TextLink href="/friends">Find friends</TextLink>}
            />}
      </Panel></section>}
    </>}
  </main>;
}
