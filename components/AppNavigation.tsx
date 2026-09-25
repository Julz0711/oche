'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Crosshair, Swords, Users, BarChart3, UserRound, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { PlayerAvatar } from '@/components/profile/PlayerAvatar';
import { useSoundPreference } from '@/hooks/useSoundPreference';

const destinations = [
  { href: '/', label: 'Play', icon: Crosshair, requiresAuth: false },
  { href: '/solo', label: 'House Rules', icon: Swords, requiresAuth: false },
  { href: '/friends', label: 'Friends', icon: Users, requiresAuth: true },
  { href: '/stats', label: 'Stats', icon: BarChart3, requiresAuth: true },
];
export function AppNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundPreference();
  const hidden = pathname.startsWith('/match/') || pathname === '/signin' || pathname === '/signout';
  if (hidden) return children;
  return <div className="app-shell app-shell-pattern">
    <a href="#page-content" className="skip-link">Skip to content</a>
    <nav className="app-navigation" aria-label="Main navigation">
      {/* The mark, not the lockup: at the ~30px a navigation bar allows, a subline under the
          wordmark is about three pixels tall and renders as a smudge. The mark stays crisp at
          any size, and the wordmark beside it is set in the display face the rest of the app
          uses. The full lockup gets the sign-in screen, where it has room to be read.
          This is why there is no <small> here — it was tried, and it smudged. */}
      <Link href="/" className="nav-brand" aria-label="Oche home">
        <Image src="/oche-mark.png" alt="" width={1024} height={1024} priority aria-hidden="true" />
        <span>OCHE</span>
      </Link>
      <div className="nav-destinations">
        {destinations.map(({ href, label, icon: Icon, requiresAuth }) => {
          const selected = href === '/' ? pathname === '/' || pathname.startsWith('/join') || pathname.startsWith('/play') : href === '/solo' ? pathname.startsWith('/solo') : pathname.startsWith(href) || (href === '/friends' && pathname.startsWith('/profile/'));
          return <Link key={href} href={!session?.user && requiresAuth ? `/signin?callbackUrl=${href}` : href} aria-current={selected ? 'page' : undefined}><Icon size={18} aria-hidden="true" /><span>{label}</span></Link>;
        })}
        {/* Desktop shows who you are signed in as; the phone bar has room for an icon and a
            label only, so it falls back to those. */}
        <Link className="nav-account" href={session?.user ? '/profile' : '/signin'} aria-current={pathname === '/profile' || pathname === '/settings' ? 'page' : undefined} aria-label="Account">
          <UserRound size={18} className="nav-account-icon" aria-hidden="true" />
          <span className="nav-account-mobile">Account</span>
          <span className="nav-account-desktop"><PlayerAvatar name={session?.user?.name || 'Guest'} image={session?.user?.image} /><span className="nav-account-name">{session?.user?.name || 'Sign in'}</span></span>
        </Link>
        <button className="nav-sound" onClick={toggleSound} aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'} aria-pressed={!soundEnabled} title={soundEnabled ? 'Mute sound' : 'Unmute sound'}>{soundEnabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}<span>Sound</span></button>
      </div>
    </nav>
    {process.env.NODE_ENV === 'development' && session?.user?.email === 'demo@oche.test' && <div className="demo-session"><span>Demo account · sample match history</span><Link href="/signout">Sign out</Link></div>}
    <div key={pathname} id="page-content" className="app-content page-enter">{children}</div>
  </div>;
}
