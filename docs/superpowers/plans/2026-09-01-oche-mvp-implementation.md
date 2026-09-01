# Oche MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time web app for remote darts scoring with per-dart capture, live stats, and a modular game system.

**Architecture:** Game modules (X01, Cricket) are independent units that export a `GameModule<TState, TSettings>` contract. Views (dashboard, scoreboard, stats screens) are generic and compose from the module system. The scoring engine and stats engine are pure TypeScript with no dependencies, enabling client and server to use the same code.

**Tech Stack:** Next.js 16.2 (App Router), React 19, Tailwind v4, shadcn/ui, MongoDB + Mongoose, Auth.js v5, Ably, Zustand, TanStack Query, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-01-oche-mvp-architecture.md`

## Global Constraints

- No game-specific branches in views (organisms, pages). Use game module contract for all polymorphism.
- Scoring engine and stats engine are pure, dependency-free TypeScript. No React, no DB, no network.
- All touch targets ≥ 44 px; dartboard segments are documented exception with keypad fallback.
- Live numbers use `font-variant-numeric: tabular-nums` to prevent jitter.
- Every atom is driven by design tokens only (no hex values in components).
- Three auth providers: Google, Discord, email magic link.

---

## M0: Scaffolding, Tokens, Auth, Atoms (1 weekend)

### File Structure for M0

```
src/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── not-found.tsx
│   ├── (auth)/
│   │   ├── signin/page.tsx
│   │   └── signout/page.tsx
│   ├── (dashboard)/
│   │   └── page.tsx            # Placeholder: game grid
│   └── api/
│       └── auth/
│           ├── [...nextauth]/route.ts
│           └── claim-guest/route.ts
├── components/
│   ├── atoms/
│   │   ├── Button.tsx
│   │   ├── Numeral.tsx
│   │   ├── Chip.tsx
│   │   ├── Avatar.tsx
│   │   ├── Icon.tsx
│   │   ├── Divider.tsx
│   │   ├── Input.tsx
│   │   └── Button.stories.tsx  # And .stories for each atom
│   ├── molecules/
│   │   └── (empty for now)
│   └── ui/
│       ├── button.tsx          # shadcn/ui primitives
│       ├── sheet.tsx
│       ├── drawer.tsx
│       └── ...
├── lib/
│   ├── auth.ts                 # Auth.js config
│   ├── db.ts                   # Mongoose connection
│   ├── theme.ts                # Design tokens
│   ├── types.ts                # Global types
│   ├── games/
│   │   └── registry.ts         # Game registry (empty for now)
│   └── stats/
│       └── types.ts            # Stats types (empty engine for now)
├── store/
│   └── (empty for now)
└── styles/
    └── globals.css             # Tailwind + token variables
```

### Task M0-1: Next.js Project Setup + Tailwind

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`
- Create: `.env.local` (template)
- Create: `src/app/layout.tsx`

**Interfaces:**
- Produces: A working Next.js app that starts with `npm run dev`

- [ ] **Step 1: Initialize Next.js with create-next-app**

```bash
npx create-next-app@latest oche --typescript --tailwind --app --no-eslint --no-src-dir
cd oche
```

(Choose: TypeScript, Tailwind, App Router, no ESLint initially)

- [ ] **Step 2: Install additional dependencies**

```bash
npm install next-auth@beta mongoose zod zustand ably @tanstack/react-query framer-motion lucide-react
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom storybook @storybook/nextjs playwright
```

- [ ] **Step 3: Create `.env.local` template**

```bash
cat > .env.local << 'EOF'
# Auth
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_ID=
GOOGLE_SECRET=
DISCORD_ID=
DISCORD_SECRET=
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=

# MongoDB
MONGODB_URI=mongodb+srv://...

# Ably
NEXT_PUBLIC_ABLY_KEY=

# Vercel
NEXT_PUBLIC_VERCEL_URL=
EOF
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.js .env.local src/app/layout.tsx
git commit -m "chore: scaffold next.js project with tailwind"
```

---

### Task M0-2: Design Tokens + Tailwind Config

**Files:**
- Create: `lib/theme.ts`
- Modify: `tailwind.config.ts`
- Modify: `styles/globals.css`

**Interfaces:**
- Produces: `export const tokens = { oche, slate, chalk, sisal, wire, treble, double }`

- [ ] **Step 1: Create theme.ts with token definitions**

```typescript
// src/lib/theme.ts
export const tokens = {
  oche: '#141A18',      // Page background
  slate: '#1E2724',     // Surfaces, cards
  chalk: '#F2F4F3',     // Primary text
  sisal: '#E4D8BC',     // Secondary text
  wire: '#C0A15C',      // Accent, focus
  treble: '#C8102E',    // Red (treble hits, danger)
  double: '#1B7F5A',    // Green (double hits, success)
} as const;

export type Token = keyof typeof tokens;

// Type scale: 12 / 14 / 16 / 20 / 28 / 40 / 72 / 128
export const typeScale = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '20px',
  xl: '28px',
  '2xl': '40px',
  '3xl': '72px',
  '4xl': '128px',  // ← Remaining score numeral
} as const;
```

- [ ] **Step 2: Update tailwind.config.ts to use tokens**

```typescript
// tailwind.config.ts
import { tokens } from './src/lib/theme';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        oche: tokens.oche,
        slate: tokens.slate,
        chalk: tokens.chalk,
        sisal: tokens.sisal,
        wire: tokens.wire,
        treble: tokens.treble,
        double: tokens.double,
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '20px',
        xl: '28px',
        '2xl': '40px',
        '3xl': '72px',
        '4xl': '128px',
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        sans: ['Inter Tight', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Update globals.css with token variables**

```css
/* src/styles/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700&family=Inter+Tight:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --oche: #141A18;
  --slate: #1E2724;
  --chalk: #F2F4F3;
  --sisal: #E4D8BC;
  --wire: #C0A15C;
  --treble: #C8102E;
  --double: #1B7F5A;

  --font-display: 'Bricolage Grotesque', sans-serif;
  --font-sans: 'Inter Tight', sans-serif;
}

html {
  background-color: var(--oche);
  color: var(--chalk);
  font-family: var(--font-sans);
}

body {
  margin: 0;
  background-color: var(--oche);
  color: var(--chalk);
}

/* Tabular numerals for live scores (no jitter) */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* Touch target minimum: 44px */
@layer components {
  .touch-target {
    @apply min-w-[44px] min-h-[44px];
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/theme.ts tailwind.config.ts src/styles/globals.css
git commit -m "feat: design tokens and tailwind configuration"
```

---

### Task M0-3: Auth.js Setup (Google, Discord, Magic Link)

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/(auth)/signin/page.tsx`
- Create: `app/(auth)/signout/page.tsx`
- Modify: `app/layout.tsx` (add SessionProvider)

**Interfaces:**
- Produces: A working signin/signout flow. `getServerSession()` works in API routes and server components.

- [ ] **Step 1: Create auth.ts configuration**

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import DiscordProvider from 'next-auth/providers/discord';
import EmailProvider from 'next-auth/providers/email';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_ID!,
      clientSecret: process.env.DISCORD_SECRET!,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/signin',
    signOut: '/signout',
  },
};
```

- [ ] **Step 2: Create [...nextauth]/route.ts**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 3: Create signin page**

```typescript
// src/app/(auth)/signin/page.tsx
'use client';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-oche">
      <div className="bg-slate p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-chalk mb-6">Sign in to Oche</h1>
        
        <button
          onClick={() => signIn('google')}
          className="w-full touch-target bg-wire text-oche font-semibold py-2 px-4 rounded mb-3 hover:opacity-90"
        >
          Sign in with Google
        </button>

        <button
          onClick={() => signIn('discord')}
          className="w-full touch-target bg-wire text-oche font-semibold py-2 px-4 rounded mb-3 hover:opacity-90"
        >
          Sign in with Discord
        </button>

        <button
          onClick={() => signIn('email')}
          className="w-full touch-target bg-wire text-oche font-semibold py-2 px-4 rounded hover:opacity-90"
        >
          Sign in with Email
        </button>

        <p className="text-sisal text-sm text-center mt-6">
          No account? Create one by signing in above.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create signout page**

