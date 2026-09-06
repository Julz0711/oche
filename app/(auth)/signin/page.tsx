"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { tokens } from "@/lib/theme";
import { Panel } from "@/components/atoms";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (provider: string) => {
    setIsLoading(true);
    try {
      if (provider === "email") {
        await signIn(provider, { email, redirect: false });
      } else {
        await signIn(provider, { callbackUrl: "/" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ backgroundColor: tokens.oche }}
    >
      <Panel notch="card" className="w-full max-w-md p-8">
        <h1
          className="text-2xl font-bold text-center mb-8 font-display"
          style={{ color: tokens.wire }}
        >
          Sign in to Oche
        </h1>

        <div className="space-y-4">
          {/* Email Magic Link */}
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-none border-2 focus:outline-none focus:border-current"
              style={{
                borderColor: tokens.wire,
                color: tokens.chalk,
                backgroundColor: `${tokens.slate}dd`,
              }}
            />
            <button
              onClick={() => handleSignIn("email")}
              disabled={isLoading || !email}
              className="w-full px-4 py-2 rounded-none font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: tokens.wire,
                color: tokens.slate,
              }}
            >
              {isLoading ? "Sending..." : "Sign in with Email"}
            </button>
          </div>

          <div
            className="text-center text-sm"
            style={{ color: tokens.sisal }}
          >
            or
          </div>

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

        <p
          className="text-xs text-center mt-6"
          style={{ color: tokens.sisal }}
        >
          We'll never share your information. Read our privacy policy.
        </p>
      </Panel>
    </div>
  );
}
