'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LoadingIndicator } from '@/components/atoms/LoadingIndicator';
import { Panel } from '@/components/atoms';
import { PlayerAvatar } from '@/components/profile/PlayerAvatar';
import { Button } from '@/components/atoms/Button';
import { AppBar, InlineFeedback } from '@/components/molecules';
import { useSoundPreference } from '@/hooks/useSoundPreference';
import { Volume2, VolumeX } from 'lucide-react';

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
      <div className="settings-layout">
        <Panel notch="card" className="account-section">
          <div className="section-header"><h2>Profile details</h2></div>
          <div className="flex items-center gap-3">
            <PlayerAvatar name={session.user.name || 'Player'} image={session.user.image} large />
            <p className="t-body">Your name and photo identify you to friends and other players.</p>
          </div>
          <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void handleSave(); }}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="display-name" className="eyebrow">Display name</label>
              <input
                id="display-name"
                disabled={saving}
                autoComplete="nickname"
                value={name}
                onChange={e => { setName(e.target.value); setSaved(false); setError(null); }}
                maxLength={60}
                required
                className="account-input"
                aria-describedby="name-help"
              />
              <p id="name-help" className="t-meta">Shown in rooms, on your profile and in your friends list.</p>
            </div>
            {error && <InlineFeedback tone="error">{error}</InlineFeedback>}
            {saved && !error && <InlineFeedback tone="success">Your display name was saved.</InlineFeedback>}
            {/* Disabled until the name actually differs from the saved one, so the button
                stops claiming there is something to save when there isn't. */}
            <div>
              <Button type="submit" disabled={saving || !dirty}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel notch="panel" className="account-section">
            <div className="section-header"><h2>Sound</h2></div>
            <div className="flex items-center justify-between gap-3">
              <p className="t-body">Game effects on this device</p>
              <Button
                variant="secondary"
                onClick={toggleSound}
                aria-pressed={!soundEnabled}
                aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
                className="flex items-center gap-2 shrink-0"
              >
                {soundEnabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
                {soundEnabled ? 'Sound on' : 'Muted'}
              </Button>
            </div>
          </Panel>

          {/* Account identifiers are low-frequency and privacy-sensitive, so they sit last,
              at metadata weight, with the address masked until asked for — a screenshot or a
              shared screen shouldn't expose it by default. */}
          <Panel notch="panel" className="account-section">
            <div className="section-header"><h2>Account</h2></div>
            <dl className="account-meta">
              <div><dt>Playing as</dt><dd>{session.user.name}</dd></div>
              <div>
                <dt>Email</dt>
                <dd>
                  <button type="button" className="reveal-value" onClick={() => setShowEmail(v => !v)} aria-expanded={showEmail}>
                    {showEmail ? session.user.email : maskEmail(session.user.email ?? '')}
                    <span className="reveal-hint">{showEmail ? 'Hide' : 'Show'}</span>
                  </button>
                </dd>
              </div>
            </dl>
            <div className="pt-1">
              <button type="button" className="danger-action" onClick={() => signOut({ callbackUrl: '/' })}>Sign out</button>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
