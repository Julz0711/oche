"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { tokens } from "@/lib/theme";
import { Panel } from "@/components/atoms";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (provider: string) => {
    setIsLoading(true);
    setError('');
    try {
      const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl');
      const target = callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/';
      if (provider === 'development') {
        const result = await signIn(provider, { callbackUrl: target, redirect: false });
        if (result?.error) { setError('Could not open the local demo. Check that the development server and database are running.'); return; }
        window.location.assign(target);
      } else {
        await signIn(provider, { callbackUrl: target });
      }
    } catch {
      setError('Sign-in is unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="auth-page club-auth page-gutters flex items-center justify-center min-h-screen p-3"
      style={{ backgroundColor: tokens.oche }}
    >
      <div className="club-auth-layout">
      <Panel className="p-4 md:p-8">
        {/* The mark, not a separate lockup image: one logo asset used everywhere in the app
            (see components/AppNavigation.tsx) rather than a second, independently-exported
            file that can drift out of sync with it. */}
        <div className="auth-brand">
          <Image src="/oche-mark.png" alt="" width={1024} height={1024} priority aria-hidden="true" />
          <p className="auth-brand-word">OCHE</p>
          </div>
        <div className="auth-intro"><h1>Sign in</h1><p>Save your matches and play with friends.</p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="demo-login">
            <span className="eyebrow">Local preview</span>
            <p>Explore Stats, Profile and Friends with sample match history.</p>
            <button type="button" disabled={isLoading} onClick={() => handleSignIn('development')}>
              {isLoading ? 'Signing in…' : 'Try demo account'}
            </button>
          </div>
        )}
        {error && <p role="alert" className="inline-feedback" data-tone="error">{error}</p>}

        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={() => handleSignIn("google")}
            disabled={isLoading}
            className="w-full min-h-11 px-3 py-2 rounded-none font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              backgroundColor: tokens.treble,
              color: tokens.chalk,
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
            </svg>
            {isLoading ? "Loading..." : "Sign in with Google"}
          </button>

          {/* Discord */}
          <button
            onClick={() => handleSignIn("discord")}
            disabled={isLoading}
            className="w-full min-h-11 px-3 py-2 rounded-none font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              backgroundColor: tokens.chalk,
              color: tokens.oche,
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 127.14 96.36" fill="currentColor">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A99.68,99.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0A105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a77.15,77.15,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.22,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S53.89,46,53.54,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.11,46,95.76,53,90.94,65.69,84.69,65.69Z"/>
            </svg>
            {isLoading ? "Loading..." : "Sign in with Discord"}
          </button>
        </div>

        <Link href="/" className="auth-guest">Play as a guest →</Link>
        <div
          className="text-xs text-center mt-6 space-y-1"
          style={{ color: tokens.sisal }}
        >
          <div>By signing in, you agree to our</div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/privacy" className="hover:text-chalk transition-colors underline">
              Privacy Policy
            </Link>
            <span>and</span>
            <Link href="/terms" className="hover:text-chalk transition-colors underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </Panel></div>
    </div>
  );
}
