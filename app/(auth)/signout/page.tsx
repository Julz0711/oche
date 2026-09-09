'use client';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Panel } from '@/components/atoms/Panel';
import { Button } from '@/components/atoms/Button';

export default function SignOutPage() {
  return <main className="auth-page page-gutters flex items-center justify-center min-h-screen p-3">
    <div className="w-full max-w-md"><Panel notch="card" className="p-4 flex flex-col gap-3">
      <h1 className="text-2xl font-display font-bold">Sign out?</h1>
      <p className="text-sm text-sisal">You can sign back in to see your friends and match history.</p>
      <Button onClick={() => signOut({ callbackUrl: '/' })}>Sign out</Button>
      <Link href="/profile" className="social-link">Stay signed in</Link>
    </Panel></div>
  </main>;
}
