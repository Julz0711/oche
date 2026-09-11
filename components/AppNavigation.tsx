'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Crosshair, Swords, Users, BarChart3, UserRound, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { PlayerAvatar } from '@/components/profile/PlayerAvatar';
import { useSoundPreference } from '@/hooks/useSoundPreference';

const destinations = [
  { href: '/', label: 'Play', icon: Crosshair, requiresAuth: false, desktopOnly: false },
  // House Rules works for guests too (only its friends leaderboard needs sign-in), so it isn't
  // gated like Friends/Stats. Desktop-only: the mobile bottom bar is a fixed 4-column grid
  // (Play/Friends/Stats/Account) and House Rules already has a route in from the dashboard there.
  { href: '/solo', label: 'House Rules', icon: Swords, requiresAuth: false, desktopOnly: true },
  { href: '/friends', label: 'Friends', icon: Users, requiresAuth: true, desktopOnly: false },
  { href: '/stats', label: 'Stats', icon: BarChart3, requiresAuth: true, desktopOnly: false },
];
export function AppNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundPreference();
  const hidden = pathname.startsWith('/match/') || pathname === '/signin' || pathname === '/signout';
  if (hidden) return children;
  return <div className="app-shell app-shell-pattern">
    <nav className="app-navigation" aria-label="Main navigation">
      <Link href="/" className="nav-brand" aria-label="Oche home">OCHE</Link>
      <div className="nav-destinations">
        {destinations.map(({ href, label, icon: Icon, requiresAuth, desktopOnly }) => {
          const selected = href === '/' ? pathname === '/' || pathname.startsWith('/join') : href === '/solo' ? pathname.startsWith('/solo') : pathname.startsWith(href) || (href === '/friends' && pathname.startsWith('/profile/'));
          return <Link key={href} href={!session?.user && requiresAuth ? '/signin' : href} aria-current={selected ? 'page' : undefined} className={desktopOnly ? 'nav-desktop-only' : undefined}><Icon size={18} aria-hidden="true" /><span>{label}</span></Link>;
        })}
        <button className="nav-sound" onClick={toggleSound} aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'} aria-pressed={!soundEnabled} title={soundEnabled ? 'Mute sound' : 'Unmute sound'}>{soundEnabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}<span>Sound</span></button>
        <Link className="nav-account" href={session?.user ? '/profile' : '/signin'} aria-current={pathname === '/profile' || pathname === '/settings' ? 'page' : undefined} aria-label="Account">
          {session?.user?.image
            ? <PlayerAvatar name={session.user.name || 'Player'} image={session.user.image} className="nav-account-icon" />
            : <UserRound size={18} className="nav-account-icon" aria-hidden="true" />}
          <span className="nav-account-mobile">Account</span>
          <span className="nav-account-desktop"><PlayerAvatar name={session?.user?.name || 'Guest'} image={session?.user?.image} /><span className="nav-account-name">{session?.user?.name || 'Sign in'}</span></span>
        </Link>
      </div>
    </nav>
    <div key={pathname} className="app-content page-enter">{children}</div>
  </div>;
}
