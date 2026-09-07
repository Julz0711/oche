"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
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
            className="w-full px-4 py-2 rounded-none font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: tokens.chalk,
              color: tokens.slate,
            }}
          >
            {isLoading ? "Loading..." : "Sign in with Google"}
          </button>

          {/* Discord */}
          <button
            onClick={() => handleSignIn("discord")}
            disabled={isLoading}
            className="w-full px-4 py-2 rounded-none font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: tokens.treble,
              color: tokens.chalk,
            }}
          >
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
