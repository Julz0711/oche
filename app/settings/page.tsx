'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { tokens } from '@/lib/theme';
import { Panel } from '@/components/atoms';
import { PlayerAvatar } from '@/components/profile/PlayerAvatar';
import { Button } from '@/components/atoms/Button';
import { BackLink } from '@/components/atoms/BackLink';
import { useSoundPreference } from '@/hooks/useSoundPreference';
import { Volume2, VolumeX } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundPreference();
  const { data: session, status: sessionStatus, update } = useSession();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/signin');
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name cannot be empty');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not save');
        return;
      }
      await update({ name: trimmed });
      setSaved(true);
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (sessionStatus !== 'authenticated' || !session?.user) {
    return (
      <div className="auth-page page-gutters flex items-center justify-center min-h-screen p-3" style={{ backgroundColor: tokens.oche }}>
        <span style={{ color: tokens.sisal }}>Loading...</span>
      </div>
    );
  }

  return (
    <main className="account-page page-gutters">
      <BackLink href="/profile" label="Back to profile" />
      <header className="page-heading"><div><p className="eyebrow">Your account</p><h1 className="page-title">Settings</h1></div></header>
      <div className="settings-layout">
        <Panel notch="card" className="account-section">
          <div className="section-heading"><h2>Profile details</h2></div>
          <div className="flex items-center gap-3"><PlayerAvatar name={session.user.name || 'Player'} image={session.user.image} large /><p className="text-sm text-sisal">Your name and photo identify you to friends and other players.</p></div>
          <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); void handleSave(); }}>
            <div className="flex flex-col gap-1.5"><label htmlFor="display-name" className="eyebrow">Display name</label><input id="display-name" disabled={saving} autoComplete="nickname" value={name} onChange={e => { setName(e.target.value); setSaved(false); setError(null); }} maxLength={60} required className="account-input" aria-describedby="name-help" /><p id="name-help" className="text-xs text-sisal">Shown in rooms, on your profile and in your friends list.</p></div>
            {error && <p role="alert" className="text-sm text-treble">{error}</p>}
            {saved && !error && <p role="status" className="text-sm text-wire">Changes saved.</p>}
            <div><Button type="submit" disabled={saving || name.trim() === (session.user.name ?? '')}>{saving ? 'Saving…' : 'Save changes'}</Button></div>
          </form>
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel notch="panel" className="account-section"><div className="section-heading"><h2>Account</h2></div><p className="text-sm text-sisal">Signed in as <span className="text-chalk">{session.user.name}</span></p><p className="text-sm text-sisal break-all">{session.user.email}</p><div className="border-t border-sisal/20 pt-3"><Button variant="secondary" onClick={() => signOut({ callbackUrl: '/' })}>Sign out</Button></div></Panel>
          <Panel notch="panel" className="account-section"><div className="section-heading"><h2>Sound</h2></div><div className="flex items-center justify-between gap-3"><p className="text-sm text-sisal">Game effects on this device</p><Button variant="secondary" onClick={toggleSound} aria-pressed={!soundEnabled} aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'} className="flex items-center gap-2 shrink-0">{soundEnabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}{soundEnabled ? 'Sound on' : 'Muted'}</Button></div></Panel>
        </div>
      </div>
    </main>
  );
}
