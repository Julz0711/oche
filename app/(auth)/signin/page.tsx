"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { tokens } from "@/lib/theme";
import { Panel } from "@/components/atoms";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (provider: string) => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: "/" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen p-4"
      style={{ backgroundColor: tokens.oche }}
    >
      <Panel notch="card" className="w-full max-w-md p-8">
        <h1
          className="text-2xl font-bold text-center mb-8 font-display"
          style={{ color: tokens.wire }}
        >
          Sign in to Oche
        </h1>

        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={() => handleSignIn("google")}
            disabled={isLoading}
            className="w-full px-4 py-2 rounded-none font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
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
            className="w-full px-4 py-2 rounded-none font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              backgroundColor: tokens.chalk,
              color: tokens.oche,
            }}
          >
            <MessageCircle className="w-5 h-5" />
            {isLoading ? "Loading..." : "Sign in with Discord"}
          </button>
        </div>

        <div
          className="text-xs text-center mt-6 space-y-1"
          style={{ color: tokens.sisal }}
        >
          <div>By signing in, you agree to our</div>
          <div className="flex gap-2 justify-center">
            <Link href="/privacy" className="hover:text-chalk transition-colors underline">
              Privacy Policy
            </Link>
            <span>and</span>
            <Link href="/terms" className="hover:text-chalk transition-colors underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
