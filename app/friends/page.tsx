'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Panel } from '@/components/atoms/Panel';
import { Button } from '@/components/atoms/Button';
import { normalizeFriendCode } from '@/lib/friends/policy';
import type { FriendsResponse, FriendAction, FriendPerson } from '@/lib/friends/types';

export default function FriendsPage() {
  const { status } = useSession();
  const [data, setData] = useState<FriendsResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
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
    try { await navigator.clipboard.writeText(data.code); setNotice('Friend code copied.'); }
    catch { setError('Could not copy. You can select and copy the code below.'); }
  }
  if (status === 'loading') return <main className="social-page page-gutters">Loading friends…</main>;
  if (status === 'unauthenticated') return <main className="social-page page-gutters"><header><h1>Friends</h1><p>Sign in to add friends and keep your head-to-head records.</p></header><Link href="/signin" className="social-link">Sign in</Link></main>;
  return <main className="social-page page-gutters">
    <header><h1>Friends</h1><p>Your players, your rivalries.</p></header>
    {error && <div role="alert" className="social-error"><span>{error}</span><Button size="sm" variant="ghost" onClick={() => { setError(''); void load(); }}>Retry</Button></div>}
    {notice && <p role="status" className="text-sm text-wire">{notice}</p>}
    {data ? <>
      <Panel notch="panel" className="p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="text-xs text-sisal">Your friend code</p><p className="friend-code select-all">{data.code.match(/.{1,4}/g)?.join(' ')}</p></div><Button size="sm" variant="secondary" onClick={copyCode}>Copy</Button></div>
        <form onSubmit={request} className="flex flex-col gap-2 border-t border-sisal/20 pt-3">
          <label htmlFor="friend-code" className="text-xs font-bold uppercase text-sisal">Add a player</label>
          <div className="flex gap-2"><input id="friend-code" className="code-input min-w-0 flex-1" placeholder="Their friend code" value={code} maxLength={16} autoCapitalize="characters" autoComplete="off" spellCheck={false} required onChange={e => setCode(e.target.value.toUpperCase())} /><Button type="submit" size="sm" disabled={busy || normalizeFriendCode(code).length !== 12}>Send</Button></div>
        </form>
      </Panel>
      {data.incoming.length > 0 && <section><h2 className="social-section-title">Requests · {data.incoming.length}</h2><div className="social-list">{data.incoming.map(person => <Panel key={person.id} notch="panel" className="social-person"><span>{person.name}</span><div className="flex gap-1"><Button size="sm" disabled={busy} onClick={() => act(person, 'accept')}>Accept</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => act(person, 'decline')}>Decline</Button></div></Panel>)}</div></section>}
      <section><h2 className="social-section-title">Friends · {data.friends.length}</h2>{data.friends.length ? <div className="social-list">{data.friends.map(person => <Link key={person.id} href={`/friends/${person.id}`} className="block"><Panel notch="panel" className="social-person"><span>{person.name}</span><span className="text-xs text-wire">Head-to-head →</span></Panel></Link>)}</div> : <p className="text-sm text-sisal">Share your code or enter a friend’s code to get started.</p>}</section>
      {data.outgoing.length > 0 && <section><h2 className="social-section-title">Sent requests · {data.outgoing.length}</h2><div className="social-list">{data.outgoing.map(person => <Panel key={person.id} notch="panel" className="social-person"><span>{person.name}</span><Button size="sm" variant="ghost" disabled={busy} onClick={() => act(person, 'cancel')}>Cancel</Button></Panel>)}</div></section>}
    </> : !error && <p className="text-sm text-sisal">Loading friends…</p>}
  </main>;
}
