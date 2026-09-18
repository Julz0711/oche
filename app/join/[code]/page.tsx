// app/join/[code]/page.tsx
'use client';
import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { TextLink } from '@/components/molecules';
import { PageMessage } from '@/components/molecules/PageMessage';
import { LoadingIndicator } from '@/components/atoms/LoadingIndicator';

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
      try {
      const res = await fetch(`/api/matches/join/${encodeURIComponent(code)}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not join this match');
        return;
      }
      const { id } = await res.json();
      router.push(`/match/${id}`);
      } catch { setError('Could not connect. Please try joining again.'); }
    };
    join();
  }, [code, router]);

  if (error) {
    return (
      <PageMessage eyebrow="Online match" title="Couldn’t join the room" actions={<TextLink href="/join">Try another room code</TextLink>}>
        <p role="alert">{error}</p>
      </PageMessage>
    );
  }
  return <LoadingIndicator fullPage label="Joining the room…" />;
}
