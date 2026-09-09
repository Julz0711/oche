'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Crosshair, Users, BarChart3, UserRound, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { PlayerAvatar } from '@/components/profile/PlayerAvatar';
import { useSoundPreference } from '@/hooks/useSoundPreference';

const destinations = [
  { href: '/', label: 'Play', icon: Crosshair },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
];
export function AppNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundPreference();
  const hidden = pathname.startsWith('/match/') || pathname === '/signin' || pathname === '/signout';
  if (hidden) return children;
  return <div className="app-shell">
    <nav className="app-navigation" aria-label="Main navigation">
      <Link href="/" className="nav-brand" aria-label="Oche home">OCHE</Link>
      <div className="nav-destinations">
        {destinations.map(({ href, label, icon: Icon }) => {
          const selected = href === '/' ? pathname === '/' || pathname.startsWith('/join') : pathname.startsWith(href) || (href === '/friends' && pathname.startsWith('/profile/'));
          return <Link key={href} href={!session?.user && href !== '/' ? '/signin' : href} aria-current={selected ? 'page' : undefined}><Icon size={18} aria-hidden="true" /><span>{label}</span></Link>;
        })}
        <button className="nav-sound" onClick={toggleSound} aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'} aria-pressed={!soundEnabled} title={soundEnabled ? 'Mute sound' : 'Unmute sound'}>{soundEnabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}<span>Sound</span></button>
        <Link className="nav-account" href={session?.user ? '/profile' : '/signin'} aria-current={pathname === '/profile' || pathname === '/settings' ? 'page' : undefined} aria-label="Account">
          <UserRound size={18} className="nav-account-icon" aria-hidden="true" />
          <span className="nav-account-mobile">Account</span>
          <span className="nav-account-desktop"><PlayerAvatar name={session?.user?.name || 'Guest'} image={session?.user?.image} /><span className="min-w-0"><small>{session?.user ? 'Currently logged in as' : 'Welcome to Oche'}</small><strong>{session?.user?.name || 'Sign in'}</strong></span></span>
        </Link>
      </div>
    </nav>
    <div className="app-content">{children}</div>
  </div>;
}
