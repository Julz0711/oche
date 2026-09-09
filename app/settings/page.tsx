'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { tokens } from '@/lib/theme';
import { Panel } from '@/components/atoms';

export default function SettingsPage() {
  const router = useRouter();
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
    <div className="auth-page page-gutters flex items-center justify-center min-h-screen p-3" style={{ backgroundColor: tokens.oche }}>
      <div className="w-full max-w-md"><Panel notch="card" className="p-4 md:p-8 flex flex-col gap-4 md:gap-6">
        <h1 className="text-2xl font-bold text-center font-display" style={{ color: tokens.wire }}>
          Settings
        </h1>

        <div className="flex flex-col gap-2">
          <label htmlFor="display-name" className="text-[11px] font-bold uppercase tracking-widest" style={{ color: tokens.sisal }}>
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            autoComplete="nickname"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            maxLength={60}
            className="w-full min-h-11 px-3 py-2 rounded-none border-2 focus:outline-none focus:border-current"
            style={{
              borderColor: tokens.wire,
              color: tokens.chalk,
              backgroundColor: `${tokens.slate}dd`,
            }}
          />
          {error && <span className="text-xs" style={{ color: tokens.treble }}>{error}</span>}
          {saved && !error && (
            <span className="text-xs" style={{ color: tokens.double }}>
              Saved
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || name.trim() === (session.user.name ?? '')}
          className="w-full min-h-11 px-3 py-2 rounded-none font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: tokens.wire, color: tokens.slate }}
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>

        <div className="border-t border-sisal/20 pt-3 flex flex-col gap-2">
          <Link href="/profile" className="social-link">Back to account</Link>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="min-h-11 text-sm text-sisal text-left">Sign out</button>
        </div>
      </Panel></div>
    </div>
  );
}
