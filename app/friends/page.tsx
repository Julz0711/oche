'use client';
import { LoadingIndicator } from '@/components/atoms/LoadingIndicator';
import { PlayerAvatar } from '@/components/profile/PlayerAvatar';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy, Share2, Users } from 'lucide-react';
import { Panel } from '@/components/atoms/Panel';
import { Button } from '@/components/atoms/Button';
import { AppBar, EmptyState, InlineFeedback, TextLink } from '@/components/molecules';
import { normalizeFriendCode } from '@/lib/friends/policy';
import type { FriendsResponse, FriendAction, FriendPerson } from '@/lib/friends/types';

/** Below this many friends a search field is just another control to skip past. */
const SEARCH_THRESHOLD = 8;

export default function FriendsPage() {
  const { status } = useSession();
  const [data, setData] = useState<FriendsResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  // Read after mount: navigator.share does not exist during the server render, and on
  // desktop browsers it usually doesn't exist at all.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'); }, []);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    try {
      const response = await fetch('/api/friends', { signal: request.signal, cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? 'Could not load friends.'); return; }
      if (!request.signal.aborted) setData(body);
    } catch { if (!request.signal.aborted) setError('Could not connect. Please try again.'); }
  }, []);
  useEffect(() => {
    if (status !== 'authenticated') return;
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); controller.current?.abort(); };
  }, [status, load]);
  async function mutate(url: string, body: object, method: string, message: string) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? 'Could not update friends.'); await load(); return; }
      setNotice(message); setCode(''); await load();
    } catch { setError('Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate('/api/friends', { code: normalizeFriendCode(code) }, 'POST', 'Friend request sent.');
  }
  const act = (person: FriendPerson, action: FriendAction) => void mutate(`/api/friends/${person.id}`, { action }, 'PATCH', action === 'accept' ? `You and ${person.name} are now friends.` : 'Request cleared.');
  async function copyCode() {
    if (!data) return;
    try { await navigator.clipboard.writeText(data.code); setCopied(true); }
    catch { setError('Could not copy. You can select the code and copy it by hand.'); }
  }
  async function shareCode() {
    if (!data) return;
    try { await navigator.share({ title: 'Add me on Oche', text: `My Oche friend code is ${data.code}` }); }
    catch { /* The user dismissed the share sheet — not an error worth reporting. */ }
  }
  const visibleFriends = (data?.friends ?? []).filter(person =>
    person.name.toLowerCase().includes(query.trim().toLowerCase()));
  if (status === 'loading') return <LoadingIndicator fullPage label="Loading friends…" />;
  if (status === 'unauthenticated') return <main className="social-page page-gutters">
    <AppBar eyebrow="Players" title="Friends" />
    <EmptyState
      icon={Users}
      title="Sign in to add friends"
      body="Friends let you keep a head-to-head record and compare statistics after every match."
      action={<TextLink href="/signin">Sign in</TextLink>}
    />
  </main>;

  return <main className="social-page page-gutters">
    <AppBar eyebrow="Players" title="Friends" />

    {error && <InlineFeedback tone="error">
      {error} <button type="button" className="underline" onClick={() => { setError(''); void load(); }}>Retry</button>
    </InlineFeedback>}
    {notice && <InlineFeedback tone="success">{notice}</InlineFeedback>}

    {data ? <>
      {/* One compact block: your code with its actions on one line, then the add field.
          This used to be a tall slab that dominated a page whose actual content — the
          friends list — sat below it. */}
      <section className="friend-tools" aria-label="Add friends">
        <div className="friend-code-row">
          <div>
            <p className="friend-tools-label">Your friend code</p>
            <p className="friend-code select-all">{data.code.match(/.{1,4}/g)?.join(' ')}</p>
          </div>
          <div className="friend-code-actions">
            <Button size="sm" variant="secondary" onClick={copyCode} className="flex items-center gap-2">
              {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}<span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
            </Button>
            {canShare && <Button size="sm" variant="secondary" onClick={shareCode} className="flex items-center gap-2">
              <Share2 size={14} aria-hidden="true" />Share
            </Button>}
          </div>
        </div>

        <form onSubmit={request} className="friend-add-form">
          <label htmlFor="friend-code" className="friend-tools-label">Add a friend</label>
          <div className="flex gap-2">
            <input
              id="friend-code"
              className="code-input min-w-0 flex-1"
              placeholder="Enter friend code"
              value={code}
              maxLength={16}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              required
              onChange={e => setCode(e.target.value.toUpperCase())}
            />
            <Button type="submit" size="sm" disabled={busy || normalizeFriendCode(code).length !== 12} className="shrink-0">
              {busy ? 'Sending…' : 'Add friend'}
            </Button>
          </div>
        </form>
      </section>

      {data.incoming.length > 0 && <section className="flex flex-col gap-2">
        <div className="section-header"><h2>Requests <span className="section-header-count">{data.incoming.length}</span></h2></div>
        <div className="social-list">{data.incoming.map(person =>
          <Panel key={person.id} className="social-person">
            <span className="flex items-center gap-3 min-w-0"><PlayerAvatar name={person.name} image={person.image} /><span className="truncate">{person.name}</span></span>
            <div className="flex gap-1">
              <Button size="sm" disabled={busy} onClick={() => act(person, 'accept')}>Accept</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(person, 'decline')}>Decline</Button>
            </div>
          </Panel>)}
        </div>
      </section>}

      {/* Friend rows carry two destinations, two links — the row used to be one big link to
          the profile with a "View profile" label floating a thousand pixels away from the name
          on desktop. Head-to-head is the thing you actually want from a friend in a darts app,
          and it was reachable only from inside their profile. */}
      <section className="flex flex-col gap-2">
        <div className="section-header"><h2>Friends <span className="section-header-count">{data.friends.length}</span></h2></div>
        {/* Search only earns its space once the list is long enough to need it. */}
        {data.friends.length > SEARCH_THRESHOLD && <input
          type="search"
          className="code-input"
          placeholder="Search friends"
          aria-label="Search friends"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />}
        {data.friends.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No friends yet"
            body="Share your code above, or enter someone else's, and their matches against you start counting."
          />
        ) : visibleFriends.length === 0 ? (
          <EmptyState title="No matches for that search" body={`Nobody in your friends list matches "${query}".`} />
        ) : (
          <div className="social-list">{visibleFriends.map(person =>
            <Panel key={person.id} className="social-person">
              <Link href={`/profile/${person.id}`} className="social-person-name">
                <PlayerAvatar name={person.name} image={person.image} /><span className="truncate">{person.name}</span>
              </Link>
              <Link href={`/friends/${person.id}`} className="text-link shrink-0">Head-to-head<ArrowUpRight size={15} aria-hidden="true" /></Link>
            </Panel>)}
          </div>
        )}
      </section>

      {data.outgoing.length > 0 && <section className="flex flex-col gap-2">
        <div className="section-header"><h2>Sent requests <span className="section-header-count">{data.outgoing.length}</span></h2></div>
        <div className="social-list">{data.outgoing.map(person =>
          <Panel key={person.id} className="social-person">
            <span className="flex items-center gap-3 min-w-0"><PlayerAvatar name={person.name} image={person.image} /><span className="truncate">{person.name}</span></span>
            <span className="t-meta shrink-0">Pending</span>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(person, 'cancel')}>Cancel</Button>
          </Panel>)}
        </div>
      </section>}
    </> : !error && <div className="flex flex-col gap-3" aria-busy="true">
      <div className="skeleton h-28" />
      <div className="skeleton h-14" />
      <div className="skeleton h-14" />
    </div>}
  </main>;
}
