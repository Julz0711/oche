'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { User, Trophy, Zap } from 'lucide-react';
import { tokens } from '@/lib/theme';
import { Panel, BackLink } from '@/components/atoms';

interface UserStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/signin');
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    if (session?.user) {
      (async () => {
        const res = await fetch('/api/user/stats');
        if (res.ok) {
          setStats(await res.json());
        }
        setLoading(false);
      })();
    }
  }, [session?.user]);

  if (sessionStatus !== 'authenticated' || !session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: tokens.oche }}>
        <span style={{ color: tokens.sisal }}>Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: tokens.oche }}>
      <div className="max-w-2xl mx-auto px-4 py-8" style={{ color: tokens.chalk }}>
        <div className="mb-8">
          <BackLink href="/" />
        </div>

        {/* Profile Header */}
        <Panel notch="card" className="p-8 flex flex-col gap-6 mb-8">
          <div className="flex items-start gap-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div
                className="w-24 h-24 rounded-none border-2 flex items-center justify-center"
                style={{
                  borderColor: tokens.wire,
                  backgroundColor: tokens.slate,
                }}
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12" style={{ color: tokens.wire }} />
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 flex flex-col gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.sisal }}>
                  Display Name
                </div>
                <h1 className="text-3xl font-display font-bold mt-1">{session.user.name || 'Guest'}</h1>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.sisal }}>
                  Email
                </div>
                <p className="text-sm mt-1">{session.user.email}</p>
              </div>
              <Link
                href="/settings"
                className="text-xs font-bold uppercase tracking-widest transition-colors w-fit"
                style={{ color: tokens.wire }}
              >
                Edit Profile →
              </Link>
            </div>
          </div>
        </Panel>

        {/* Stats Grid */}
        {loading ? (
          <div style={{ color: tokens.sisal }}>Loading stats...</div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Panel notch="panel" className="p-4 flex flex-col items-center gap-2">
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.sisal }}>
                Games Played
              </div>
              <div className="text-3xl font-display font-bold" style={{ color: tokens.wire }}>
                {stats.totalMatches}
              </div>
            </Panel>

            <Panel notch="panel" className="p-4 flex flex-col items-center gap-2">
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.sisal }}>
                Win Rate
              </div>
              <div className="text-3xl font-display font-bold" style={{ color: tokens.double }}>
                {stats.winRate}%
              </div>
            </Panel>

            <Panel notch="panel" className="p-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4" style={{ color: tokens.double }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.sisal }}>
                  Wins
                </span>
              </div>
              <div className="text-3xl font-display font-bold" style={{ color: tokens.double }}>
                {stats.wins}
              </div>
            </Panel>

            <Panel notch="panel" className="p-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4" style={{ color: tokens.treble }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.sisal }}>
                  Losses
                </span>
              </div>
              <div className="text-3xl font-display font-bold" style={{ color: tokens.treble }}>
                {stats.losses}
              </div>
            </Panel>
          </div>
        ) : null}

        {/* Achievements Placeholder */}
        <Panel notch="panel" className="p-6 mb-8">
          <h2 className="text-xl font-display font-bold mb-4" style={{ color: tokens.wire }}>
            Achievements
          </h2>
          <div
            className="p-8 text-center rounded-none border-2 border-dashed"
            style={{
              borderColor: tokens.sisal + '33',
            }}
          >
            <div style={{ color: tokens.sisal }}>
              <p className="text-sm">Achievements coming soon</p>
              <p className="text-xs mt-2">Unlock badges like "Perfect 180", "9-Dart Finish", and more!</p>
            </div>
          </div>
        </Panel>

        {/* Friends Placeholder */}
        <Panel notch="panel" className="p-6">
          <h2 className="text-xl font-display font-bold mb-4" style={{ color: tokens.wire }}>
            Friends
          </h2>
          <div
            className="p-8 text-center rounded-none border-2 border-dashed"
            style={{
              borderColor: tokens.sisal + '33',
            }}
          >
            <div style={{ color: tokens.sisal }}>
              <p className="text-sm">Friend list coming soon</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
