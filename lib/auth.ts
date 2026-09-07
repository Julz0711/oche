import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./mongodb-client";
import { jwtDecrypt, jwtVerify } from "jose";

const authSecret = process.env.NEXTAUTH_SECRET;
console.log('[NextAuth init] Using secret:', authSecret?.substring(0, 20) + '...');

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  debug: process.env.NODE_ENV === 'development',
  jwt: {
    async encode({ token, secret }) {
      console.log('[jwt.encode] Encoding token:', token);
      const secretStr = (Array.isArray(secret) ? secret[0] : secret) || authSecret || 'dev-secret';
      const secretBytes = new TextEncoder().encode(secretStr);
      const { SignJWT } = await import('jose');
      const now = Math.floor(Date.now() / 1000);
      const encoded = await new SignJWT(token)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt(now)
        .setExpirationTime(now + 30 * 24 * 60 * 60)
        .sign(secretBytes);
      console.log('[jwt.encode] Encoded length:', encoded.length);
      return encoded;
    },
    async decode({ token, secret }) {
      console.log('[jwt.decode] Decoding token length:', token?.length);
      if (!token) return null;
      try {
        const secretStr = (Array.isArray(secret) ? secret[0] : secret) || authSecret || 'dev-secret';
        const secretBytes = new TextEncoder().encode(secretStr);
        const { jwtVerify } = await import('jose');
        const verified = await jwtVerify(token, secretBytes);
        console.log('[jwt.decode] Verified payload:', verified.payload);
        return verified.payload as any;
      } catch (error) {
        console.error('[jwt.decode] Error:', error);
        return null;
      }
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    Discord({
      clientId: process.env.DISCORD_ID,
      clientSecret: process.env.DISCORD_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      console.log('[jwt callback] user:', user, 'token before:', token);
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      // Lets the client push a name change into the JWT immediately (via useSession().update())
      // instead of only picking it up on the next full sign-in — the settings page relies on this.
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      console.log('[jwt callback] token after:', token);
      return token;
    },
    async session({ session, token, newSession, trigger }) {
      console.log('[session callback] token:', token, 'newSession:', newSession);

      // Dev-only: handle dev login
      if (process.env.NODE_ENV === 'development' && token?.__devLogin) {
        console.log('[session callback] Dev login detected, creating test session');
        session.user = {
          id: token.__devLogin as string,
          name: 'Test User',
          email: 'test@oche.local',
          image: null,
          emailVerified: null,
        };
        return session;
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string | null;
        session.user.email = token.email as string;
        session.user.image = token.picture as string | null;
        session.user.emailVerified = (token.emailVerified as any) || null;
      }
      console.log('[session callback] session after:', session);
      return session;
    },
  },
  pages: {
    signIn: "/signin",
    signOut: "/signout",
  },
});