```typescript
// src/app/(auth)/signout/page.tsx
'use client';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignOut() {
  const router = useRouter();

  useEffect(() => {
    // Auto-signout after 2 seconds
    const timeout = setTimeout(() => {
      signOut({ callbackUrl: '/' });
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-oche">
      <div className="bg-slate p-8 rounded-lg text-center">
        <h1 className="text-2xl font-bold text-chalk mb-4">Signed out</h1>
        <p className="text-sisal mb-4">Redirecting...</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update layout.tsx with SessionProvider**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Oche',
  description: 'Real-time darts scoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/[...nextauth]/route.ts src/app/\(auth\) src/app/layout.tsx
git commit -m "feat: auth.js setup with google, discord, email magic link"
```

---

### Task M0-4: Global Types

**Files:**
- Create: `lib/types.ts`

**Interfaces:**
- Produces: Types used throughout the app: `PlayerId`, `Throw`, `GameStats`, etc.

- [ ] **Step 1: Define global types**

```typescript
// src/lib/types.ts
import { LucideIcon } from 'lucide-react';
import { z } from 'zod';

export type PlayerId = string & { readonly __brand: 'PlayerId' };

export function createPlayerId(id: string): PlayerId {
  return id as PlayerId;
}

export interface Throw {
  sector: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 25; // 1-20 or 25 (bull)
  ring: 'S' | 'D' | 'T' | 'OB' | 'IB' | 'M'; // Single, Double, Treble, Outer Bull, Inner Bull, Miss
  points: number;
  order: 0 | 1 | 2; // Dart 1, 2, or 3
}

export interface Visit {
  _id?: string;
  matchId: string;
  legId?: string;
  playerId: PlayerId;
  index?: number;
  seq?: number;
  throws: Throw[];
  scoreBefore?: number;
  scoreAfter?: number;
  busted?: boolean;
  isCheckout?: boolean;
  enteredBy: PlayerId;
  createdAt?: Date;
}

export interface Player {
  id: PlayerId;
  name: string;
  isGuest: boolean;
}

export interface GameStats {
  [key: string]: string | number | boolean;
}

export interface StatTileDef<TStats = any> {
  label: string;
  key: string;
  value: (stats: TStats) => string | number;
  format?: (value: string | number) => string;
}

export interface GameModule<TState, TSettings> {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  playerRange: [min: number, max: number];
  status?: 'stable' | 'beta' | 'comingSoon';

  settingsSchema: z.ZodSchema<TSettings>;
  defaultSettings: TSettings;

  init(players: PlayerId[], settings: TSettings): TState;
  applyThrow(state: TState, throw: Throw): TState;
  undo(state: TState): TState;
  isComplete(state: TState): boolean;
  winner(state: TState): PlayerId | null;

  ScoreboardSlot: React.FC<{ state: TState; playerId: PlayerId }>;
  primaryMetric(state: TState, playerId: PlayerId): { label: string; value: string };

  computeStats(visits: Visit[], settings: TSettings): GameStats;
  statTiles: StatTileDef[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: define global types and interfaces"
```

---

### Task M0-5: Atomic Components (Button, Numeral, Chip, Avatar, Icon)

**Files:**
- Create: `components/atoms/Button.tsx` + `.stories.tsx`
- Create: `components/atoms/Numeral.tsx` + `.stories.tsx`
- Create: `components/atoms/Chip.tsx` + `.stories.tsx`
- Create: `components/atoms/Avatar.tsx` + `.stories.tsx`
- Create: `components/atoms/Icon.tsx` + `.stories.tsx`
- Create: `components/atoms/Divider.tsx` + `.stories.tsx`
- Create: `components/atoms/Input.tsx` + `.stories.tsx`

**Interfaces:**
- Produces: Components used by molecules and organisms. Each component is driven by design tokens only.

- [ ] **Step 1: Create Button atom**

```typescript
// src/components/atoms/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'touch-target font-semibold rounded transition-opacity hover:opacity-90 active:opacity-75';
  
  const variantStyles = {
    primary: 'bg-wire text-oche',
    secondary: 'bg-slate text-chalk border border-wire',
    ghost: 'text-chalk hover:bg-slate',
  };

  const sizeStyles = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Create Numeral atom (for scores)**

```typescript
// src/components/atoms/Numeral.tsx
interface NumeralProps {
  value: number | string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'; // 4xl is 128px for remaining score
  variant?: 'default' | 'accent' | 'danger' | 'success';
  tabular?: boolean;
}

export function Numeral({
  value,
  size = 'lg',
  variant = 'default',
  tabular = true,
}: NumeralProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
  };

  const variantClasses = {
    default: 'text-chalk',
    accent: 'text-wire',
    danger: 'text-treble',
    success: 'text-double',
  };

  return (
    <span
      className={`font-display font-bold ${sizeClasses[size]} ${variantClasses[variant]} ${
        tabular ? 'tabular-nums' : ''
      }`}
    >
      {value}
    </span>
  );
}
```

- [ ] **Step 3: Create Chip atom**

```typescript
// src/components/atoms/Chip.tsx
interface ChipProps {
  label: string;
  value?: string | number;
  variant?: 'default' | 'success' | 'danger' | 'accent';
  onClose?: () => void;
}

