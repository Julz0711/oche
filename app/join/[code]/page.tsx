// app/join/[code]/page.tsx
'use client';
import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export default function JoinPage({ params }: JoinPageProps) {
  const router = useRouter();
  const { code } = use(params);
  const [error, setError] = useState<string | null>(null);
  // Defense in depth against React Strict Mode's double-invoked effect (and any future
  // re-render): ensures the join POST fires at most once per mount, regardless of the
  // server-side atomic-write fix in the join route.
  const hasJoined = useRef(false);

  useEffect(() => {
    if (hasJoined.current) return;
    hasJoined.current = true;
    const join = async () => {
      const res = await fetch(`/api/matches/join/${code}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not join this match');
        return;
      }
      const { id } = await res.json();
      router.push(`/match/${id}`);
    };
    join();
  }, [code, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-oche text-chalk flex flex-col items-center justify-center gap-4">
        <span>{error}</span>
        <Link href="/" className="text-xs font-bold uppercase tracking-widest text-wire hover:text-chalk transition-colors">
          Back to dashboard
        </Link>
      </div>
    );
  }
  return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">Joining…</div>;
}
