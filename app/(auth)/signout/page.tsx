'use client';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { PageMessage } from '@/components/molecules/PageMessage';

export default function SignOutPage() {
  return <PageMessage eyebrow="Your account" title="Sign out?" actions={<>
      <Button onClick={() => signOut({ callbackUrl: '/' })}>Sign out</Button>
      <Link href="/profile" className="text-link">Stay signed in</Link>
    </>}>
    <p>You can sign back in to see your friends and match history.</p>
  </PageMessage>;
}
