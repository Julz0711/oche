'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LoadingIndicator } from '@/components/atoms/LoadingIndicator';
import { Button } from '@/components/atoms/Button';
import { AppBar, InlineFeedback } from '@/components/molecules';
import { useSoundPreference } from '@/hooks/useSoundPreference';

/** Shows enough of an address to recognise it, without putting the whole thing on screen for
 *  anyone glancing over — or in a screenshot. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '••••';
  const head = local.slice(0, 2);
  return `${head}${'•'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundPreference();
  const { data: session, status: sessionStatus, update } = useSession();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);

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
    return <LoadingIndicator fullPage label="Loading settings…" />;
  }

  const dirty = name.trim() !== (session.user.name ?? '') && name.trim().length > 0;

  return (
    <main className="account-page page-gutters">
      <AppBar back={{ href: '/profile', label: 'Back to profile' }} eyebrow="Your account" title="Settings" />
      <div className="settings-sheet">
        <section className="setting-section">
          <div className="setting-label"><h2>Player profile</h2></div>
          <div className="setting-content">
            <form onSubmit={e => { e.preventDefault(); void handleSave(); }}>
              <label htmlFor="display-name">Display name</label>
              <div className="settings-name-field">
                <input id="display-name" disabled={saving} autoComplete="nickname" value={name}
                  onChange={e => { setName(e.target.value); setSaved(false); setError(null); }}
                  maxLength={60} required className="account-input" aria-describedby="name-help" />
                <Button type="submit" size="sm" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Button>
              </div>
              <p id="name-help" className="t-meta">Shown to other players.</p>
              {error && <InlineFeedback tone="error">{error}</InlineFeedback>}
              {saved && !error && <InlineFeedback tone="success">Your display name was saved.</InlineFeedback>}
            </form>
          </div>
        </section>
        <section className="setting-section setting-preferences">
          <div className="setting-label"><h2>Preferences</h2></div>
          <div className="setting-content setting-sound-row">
            <div><h3>Game sounds</h3><p>Sound effects on this device.</p></div>
            <button type="button" className="sound-toggle" role="switch" aria-checked={soundEnabled}
              aria-label="Game sounds" onClick={toggleSound}>
              <span className="switch-track" aria-hidden="true"><span /></span>
              {soundEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </section>
        <section className="setting-section">
          <div className="setting-label"><h2>Sign-in &amp; security</h2></div>
          <div className="setting-content">
            <div className="settings-email"><span>Email address</span>
              <button type="button" className="reveal-value" onClick={() => setShowEmail(v => !v)} aria-expanded={showEmail}>
                {showEmail ? session.user.email : maskEmail(session.user.email ?? '')}
                <span className="reveal-hint">{showEmail ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="settings-signout"><span>Finished on this device?</span><button type="button" className="danger-action" onClick={() => signOut({ callbackUrl: '/' })}>Sign out</button></div>
          </div>
        </section>
      </div>
    </main>
  );
}