export function Chip({ label, value, variant = 'default', onClose }: ChipProps) {
  const variantClasses = {
    default: 'bg-slate text-chalk',
    success: 'bg-double text-oche',
    danger: 'bg-treble text-chalk',
    accent: 'bg-wire text-oche',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${variantClasses[variant]}`}>
      <span>{label}</span>
      {value !== undefined && <span className="font-semibold">{value}</span>}
      {onClose && (
        <button onClick={onClose} className="ml-1 hover:opacity-70">
          ×
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create Avatar atom**

```typescript
// src/components/atoms/Avatar.tsx
interface AvatarProps {
  name: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
}

export function Avatar({ name, image, size = 'md', isActive = false }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold ${
        isActive ? 'bg-wire text-oche border-2 border-chalk' : 'bg-slate text-chalk'
      } ${image ? '' : 'bg-slate text-chalk'}`}
    >
      {image ? (
        <img src={image} alt={name} className="w-full h-full rounded-full" />
      ) : (
        initials
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create Icon atom (wrapper for lucide)**

```typescript
// src/components/atoms/Icon.tsx
import { LucideIcon } from 'lucide-react';

interface IconProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
}

export function Icon({ icon: IconComponent, size = 24, color = 'currentColor' }: IconProps) {
  return <IconComponent size={size} color={color} />;
}
```

- [ ] **Step 6: Create Divider atom**

```typescript
// src/components/atoms/Divider.tsx
interface DividerProps {
  direction?: 'horizontal' | 'vertical';
  color?: 'default' | 'muted';
}

export function Divider({ direction = 'horizontal', color = 'default' }: DividerProps) {
  const colorClass = color === 'muted' ? 'border-slate' : 'border-wire';

  if (direction === 'vertical') {
    return <div className={`h-full w-px border-l ${colorClass}`} />;
  }

  return <div className={`w-full h-px border-t ${colorClass}`} />;
}
```

- [ ] **Step 7: Create Input atom**

```typescript
// src/components/atoms/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-semibold text-chalk">{label}</label>}
      <input
        className={`px-3 py-2 rounded bg-slate text-chalk border border-wire placeholder-sisal focus:outline-none focus:ring-2 focus:ring-wire ${className}`}
        {...props}
      />
      {error && <span className="text-sm text-treble">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 8: Create Storybook stories for atoms**

```typescript
// src/components/atoms/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: 'Primary Button', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Secondary Button', variant: 'secondary' },
};

export const Ghost: Story = {
  args: { children: 'Ghost Button', variant: 'ghost' },
};

export const Small: Story = {
  args: { children: 'Small', size: 'sm', variant: 'primary' },
};

export const Large: Story = {
  args: { children: 'Large', size: 'lg', variant: 'primary' },
};
```

(Similar for other atoms: Numeral, Chip, Avatar, Icon, Divider, Input)

- [ ] **Step 9: Configure Storybook**

```bash
npx storybook@latest init --type next
```

Update `.storybook/main.ts`:

```typescript
const config = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-essentials'],
  framework: '@storybook/nextjs',
};
export default config;
```

- [ ] **Step 10: Commit**

```bash
git add src/components/atoms src/.storybook
git commit -m "feat: atomic components (button, numeral, chip, avatar, icon, divider, input)"
```

---

### Task M0-6: Game Registry Skeleton

**Files:**
- Create: `lib/games/types.ts`
- Create: `lib/games/registry.ts`
- Create: `lib/stats/types.ts`
- Create: `lib/stats/engine.ts` (stub)

**Interfaces:**
- Produces: Type-safe game registry and stats engine scaffolding

- [ ] **Step 1: Create games/types.ts**

```typescript
// src/lib/games/types.ts
export type { GameModule } from '@/lib/types';
```

- [ ] **Step 2: Create games/registry.ts**

```typescript
// src/lib/games/registry.ts
import { GameModule } from '@/lib/types';

export const gameRegistry = {
  x01: async () => {
    // TODO: will be filled in M1
    return null as any;
  },
  cricket: async () => {
    // TODO: will be filled in M4
    return null as any;
  },
} as const;

export type GameId = keyof typeof gameRegistry;

export async function getGameModule(gameId: GameId): Promise<GameModule<any, any>> {
  const loader = gameRegistry[gameId];
  if (!loader) throw new Error(`Unknown game: ${gameId}`);
  return loader();
}
```

- [ ] **Step 3: Create stats/types.ts**

```typescript
// src/lib/stats/types.ts
export interface HeatmapData {
  [key: string]: number; // 'T20': 412, 'D16': 38, etc.
}

export interface GameStatsResult {
  gameId: string;
  scope: 'match' | 'last5' | 'last10' | 'last25' | 'all';
  metrics: Record<string, any>;
  dartHeatmap: HeatmapData;
  totalDarts: number;
  matchCount: number;
  sampleSize: number;
}
```

- [ ] **Step 4: Create stats/engine.ts (stub)**

```typescript
// src/lib/stats/engine.ts
import { Visit, GameModule } from '@/lib/types';
import { GameStatsResult, HeatmapData } from './types';

export function computeAggregateStats(
  visits: Visit[],
  gameModule: GameModule<any, any>
): GameStatsResult {
  // TODO: M2 implementation
  return {
    gameId: gameModule.id,
    scope: 'match',
    metrics: {},
    dartHeatmap: {},
    totalDarts: 0,
    matchCount: 1,
    sampleSize: 0,
  };
}

export function buildHeatmap(visits: Visit[]): HeatmapData {
  const heatmap: HeatmapData = {};
  visits.forEach((visit) => {
    visit.throws.forEach((t) => {
      const key = `${t.ring}${t.sector}`;
      heatmap[key] = (heatmap[key] || 0) + 1;
    });
  });
  return heatmap;
}

export const isSmallSample = (count: number): boolean => count < 30;
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/games/registry.ts src/lib/games/types.ts src/lib/stats/types.ts src/lib/stats/engine.ts
git commit -m "feat: game registry and stats engine scaffolding"
```

---

## M1: X01 Engine + Dartboard + Local Match (2 weekends)

### File Structure for M1

```
lib/
├── games/
│   ├── x01/
│   │   ├── schema.ts           # Zod settings schema
│   │   ├── engine.ts           # Pure scoring engine
│   │   ├── engine.test.ts      # Comprehensive tests
│   │   ├── stats.ts            # Stats computation
│   │   ├── components.tsx      # ScoreboardSlot, etc.
│   │   └── index.ts            # Default: GameModule export
│   └── registry.ts             # Updated to use x01
├── db/
│   ├── models.ts               # Mongoose schemas
│   └── connection.ts           # MongoDB connection
└── store/
    └── match.ts                # Zustand match store

components/
├── organisms/
│   ├── Scoreboard.tsx          # Generic scoreboard
│   ├── DartboardInput.tsx      # SVG dartboard for input
│   ├── DartInputPad.tsx        # Numeric keypad alternative
│   └── (more in later tasks)
└── molecules/
    ├── PlayerCard.tsx
    ├── DartChip.tsx
    └── (more)

app/
└── (match)/
    └── match/
        └── [id]/
            └── page.tsx        # Live match screen
```

### Task M1-1: X01 Schema (Settings)

**Files:**
- Create: `lib/games/x01/schema.ts`

**Interfaces:**
- Produces: `X01Settings` type and Zod schema

- [ ] **Step 1: Create schema.ts**

```typescript
// src/lib/games/x01/schema.ts
import { z } from 'zod';

export const X01SettingsSchema = z.object({
  startingScore: z.enum(['301', '501', '701']).transform((v) => parseInt(v)),
  checkOut: z.enum(['double', 'straight', 'master']),
  checkIn: z.enum(['straight', 'double']),
  firstTo: z.number().int().min(1).max(7),
  sets: z.number().int().min(0).max(7).optional().default(0),
  firstThrow: z.enum(['player1', 'random', 'bulloff', 'alternate']).default('alternate'),
  handicap: z.record(z.string(), z.number()).optional(),
});

export type X01Settings = z.infer<typeof X01SettingsSchema>;

export const X01DefaultSettings: X01Settings = {
  startingScore: 501,
  checkOut: 'double',
  checkIn: 'straight',
  firstTo: 3,
  sets: 0,
  firstThrow: 'alternate',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/games/x01/schema.ts
git commit -m "feat(x01): settings schema"
```

---

### Task M1-2: X01 Scoring Engine

**Files:**
- Create: `lib/games/x01/engine.ts`

**Interfaces:**
- Consumes: `Throw`, `PlayerId`, `X01Settings`
- Produces: Pure functions: `init`, `applyThrow`, `undo`, `isComplete`, `winner`

- [ ] **Step 1: Create engine.ts with data structures**

```typescript
// src/lib/games/x01/engine.ts
import { Throw, PlayerId } from '@/lib/types';
import { X01Settings } from './schema';

export interface X01State {
  playerScores: Record<PlayerId, number>;
  currentPlayerIndex: number;
  players: PlayerId[];
  currentVisit: Throw[];
  legsWon: Record<PlayerId, number>;
  currentLegNumber: number;
  matchComplete: boolean;
  winnerId: PlayerId | null;
  visitHistory: Array<{
    playerId: PlayerId;
    throws: Throw[];
    scoreBefore: number;
    scoreAfter: number;
    busted: boolean;
  }>;
}

export function init(players: PlayerId[], settings: X01Settings): X01State {
  const playerScores: Record<PlayerId, number> = {};
  const legsWon: Record<PlayerId, number> = {};

  players.forEach((p) => {
    playerScores[p] = settings.startingScore;
    legsWon[p] = 0;
  });

  let startPlayerIndex = 0;
  if (settings.firstThrow === 'random') {
    startPlayerIndex = Math.floor(Math.random() * players.length);
  }

  return {
    playerScores,
    currentPlayerIndex: startPlayerIndex,
    players,
    currentVisit: [],
    legsWon,
    currentLegNumber: 1,
    matchComplete: false,
    winnerId: null,
    visitHistory: [],
  };
}

export function applyThrow(state: X01State, throw_: Throw, settings: X01Settings): X01State {
  const newState = { ...state };
  const currentPlayer = newState.players[newState.currentPlayerIndex];

  // Add dart to current visit
  newState.currentVisit = [...newState.currentVisit, throw_];

  // Calculate visit total
  const visitTotal = newState.currentVisit.reduce((sum, t) => sum + t.points, 0);
  const newScore = newState.playerScores[currentPlayer] - visitTotal;

  // Check for bust mid-visit
  let isBust = false;
  if (newScore < 0) {
    isBust = true;
  } else if (newScore === 1 && settings.checkOut === 'double') {
    isBust = true;
  }

  if (isBust) {
    // Visit is busted — revert to original state (no state change)
    return state;
  }

  // Finish visit after 3 darts
  if (newState.currentVisit.length === 3) {
    const scoreBefore = state.playerScores[currentPlayer];

    // Check for checkout
    let isCheckout = false;
    if (newScore === 0) {
      const lastDart = newState.currentVisit[2];
      if (settings.checkOut === 'double' && lastDart.ring === 'D') {
        isCheckout = true;
      } else if (settings.checkOut === 'straight') {
        isCheckout = true;
      } else if (settings.checkOut === 'master' && (lastDart.ring === 'D' || lastDart.ring === 'T')) {
        isCheckout = true;
      }
    }

    newState.visitHistory.push({
      playerId: currentPlayer,
      throws: newState.currentVisit,
      scoreBefore,
      scoreAfter: isCheckout ? 0 : newScore,
      busted: false,
    });

    newState.playerScores[currentPlayer] = isCheckout ? 0 : newScore;

    if (isCheckout) {
      // Leg won
      newState.legsWon[currentPlayer]++;

      // Check for match win
      if (newState.legsWon[currentPlayer] >= settings.firstTo) {
        newState.matchComplete = true;
        newState.winnerId = currentPlayer;
      } else {
        // Start new leg
        newState.currentLegNumber++;
        newState.currentVisit = [];
        newState.players.forEach((p) => {
          newState.playerScores[p] = settings.startingScore;
        });
        // Advance player
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
      }
    } else {
      // Visit complete, not a checkout — advance turn
      newState.currentVisit = [];
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    }
  }

  return newState;
}

export function undo(state: X01State): X01State {
  if (state.visitHistory.length === 0) return state;

  const newState = { ...state };
  const lastVisit = newState.visitHistory[newState.visitHistory.length - 1];

  // Restore player score and remove from history
  newState.playerScores[lastVisit.playerId] = lastVisit.scoreBefore;
  newState.visitHistory = newState.visitHistory.slice(0, -1);
  newState.currentVisit = [];
  newState.currentPlayerIndex = newState.players.indexOf(lastVisit.playerId);

  return newState;
}

export function isComplete(state: X01State): boolean {
  return state.matchComplete;
}

export function winner(state: X01State): PlayerId | null {
  return state.winnerId;
}

function isValidCheckout(throws: Throw[], settings: X01Settings): boolean {
  if (throws.length === 0) return false;
  const lastDart = throws[throws.length - 1];
  if (settings.checkOut === 'double') return lastDart.ring === 'D';
  if (settings.checkOut === 'straight') return true;
  if (settings.checkOut === 'master') return lastDart.ring === 'D' || lastDart.ring === 'T';
  return false;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/games/x01/engine.ts
git commit -m "feat(x01): pure scoring engine with init, applyThrow, undo, isComplete, winner"
```

---

### Task M1-3: X01 Engine Tests (Table-Driven + Property-Based)

**Files:**
- Create: `lib/games/x01/engine.test.ts`

**Interfaces:**
- Tests: All `applyThrow`, `undo`, checkout, bust, turn-advance edge cases

- [ ] **Step 1: Create comprehensive test suite**

```typescript
// src/lib/games/x01/engine.test.ts
import { describe, it, expect } from 'vitest';
import { init, applyThrow, undo, isComplete, winner } from './engine';
import { createPlayerId } from '@/lib/types';
import { X01DefaultSettings } from './schema';

describe('X01 Engine', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');

  describe('init', () => {
    it('initializes match with correct starting scores', () => {
      const state = init([player1, player2], X01DefaultSettings);
      expect(state.playerScores[player1]).toBe(501);
      expect(state.playerScores[player2]).toBe(501);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.legsWon[player1]).toBe(0);
    });
  });

  describe('applyThrow: happy path', () => {
    it('adds dart to current visit and updates score', () => {
      let state = init([player1, player2], X01DefaultSettings);
      const throw1 = { sector: 20, ring: 'T' as const, points: 60, order: 0 as const };
      state = applyThrow(state, throw1, X01DefaultSettings);
      expect(state.currentVisit).toHaveLength(1);
      expect(state.playerScores[player1]).toBe(501); // Not yet updated mid-visit
    });

    it('completes visit after 3 darts and advances turn', () => {
      let state = init([player1, player2], X01DefaultSettings);
      const throw1 = { sector: 20, ring: 'T' as const, points: 60, order: 0 as const };
      const throw2 = { sector: 20, ring: 'T' as const, points: 60, order: 1 as const };
      const throw3 = { sector: 20, ring: 'S' as const, points: 20, order: 2 as const };

      state = applyThrow(state, throw1, X01DefaultSettings);
      state = applyThrow(state, throw2, X01DefaultSettings);
      state = applyThrow(state, throw3, X01DefaultSettings);

      expect(state.currentVisit).toHaveLength(0); // Visit cleared
      expect(state.playerScores[player1]).toBe(361); // 501 - 140
      expect(state.currentPlayerIndex).toBe(1); // Turned to player2
    });
  });

  describe('applyThrow: bust detection', () => {
    it('reverts to original state on negative score (goes below zero)', () => {
      let state = init([player1, player2], X01DefaultSettings);
      // Set player1 to 10 remaining
      state.playerScores[player1] = 10;

      const throw1 = { sector: 20, ring: 'T' as const, points: 60, order: 0 as const };
      const throw2 = { sector: 5, ring: 'S' as const, points: 5, order: 1 as const };
      const throw3 = { sector: 10, ring: 'S' as const, points: 10, order: 2 as const }; // Total 75, would go negative

      state = applyThrow(state, throw1, X01DefaultSettings);
      const stateAfterThrow2 = applyThrow(state, throw2, X01DefaultSettings);
      const stateBustAttempt = applyThrow(stateAfterThrow2, throw3, X01DefaultSettings);

      // Should remain unchanged
      expect(stateBustAttempt).toEqual(stateAfterThrow2);
      expect(stateBustAttempt.playerScores[player1]).toBe(10);
      expect(stateBustAttempt.currentPlayerIndex).toBe(0); // Still player1's turn
    });

    it('rejects score of exactly 1 with double-out rule', () => {
      let state = init([player1, player2], { ...X01DefaultSettings, checkOut: 'double' });
      state.playerScores[player1] = 2;

      const throw1 = { sector: 1, ring: 'S' as const, points: 1, order: 0 as const };
      const throw2 = { sector: 1, ring: 'S' as const, points: 1, order: 1 as const };
      const throw3 = { sector: 1, ring: 'S' as const, points: 1, order: 2 as const }; // Total 3, would leave 1

      state = applyThrow(state, throw1, X01DefaultSettings);
      state = applyThrow(state, throw2, X01DefaultSettings);
      const stateBustAttempt = applyThrow(state, throw3, X01DefaultSettings);

      expect(stateBustAttempt).toEqual(state); // Unchanged
    });
  });

  describe('applyThrow: checkout detection', () => {
    it('recognizes checkout with double-out (finish on double)', () => {
      let state = init([player1, player2], { ...X01DefaultSettings, checkOut: 'double' });
      state.playerScores[player1] = 50;

      const throw1 = { sector: 15, ring: 'S' as const, points: 15, order: 0 as const };
      const throw2 = { sector: 10, ring: 'S' as const, points: 10, order: 1 as const };
      const throw3 = { sector: 25, ring: 'D' as const, points: 25, order: 2 as const }; // Double bull = checkout

      state = applyThrow(state, throw1, X01DefaultSettings);
      state = applyThrow(state, throw2, X01DefaultSettings);
      state = applyThrow(state, throw3, X01DefaultSettings);

      expect(state.playerScores[player1]).toBe(0);
      expect(state.legsWon[player1]).toBe(1);
      expect(state.currentLegNumber).toBe(2);
    });

    it('allows straight checkout (any dart to 0)', () => {
      let state = init([player1, player2], { ...X01DefaultSettings, checkOut: 'straight' });
      state.playerScores[player1] = 20;

      const throw1 = { sector: 1, ring: 'S' as const, points: 1, order: 0 as const };
      const throw2 = { sector: 1, ring: 'S' as const, points: 1, order: 1 as const };
      const throw3 = { sector: 18, ring: 'S' as const, points: 18, order: 2 as const };

      state = applyThrow(state, throw1, X01DefaultSettings);
      state = applyThrow(state, throw2, X01DefaultSettings);
      state = applyThrow(state, throw3, X01DefaultSettings);

      expect(state.playerScores[player1]).toBe(0);
      expect(state.legsWon[player1]).toBe(1);
    });
  });

  describe('undo', () => {
    it('reverts to previous visit state', () => {
      let state = init([player1, player2], X01DefaultSettings);
      const throw1 = { sector: 20, ring: 'T' as const, points: 60, order: 0 as const };
      const throw2 = { sector: 20, ring: 'T' as const, points: 60, order: 1 as const };
      const throw3 = { sector: 20, ring: 'T' as const, points: 60, order: 2 as const };

      state = applyThrow(state, throw1, X01DefaultSettings);
      state = applyThrow(state, throw2, X01DefaultSettings);
      const stateBeforeUndo = applyThrow(state, throw3, X01DefaultSettings);

      const stateAfterUndo = undo(stateBeforeUndo);

      expect(stateAfterUndo.playerScores[player1]).toBe(501);
      expect(stateAfterUndo.currentPlayerIndex).toBe(0);
      expect(stateAfterUndo.currentVisit).toHaveLength(0);
    });
  });

  describe('match completion', () => {
    it('completes match after first player reaches firstTo legs', () => {
      let state = init([player1, player2], { ...X01DefaultSettings, firstTo: 1 });

      // Manually set player1 to finish
      state.playerScores[player1] = 0;
      state.legsWon[player1] = 0;

      const throw1 = { sector: 20, ring: 'T' as const, points: 60, order: 0 as const };
      const throw2 = { sector: 20, ring: 'T' as const, points: 60, order: 1 as const };
      const throw3 = { sector: 25, ring: 'D' as const, points: 50, order: 2 as const }; // 50 remaining, double out

      state = applyThrow(state, throw1, X01DefaultSettings);
      state = applyThrow(state, throw2, X01DefaultSettings);
      state = applyThrow(state, throw3, X01DefaultSettings);

      expect(isComplete(state)).toBe(true);
      expect(winner(state)).toBe(player1);
    });
  });

  describe('invariants (property-based spirit)', () => {
    it('score never goes below 0 (bust protection)', () => {
      let state = init([player1, player2], X01DefaultSettings);
      const random = () => ({
        sector: Math.floor(Math.random() * 20) + 1 as any,
        ring: ['S', 'D', 'T', 'OB', 'IB', 'M'][Math.floor(Math.random() * 6)] as any,
        points: Math.floor(Math.random() * 20),
        order: (Math.floor(Math.random() * 3) as any),
      });

      for (let i = 0; i < 100; i++) {
        const throw_ = random();
        state = applyThrow(state, throw_, X01DefaultSettings);
        if (!isComplete(state)) {
          expect(state.playerScores[player1]).toBeGreaterThanOrEqual(0);
          expect(state.playerScores[player2]).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test -- src/lib/games/x01/engine.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/games/x01/engine.test.ts
git commit -m "test(x01): comprehensive engine tests (bust, checkout, undo, invariants)"
```

---

### Task M1-4: X01 Stats Computation

**Files:**
- Create: `lib/games/x01/stats.ts`

**Interfaces:**
- Consumes: `Visit[]`, `X01Settings`
- Produces: `X01Stats` and `statTiles`

- [ ] **Step 1: Create stats.ts**

```typescript
// src/lib/games/x01/stats.ts
import { Visit, StatTileDef, GameStats } from '@/lib/types';
import { X01Settings } from './schema';

export interface X01Stats extends GameStats {
  avg3Dart: number;
  firstNineAvg: number;
  checkoutRate: number;
  dartsPerLeg: number;
  bestLeg: number | null;
  highestCheckout: number | null;
  doublesHit: number;
  doublesAttempts: number;
  doublesRate: number;
  treblesHit: number;
  treblesRate: number;
}

export function computeStats(visits: Visit[], settings: X01Settings): X01Stats {
  if (visits.length === 0) {
    return {
      avg3Dart: 0,
      firstNineAvg: 0,
      checkoutRate: 0,
      dartsPerLeg: 0,
      bestLeg: null,
      highestCheckout: null,
      doublesHit: 0,
      doublesAttempts: 0,
      doublesRate: 0,
      treblesHit: 0,
      treblesRate: 0,
    };
  }

  let totalPoints = 0;
  let totalDarts = 0;
  let checkoutAttempts = 0;
  let checkoutHits = 0;
  let doublesAttempts = 0;
  let doublesHit = 0;
  let treblesHit = 0;
  let trebleAttempts = 0;
  let highestCheckout = 0;
  let legsCompleted = 0;
  let totalDartsInLegs = 0;
  let bestLegDarts = Infinity;

  visits.forEach((visit) => {
    visit.throws.forEach((t) => {
      totalPoints += t.points;
      totalDarts++;

      if (t.ring === 'T') {
        treblesHit++;
        trebleAttempts++;
      } else if (t.ring === 'D') {
        doublesHit++;
        doublesAttempts++;
      } else if (t.ring === 'S' || t.ring === 'OB' || t.ring === 'IB') {
        if (t.ring === 'D') doublesAttempts++;
      } else if (t.ring === 'M') {
        // Miss
      }
    });

    if (visit.isCheckout) {
      checkoutHits++;
      checkoutAttempts++;
      highestCheckout = Math.max(highestCheckout, visit.scoreAfter || 0);
      legsCompleted++;
      totalDartsInLegs += visit.throws.length;
      bestLegDarts = Math.min(bestLegDarts, visit.throws.length);
    } else if (visit.busted) {
      checkoutAttempts++;
    }
  });

  const avg3Dart = totalDarts > 0 ? (totalPoints / totalDarts) * 3 : 0;
  const firstNineAvg = Math.min(9, totalDarts) > 0 ? (visits.slice(0, 3).reduce((sum, v) => sum + v.throws.reduce((s, t) => s + t.points, 0), 0) / Math.min(9, totalDarts)) * 3 : 0;
  const checkoutRate = checkoutAttempts > 0 ? checkoutHits / checkoutAttempts : 0;
  const dartsPerLeg = legsCompleted > 0 ? totalDartsInLegs / legsCompleted : 0;
  const doublesRate = doublesAttempts > 0 ? doublesHit / doublesAttempts : 0;
  const treblesRate = trebleAttempts > 0 ? treblesHit / trebleAttempts : 0;

  return {
    avg3Dart: Math.round(avg3Dart * 10) / 10,
    firstNineAvg: Math.round(firstNineAvg * 10) / 10,
    checkoutRate: Math.round(checkoutRate * 1000) / 10, // Percentage
    dartsPerLeg: Math.round(dartsPerLeg * 10) / 10,
    bestLeg: bestLegDarts === Infinity ? null : bestLegDarts,
    highestCheckout: highestCheckout || null,
    doublesHit,
    doublesAttempts,
    doublesRate: Math.round(doublesRate * 1000) / 10,
    treblesHit,
    treblesRate: Math.round(treblesRate * 1000) / 10,
  };
}

export const statTiles: StatTileDef<X01Stats>[] = [
  {
    label: '3-dart avg',
    key: 'avg3Dart',
    value: (stats) => stats.avg3Dart.toFixed(1),
  },
  {
    label: 'Checkout %',
    key: 'checkoutRate',
    value: (stats) => `${stats.checkoutRate.toFixed(0)}%`,
  },
  {
    label: 'Darts/leg',
    key: 'dartsPerLeg',
    value: (stats) => stats.dartsPerLeg.toFixed(1),
  },
  {
    label: 'Best leg',
    key: 'bestLeg',
    value: (stats) => stats.bestLeg ? `${stats.bestLeg}` : '—',
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/games/x01/stats.ts
git commit -m "feat(x01): stats computation and stat tiles"
```

---

### Task M1-5: X01 Module Export (GameModule<TState, TSettings>)

**Files:**
- Create: `lib/games/x01/components.tsx`
- Create: `lib/games/x01/index.ts`
- Modify: `lib/games/registry.ts`

**Interfaces:**
- Produces: `export default GameModule<X01State, X01Settings>`

- [ ] **Step 1: Create components.tsx (ScoreboardSlot placeholder)**

```typescript
// src/lib/games/x01/components.tsx
import { X01State } from './engine';
import { PlayerId } from '@/lib/types';
import { Numeral } from '@/components/atoms/Numeral';

export function ScoreboardSlot({ state, playerId }: { state: X01State; playerId: PlayerId }) {
  const score = state.playerScores[playerId];
  const legsWon = state.legsWon[playerId];
  const isCurrentPlayer = state.players[state.currentPlayerIndex] === playerId;

  return (
    <div className={`p-4 rounded ${isCurrentPlayer ? 'bg-wire text-oche' : 'bg-slate text-chalk'}`}>
      <div className="text-sm font-semibold mb-2">{playerId.toUpperCase()}</div>
      <Numeral value={score} size="2xl" />
      <div className="text-xs mt-2">Legs: {legsWon}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create index.ts (GameModule export)**

```typescript
// src/lib/games/x01/index.ts
import { GameModule, PlayerId, Visit } from '@/lib/types';
import { X01State, init as initEngine, applyThrow, undo, isComplete, winner } from './engine';
import { X01Settings, X01SettingsSchema, X01DefaultSettings } from './schema';
import { computeStats, statTiles } from './stats';
import { ScoreboardSlot } from './components';
import { Dices } from 'lucide-react';

const X01Module: GameModule<X01State, X01Settings> = {
  id: 'x01',
  name: 'X01',
  description: 'Classic 301, 501, 701 darts',
  icon: Dices,
  playerRange: [2, 4],
  status: 'stable',

  settingsSchema: X01SettingsSchema,
  defaultSettings: X01DefaultSettings,

  init: initEngine,
  applyThrow,
  undo,
  isComplete,
  winner,

  ScoreboardSlot,
  primaryMetric: (state: X01State, playerId: PlayerId) => ({
    label: 'Remaining',
    value: state.playerScores[playerId].toString(),
  }),

  computeStats,
  statTiles,
};

export default X01Module;
```

- [ ] **Step 3: Update registry.ts**

```typescript
// src/lib/games/registry.ts
import { GameModule } from '@/lib/types';

export const gameRegistry = {
  x01: async () => import('./x01').then((m) => m.default),
  cricket: async () => {
    // TODO: M4
    throw new Error('Cricket not implemented yet');
  },
} as const;

export type GameId = keyof typeof gameRegistry;

export async function getGameModule(gameId: GameId): Promise<GameModule<any, any>> {
  const loader = gameRegistry[gameId];
  if (!loader) throw new Error(`Unknown game: ${gameId}`);
  return loader();
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/games/x01/components.tsx src/lib/games/x01/index.ts src/lib/games/registry.ts
git commit -m "feat(x01): complete GameModule export"
```

---

### Task M1-6: Zustand Match Store

**Files:**
- Create: `store/match.ts`

**Interfaces:**
- Produces: Match store with state, setters, visit log

- [ ] **Step 1: Create match.ts**

```typescript
// src/store/match.ts
import { create } from 'zustand';
import { X01State } from '@/lib/games/x01/engine';
import { PlayerId, Visit } from '@/lib/types';
import { GameModule } from '@/lib/types';

interface MatchStore {
  matchId: string | null;
  gameModule: GameModule<any, any> | null;
  gameState: any; // X01State | CricketState | ...
  visitLog: Visit[];
  currentPlayer: PlayerId | null;

  // Actions
  setMatch: (matchId: string, gameModule: GameModule<any, any>, initialState: any) => void;
  applyThrow: (throw_: any) => void;
  undo: () => void;
  addVisit: (visit: Visit) => void;
  reset: () => void;
}

export const useMatchStore = create<MatchStore>((set) => ({
  matchId: null,
  gameModule: null,
  gameState: null,
  visitLog: [],
  currentPlayer: null,

  setMatch: (matchId, gameModule, initialState) =>
    set({
      matchId,
      gameModule,
      gameState: initialState,
    }),

  applyThrow: (throw_) =>
    set((state) => {
      if (!state.gameModule || !state.gameState) return state;
      const newGameState = state.gameModule.applyThrow(state.gameState, throw_);
      return { gameState: newGameState };
    }),

  undo: () =>
    set((state) => {
      if (!state.gameModule || !state.gameState) return state;
      const newGameState = state.gameModule.undo(state.gameState);
      return { gameState: newGameState };
    }),

  addVisit: (visit) =>
    set((state) => ({
      visitLog: [...state.visitLog, visit],
    })),

  reset: () =>
    set({
      matchId: null,
      gameModule: null,
      gameState: null,
      visitLog: [],
      currentPlayer: null,
    }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/store/match.ts
git commit -m "feat: zustand match store for live game state"
```

---

### Task M1-7: Dartboard SVG Input Component

**Files:**
- Create: `components/organisms/DartboardInput.tsx`

**Interfaces:**
- Consumes: `onThrow: (throw: Throw) => void`
- Produces: Interactive SVG dartboard with tap targets

- [ ] **Step 1: Create DartboardInput.tsx**

```typescript
// src/components/organisms/DartboardInput.tsx
'use client';
import { useState } from 'react';
import { Throw, createPlayerId } from '@/lib/types';

interface DartboardInputProps {
  onThrow: (throw_: Throw) => void;
  disabled?: boolean;
}

export function DartboardInput({ onThrow, disabled = false }: DartboardInputProps) {
  const segments = Array.from({ length: 20 }, (_, i) => i + 1);

  const handleSegmentClick = (sector: number, ring: 'S' | 'D' | 'T' | 'OB' | 'IB') => {
    if (disabled) return;
    const points = calculatePoints(sector, ring);
    onThrow({
      sector: sector as any,
      ring,
      points,
      order: 0 as const, // Will be set by engine
    });
  };

  const handleMiss = () => {
    if (disabled) return;
    onThrow({
      sector: 0 as any,
      ring: 'M',
      points: 0,
      order: 0 as const,
    });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 400 400" className="w-64 h-64">
        {/* Dartboard circles and segments */}
        <circle cx="200" cy="200" r="190" fill="var(--oche)" stroke="var(--chalk)" strokeWidth="1" />

        {segments.map((segment) => {
          const angle = ((segment - 6) * 18) * (Math.PI / 180);
          const x = 200 + Math.cos(angle) * 150;
          const y = 200 + Math.sin(angle) * 150;
          return (
            <g key={segment}>
              {/* Treble ring */}
              <circle
                cx={x}
                cy={y}
                r="20"
                fill="var(--wire)"
                opacity="0.3"
                onClick={() => handleSegmentClick(segment, 'T')}
                className="cursor-pointer hover:opacity-60"
              />
              {/* Double ring */}
              <circle
                cx={x}
                cy={y}
                r="15"
                fill="var(--double)"
                opacity="0.3"
                onClick={() => handleSegmentClick(segment, 'D')}
                className="cursor-pointer hover:opacity-60"
              />
              {/* Single */}
              <circle
                cx={x}
                cy={y}
                r="10"
                fill="var(--slate)"
                opacity="0.3"
                onClick={() => handleSegmentClick(segment, 'S')}
                className="cursor-pointer hover:opacity-60"
              />
              <text x={x} y={y} textAnchor="middle" className="text-xs fill-chalk" dy="0.3em">
                {segment}
              </text>
            </g>
          );
        })}

        {/* Bulls */}
        <circle cx="200" cy="200" r="12" fill="var(--treble)" onClick={() => handleSegmentClick(25, 'IB')} className="cursor-pointer" />
        <circle cx="200" cy="200" r="8" fill="var(--wire)" onClick={() => handleSegmentClick(25, 'OB')} className="cursor-pointer" />
      </svg>

      <div className="flex gap-2">
        <button onClick={handleMiss} disabled={disabled} className="touch-target px-4 py-2 bg-slate text-chalk rounded hover:opacity-80">
          MISS
        </button>
      </div>
    </div>
  );
}

function calculatePoints(sector: number, ring: string): number {
  const ringValues = { S: 1, D: 2, T: 3, OB: 1, IB: 2 };
  const ringMultiplier = ringValues[ring as keyof typeof ringValues] || 1;
  return sector * ringMultiplier;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/organisms/DartboardInput.tsx
git commit -m "feat: interactive dartboard SVG input component"
```

---

### Task M1-8: Local Match End-to-End Flow

**Files:**
- Create: `app/(match)/match/[id]/page.tsx`
- Create: `app/(dashboard)/page.tsx` (create match stub)
- Create: `lib/db.ts` (Mongoose connection)
- Create: `lib/db/models.ts` (Match, Visit schemas)

**Interfaces:**
- Consumes: Game modules, store, X01 engine
- Produces: A fully playable local match screen

- [ ] **Step 1: Create Mongoose connection**

```typescript
// src/lib/db.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI not set');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

declare global {
  var mongoose: any;
}
```

- [ ] **Step 2: Create Mongoose models**

```typescript
// src/lib/db/models.ts
import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  gameId: { type: String, required: true },
  settings: mongoose.Schema.Types.Mixed,
  mode: { type: String, enum: ['local', 'remote'], required: true },
  roomCode: String,
  hostId: String,
  players: [
    {
      userId: String,
      guestId: String,
      name: String,
      seat: Number,
      isGuest: Boolean,
    },
  ],
  status: { type: String, enum: ['lobby', 'live', 'complete', 'abandoned'], required: true },
  state: mongoose.Schema.Types.Mixed,
  winnerId: String,
  startedAt: Date,
  completedAt: Date,
  durationMs: Number,
  createdAt: { type: Date, default: Date.now },
});

export const Match = mongoose.models.Match || mongoose.model('Match', MatchSchema);

const VisitSchema = new mongoose.Schema({
  matchId: { type: String, required: true },
  legId: String,
  playerId: { type: String, required: true },
  index: Number,
  seq: Number,
  throws: [
    {
      sector: Number,
      ring: String,
      points: Number,
      order: Number,
    },
  ],
  scoreBefore: Number,
  scoreAfter: Number,
  busted: Boolean,
  isCheckout: Boolean,
  enteredBy: String,
  createdAt: { type: Date, default: Date.now },
});

export const Visit = mongoose.models.Visit || mongoose.model('Visit', VisitSchema);
```

- [ ] **Step 3: Create dashboard page**

```typescript
// src/app/(dashboard)/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateMatch = async () => {
    setLoading(true);
    const matchId = uuidv4();
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
```

- [ ] **Step 4: Create match page**

```typescript
// src/app/(match)/match/[id]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useMatchStore } from '@/store/match';
import { getGameModule } from '@/lib/games/registry';
import { DartboardInput } from '@/components/organisms/DartboardInput';
import { Numeral } from '@/components/atoms/Numeral';
import { Button } from '@/components/atoms/Button';
import { Throw, PlayerId, createPlayerId } from '@/lib/types';

interface MatchPageProps {
  params: { id: string };
}

export default function MatchPage({ params }: MatchPageProps) {
  const { gameState, gameModule, visitLog } = useMatchStore();
  const [loading, setLoading] = useState(true);

  const { id } = params;

  useEffect(() => {
    const init = async () => {
      // Load game module (X01 for now)
      const module = await getGameModule('x01');
      const gameState = module.init(
        [createPlayerId('player1'), createPlayerId('player2')],
        module.defaultSettings
      );
      useMatchStore.setState({
        matchId: id,
        gameModule: module,
        gameState,
      });
      setLoading(false);
    };
    init();
  }, [id]);

  const handleThrow = (throw_: Throw) => {
    useMatchStore.getState().applyThrow(throw_);
  };

  const handleUndo = () => {
    useMatchStore.getState().undo();
  };

  if (loading || !gameModule || !gameState) {
    return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">Loading...</div>;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isComplete = gameModule.isComplete(gameState);

  return (
    <div className="min-h-screen bg-oche text-chalk p-4 flex flex-col">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{gameModule.name}</h1>
        <Button onClick={() => handleUndo()} size="sm" variant="ghost" disabled={visitLog.length === 0}>
          ↶ Undo
        </Button>
      </header>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {gameState.players.map((playerId: PlayerId) => (
          <gameModule.ScoreboardSlot key={playerId} state={gameState} playerId={playerId} />
        ))}
      </div>

      {/* Dartboard input */}
      <div className="flex-1 flex items-center justify-center">
        <DartboardInput onThrow={handleThrow} disabled={isComplete} />
      </div>

      {/* Match end */}
      {isComplete && (
        <div className="bg-slate p-4 rounded text-center">
          <p className="text-lg font-bold mb-2">Match Complete!</p>
          <p className="mb-4">Winner: {gameModule.winner(gameState)}</p>
          <Button onClick={() => window.location.href = '/dashboard'}>Back to Dashboard</Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create API route for creating matches**

```typescript
// src/app/api/matches/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await connectDB();
  const session = await getServerSession(authOptions);

  const { gameId } = await req.json();

  const match = await Match.create({
    gameId,
    mode: 'local',
    status: 'live',
    players: [
      { name: session?.user?.name || 'Guest 1', isGuest: !session },
      { name: 'Guest 2', isGuest: true },
    ],
  });

  return NextResponse.json({ id: match._id.toString() });
}

export async function GET(req: NextRequest) {
  await connectDB();
  const matches = await Match.find({}).limit(10).sort({ createdAt: -1 });
  return NextResponse.json(matches);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts src/lib/db/models.ts src/app/\(match\) src/app/\(dashboard\) src/app/api/matches
git commit -m "feat: local match end-to-end (dashboard, match page, db, api)"
```

---

## Summary

This plan covers **M0 (scaffolding) and M1 (X01 + local match)** in detail. The remaining milestones (M2–M7) follow the same pattern:

- **M2** (Stats + post-match): Implement `stats/engine.ts` fully, create PostMatchScreen component
- **M3** (Remote play): Ably setup, lobby, sync layer, reconnection logic
- **M4** (Cricket): Second game module to validate `GameModule` contract
- **M5–M7** (Polish): Live stats drawer, aggregate stats page, PWA, offline queue

Each task is self-contained and testable. The architecture ensures game-specific code lives only in `/lib/games/x01/` and `/lib/games/cricket/`; views remain generic and pull from the registry.

---

**Plan complete and saved to `docs/superpowers/plans/2026-09-01-oche-mvp-implementation.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration and context isolation.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?