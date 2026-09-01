// app/(dashboard)/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { useState } from 'react';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateMatch = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: 'x01' }),
      });
      const { id } = await res.json();
      router.push(`/match/${id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-oche text-chalk p-4">
      <h1 className="text-3xl font-display font-bold mb-6">Oche</h1>
      <Button onClick={handleCreateMatch} disabled={loading}>
        {loading ? 'Creating...' : 'New Match'}
      </Button>
    </div>
  );
}
