// app/join/[code]/page.tsx
'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export default function JoinPage({ params }: JoinPageProps) {
  const router = useRouter();
  const { code } = use(params);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">{error}</div>;
  }
  return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">Joining…</div>;
}
