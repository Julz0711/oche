// app/(dashboard)/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { useState } from 'react';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState<'local' | 'remote' | null>(null);

  const handleCreateMatch = async (mode: 'local' | 'remote') => {
    setLoading(mode);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: 'x01', mode }),
      });
      const { id } = await res.json();
      router.push(`/match/${id}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-oche text-chalk p-4">
      <h1 className="text-3xl font-display font-bold mb-6">Oche</h1>
      <div className="flex gap-3">
        <Button onClick={() => handleCreateMatch('local')} disabled={loading !== null}>
          {loading === 'local' ? 'Creating...' : 'New Match'}
        </Button>
        <Button onClick={() => handleCreateMatch('remote')} disabled={loading !== null} variant="ghost">
          {loading === 'remote' ? 'Creating...' : 'Play Remote'}
        </Button>
      </div>
    </div>
  );
}
