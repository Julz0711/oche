"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { tokens } from "@/lib/theme";

export default function SignOutPage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      signOut({ callbackUrl: "/" });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ backgroundColor: tokens.oche }}
    >
      <div
        className="w-full max-w-md p-8 rounded-lg text-center"
        style={{ backgroundColor: tokens.slate }}
      >
        <h1
          className="text-2xl font-bold mb-4 font-display"
          style={{ color: tokens.chalk }}
        >
          Signed out
        </h1>
        <p
          className="text-sm"
          style={{ color: tokens.sisal }}
        >
          You have been signed out. Redirecting you home...
        </p>
      </div>
    </div>
  );
}
