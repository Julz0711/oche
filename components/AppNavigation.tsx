'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Crosshair, Users, BarChart3, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';

const destinations = [
  { href: '/', label: 'Play', icon: Crosshair },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/stats', label: 'History', icon: BarChart3 },
  { href: '/profile', label: 'Account', icon: UserRound },
];
export function AppNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const hidden = pathname.startsWith('/match/') || pathname === '/signin' || pathname === '/signout';
  if (hidden) return children;
  return <div className="app-shell">
    <nav className="app-navigation" aria-label="Main navigation">
      <Link href="/" className="nav-brand" aria-label="Oche home">OCHE</Link>
      <div className="nav-destinations">
        {destinations.map(({ href, label, icon: Icon }) => {
          const selected = href === '/' ? pathname === '/' || pathname.startsWith('/join') : pathname.startsWith(href) || (href === '/profile' && pathname === '/settings');
          const target = !session?.user && href !== '/' ? '/signin' : href;
          return <Link key={href} href={target} aria-current={selected ? 'page' : undefined}>
            <Icon className="w-[18px] h-[18px]" aria-hidden="true" /><span>{label}</span>
          </Link>;
        })}
      </div>
    </nav>
    <div className="app-content">{children}</div>
  </div>;
}
