'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Panel } from '@/components/atoms/Panel';
import { Button } from '@/components/atoms/Button';
import { BackLink } from '@/components/atoms/BackLink';

export default function JoinRoomPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalized = code.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(normalized)) { setError('Enter the six-character code from the host.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/matches/join/${normalized}`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? 'Could not join this room.'); return; }
      router.push(`/match/${body.id}`);
    } catch { setError('Could not connect. Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  return <main className="social-page page-gutters">
    <BackLink />
    <header><h1 className="page-title">Join a room</h1><p>Ask the host for their room code. You can join as a guest.</p></header>
    <Panel notch="panel" className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="room-code" className="text-xs font-bold uppercase text-sisal">Room code</label>
        <input id="room-code" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }} placeholder="ABCDEF"
          autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12} required
          aria-invalid={!!error} aria-describedby={error ? 'join-error' : undefined}
          className="code-input" />
        {error && <p id="join-error" role="alert" className="text-sm text-treble">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join room'}</Button>
      </form>
    </Panel>
  </main>;
}
