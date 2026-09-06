# Visual Identity — Foundation & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the new visual language — tokens, cut-corner surfaces, condensed display type, darts-derived SVG motifs — as a shared primitive layer, and rebuild the dashboard on top of it as proof the language works in real code.

**Architecture:** Two new atoms (`Panel`, `BoardMotif`) carry the entire language so no surface hand-rolls it. `Panel` owns the cut-corner shape and, critically, the focus-ring workaround that `clip-path` forces — solved once, correctly, in one place. `BoardMotif` generates its board geometry from the existing `lib/dartboard-geometry.ts` rather than hardcoded angles. The dashboard is then rebuilt from those two primitives plus token changes.

**Tech Stack:** TypeScript, React 19, Tailwind v4, `next/font/google`, inline SVG. No new dependencies.

**Spec:** [2026-09-06-visual-identity-design.md](../specs/2026-09-06-visual-identity-design.md)

**Plan 1 of 2.** This plan covers spec sections 3 (tokens), 4 (motifs — see scoping note), 6 (primitives) and 5.1 (dashboard). Plan 2 will cover the match screen (§5.2–5.3, including the Cricket/Copycat fixes and the `matchInfo` `emphasis` addition), stats/post-match (§5.4) and lobby/auth (§5.5).

### Two scoping decisions made while writing this plan

**Only three motifs are built now, not all six.** The dashboard needs `board`, `scoresheet` and `echo`. Building `spider`, `flights` and `reticle` now would mean shipping three components with no consumer, whose APIs would be guessed rather than driven by real use, and which nothing renders so nothing verifies. The `MotifName` union therefore contains exactly the three implemented variants; plan 2 adds the others as it needs them. Adding a union member later is a purely additive, type-checked change, and the component's `switch` is exhaustive so TypeScript will flag any gap.

**`Pips` is deferred to plan 2.** The spec lists it as a primitive, but its only consumer is the match screen's legs display. Same reasoning: no consumer here, nothing to verify it against. Its intended API is recorded at the end of this plan so plan 2 inherits it rather than re-deriving it.

## Global Constraints

- **`clip-path` clips borders, outlines AND focus rings.** Every currently-focusable control must remain visibly focusable. This is the highest-risk regression in the plan. It is solved once inside `Panel` (an unclipped outer element carries the focus ring; a clipped inner element carries the surface) and verified as an explicit step, not an afterthought.
- **All motion must be disabled under `prefers-reduced-motion: reduce`** — hover then changes colour/opacity only, with no transform.
- **The board motif must be generated from `lib/dartboard-geometry.ts`** (`CENTER`, `RADIUS`, `BOARD_ORDER`, `segmentAngles`, `annularWedgePath`) — never hardcoded angles or radii. A hand-authored board during the design session put wires up the 12 o'clock centreline, so the lit T20 straddled a wire instead of filling a segment; the existing module already places segment 20 centred on 12 o'clock with wires at ±9°.
- **No new npm dependencies, no image assets** — CSS and inline SVG only.
- **No changes to game engines, `GameModule` behavioural methods, persistence, or API routes.** This plan is visual only.
- Verification is live and manual (no visual-regression infrastructure exists; adding it is out of scope), at **both a desktop and a phone width** — condensed-type legibility and the three-in-a-row layout are both width-dependent risks.
- Surfaces get their edge from background + a lit top edge (`inset 0 1px 0 rgba(255,255,255,.06)`) + a drop shadow, **never** from a `border` (which `clip-path` would cut).
- New atoms follow this project's existing convention: `Component.tsx` + `Component.stories.tsx`, exported from `components/atoms/index.ts`.

---

### Task 1: Tokens, fonts and global styles

**Files:**
- Modify: `lib/theme.ts`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties `--notch-card` (16px), `--notch-panel` (13px), `--notch-inset` (11px), `--motif-rest` (.24), `--motif-hover` (.44), `--motif-quiet` (.17); a `.scanlines` utility class; a `.motion-lift` hover-transform class that reduced-motion disables; `--font-display` now resolving to Barlow Condensed. All consumed by Tasks 2, 3 and 4, and by plan 2's surfaces.

- [ ] **Step 1: Update the colour and font tokens**

In `lib/theme.ts`, change exactly two values. The `oche` ground darkens so raised surfaces read as genuinely lifted:

```ts
export const tokens = {
  oche: "#101614",      // Page background
  slate: "#1E2724",     // Surfaces, cards
  chalk: "#F2F4F3",     // Primary text
  sisal: "#E4D8BC",     // Secondary text
  wire: "#C0A15C",      // Accent, focus
  treble: "#C8102E",    // Red (treble hits, danger)
  double: "#1B7F5A",    // Green (double hits, success)
} as const;
```

And the display family:

```ts
export const fontFamily = {
  display: "Barlow Condensed, sans-serif",
  sans: "Inter Tight, system-ui, sans-serif",
} as const;
```

- [ ] **Step 2: Swap the display font in the root layout**

In `app/layout.tsx`, replace the `Bricolage_Grotesque` import and instance with `Barlow_Condensed`. Change:

```tsx
import { Bricolage_Grotesque, Inter_Tight } from "next/font/google";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});
```

to:

```tsx
import { Barlow_Condensed, Inter_Tight } from "next/font/google";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
```

and in the `<html>` element's className, change `${bricolageGrotesque.variable}` to `${barlowCondensed.variable}` (leave `${interTight.variable}` and the rest of that className exactly as it is).

- [ ] **Step 3: Add the shape, motif and motion tokens to globals.css**

In `app/globals.css`, update the `--oche` value in `:root` to `#101614`, then add the new tokens immediately after the existing `--heat-hot` line, still inside `:root`:

```css
  /* Shape language — notch sizes for cut-corner surfaces (see Panel atom) */
  --notch-card: 16px;
  --notch-panel: 13px;
  --notch-inset: 11px;
  /* Motif intensities — resting, hovered, and quiet (behind live match scores) */
  --motif-rest: 0.24;
  --motif-hover: 0.44;
  --motif-quiet: 0.17;
```

- [ ] **Step 4: Add the scanline and reduced-motion rules**

Append to the end of `app/globals.css`:

```css
/**
 * Scanlines — a faint diagonal texture for large dark areas. Applied to a positioned
 * ancestor; draws above its background but below its content.
 */
.scanlines::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.45;
  background: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.02) 0 2px, transparent 2px 9px);
}

/**
 * The hover lift used by interactive surfaces. Isolated in its own class so that
 * reduced-motion can remove the movement itself, not merely its animation.
 */
.motion-lift {
  transition: transform 160ms ease, background-color 160ms ease;
}
.group:hover .motion-lift {
  transform: translateY(-4px);
}

/**
 * Motifs brighten when their surface is hovered. Scoped to the `board-motif` class the
 * BoardMotif atom sets — a generic selector such as svg[aria-hidden] would also catch every
 * lucide icon rendered inside a hovered card.
 */
.board-motif {
  transition: opacity 180ms ease, transform 300ms ease;
}
.group:hover .board-motif {
  opacity: var(--motif-hover) !important;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  /* Colour and opacity still change on hover; movement does not happen at all. */
  .group:hover .motion-lift {
    transform: none !important;
  }
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Then run `npm run dev` and load the dashboard. Expected: the page still renders (unstyled-by-the-new-language, that's fine at this stage), the background is very slightly darker, and headings now render in Barlow Condensed — a noticeably narrower, more condensed face than before. Confirm no missing-font flash of a serif fallback.

- [ ] **Step 6: Commit**

```bash
git add lib/theme.ts app/globals.css app/layout.tsx
git commit -m "feat(ui): visual identity tokens, Barlow Condensed display face, motion rules"
```

---

### Task 2: `BoardMotif` atom

**Files:**
- Create: `components/atoms/BoardMotif.tsx`
- Create: `components/atoms/BoardMotif.stories.tsx`
- Modify: `components/atoms/index.ts`

**Interfaces:**
- Consumes: `CENTER`, `RADIUS`, `BOARD_ORDER`, `segmentAngles`, `annularWedgePath` from `@/lib/dartboard-geometry` (Task 1 does not change these).
- Produces: `export type MotifName = 'board' | 'scoresheet' | 'echo'` and `export function BoardMotif(props: { name: MotifName; className?: string })`. Renders an `<svg>` that fills its container, drawn entirely in `currentColor` with no colour or opacity of its own — the parent sets both. Consumed by Task 4 and by plan 2's surfaces (which will extend `MotifName` with `'spider' | 'flights' | 'reticle'`).

- [ ] **Step 1: Write the component**

Create `components/atoms/BoardMotif.tsx`:

```tsx
import React from 'react';
import { CENTER, RADIUS, BOARD_ORDER, segmentAngles, annularWedgePath } from '@/lib/dartboard-geometry';

/** Motifs implemented so far. Plan 2 adds 'spider' | 'flights' | 'reticle' for the match,
 *  stats and lobby surfaces; the switch below is exhaustive, so adding a name without
 *  drawing it is a type error rather than a blank render. */
export type MotifName = 'board' | 'scoresheet' | 'echo';

interface BoardMotifProps {
  name: MotifName;
  /** Positioning, sizing, colour and opacity all come from the parent. */
  className?: string;
  /** Used by consumers to set the resting opacity from the --motif-* tokens. */
  style?: React.CSSProperties;
}

const VIEWBOX = `0 0 ${CENTER * 2} ${CENTER * 2}`;
/** Matches how DartboardInput draws the inner bull, so the decorative board and the
 *  interactive board stay in proportion. */
const INNER_BULL = RADIUS.innerSingleInner * 0.4;

function polar(radius: number, angle: number) {
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

/** The full board: rings, all 20 wires, with T20 lit in the treble band and D20 faint at
 *  the rim. Every angle and radius is derived from lib/dartboard-geometry so this can never
 *  drift out of alignment with the real board (a hand-authored version put a wire up the
 *  12 o'clock centreline, which made the lit segment straddle it). */
function Board() {
  // BOARD_ORDER[0] is 20, and segmentAngles(0) centres it on 12 o'clock.
  const twenty = segmentAngles(0);
  const wires = BOARD_ORDER.map((_, index) => {
    const { startAngle } = segmentAngles(index);
    const inner = polar(RADIUS.innerSingleInner, startAngle);
    const outer = polar(RADIUS.boardEdge, startAngle);
    return { key: index, x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
  });

  return (
    <>
      <g stroke="currentColor" strokeWidth={2.2} fill="none">
        <circle cx={CENTER} cy={CENTER} r={RADIUS.boardEdge} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS.doubleInner} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS.outerSingleInner} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS.trebleInner} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS.innerSingleInner} />
      </g>
      <g stroke="currentColor" strokeWidth={1.7}>
        {wires.map((w) => (
          <line key={w.key} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} />
        ))}
      </g>
      <circle cx={CENTER} cy={CENTER} r={INNER_BULL} fill="currentColor" />
      <path
        d={annularWedgePath(RADIUS.trebleInner, RADIUS.outerSingleInner, twenty.startAngle, twenty.endAngle)}
        fill="currentColor"
      />
      <path
        d={annularWedgePath(RADIUS.doubleInner, RADIUS.boardEdge, twenty.startAngle, twenty.endAngle)}
        fill="currentColor"
        opacity={0.45}
      />
    </>
  );
}

/** How Cricket is actually scored: tally rows, closed numbers struck through, points bars. */
function Scoresheet() {
  const rows = [0, 1, 2, 3, 4, 5];
  const marks = [2, 2, 2, 1, 2, 0];
  const bars = [44, 44, 28, 44, 16, 44];
  return (
    <g stroke="currentColor" fill="none">
      <g strokeWidth={3.2}>
        {rows.map((r) => (
          <line key={`t${r}`} x1={60} y1={68 + r * 52} x2={172} y2={68 + r * 52} />
        ))}
      </g>
      <g strokeWidth={4.8}>
        {rows.map((r) =>
          marks[r] === 0 ? null : (
            <g key={`x${r}`}>
              <line x1={208} y1={52 + r * 52} x2={240} y2={84 + r * 52} />
              {marks[r] === 2 && <line x1={240} y1={52 + r * 52} x2={208} y2={84 + r * 52} />}
            </g>
          )
        )}
      </g>
      <line x1={280} y1={40} x2={280} y2={328} strokeWidth={2.8} />
      <g strokeWidth={4.4}>
        {rows.map((r) => (
          <line key={`b${r}`} x1={304} y1={68 + r * 52} x2={304 + bars[r]} y2={68 + r * 52} />
        ))}
      </g>
    </g>
  );
}

/** Two bullseyes, one solid and one dashed — Copycat is the echo. */
function Echo() {
  const rings = [32, 64, 96, 128];
  return (
    <g stroke="currentColor" strokeWidth={3} fill="none">
      {rings.map((r) => (
        <circle key={`a${r}`} cx={148} cy={CENTER} r={r} />
      ))}
      <circle cx={148} cy={CENTER} r={10} fill="currentColor" />
      {rings.map((r) => (
        <circle key={`b${r}`} cx={292} cy={CENTER} r={r} strokeDasharray="8 8" />
      ))}
      <circle cx={292} cy={CENTER} r={10} fill="currentColor" />
    </g>
  );
}

/** A darts-derived background graphic. Drawn in currentColor with crisp edges — never
 *  masked or faded; it is cropped by whatever surface it sits inside. */
export function BoardMotif({ name, className = '', style }: BoardMotifProps) {
  return (
    <svg
      viewBox={VIEWBOX}
      aria-hidden="true"
      focusable="false"
      /* `board-motif` is the hook the global hover rule targets. It must stay on every
         motif — targeting a generic selector like svg[aria-hidden] instead would also
         catch every lucide icon inside a hovered card. */
      className={`board-motif ${className}`}
      style={style}
    >
      {name === 'board' && <Board />}
      {name === 'scoresheet' && <Scoresheet />}
      {name === 'echo' && <Echo />}
    </svg>
  );
}
```

- [ ] **Step 2: Add the story**

Create `components/atoms/BoardMotif.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { BoardMotif } from "./BoardMotif";

const meta: Meta<typeof BoardMotif> = {
  component: BoardMotif,
  title: "Atoms/BoardMotif",
  tags: ["autodocs"],
  argTypes: {
    name: { control: "select", options: ["board", "scoresheet", "echo"] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Board: Story = {
  args: { name: "board", className: "w-64 h-64 text-wire" },
};

export const Scoresheet: Story = {
  args: { name: "scoresheet", className: "w-64 h-64 text-double" },
};

export const Echo: Story = {
  args: { name: "echo", className: "w-64 h-64 text-treble" },
};
```

- [ ] **Step 3: Export it from the barrel**

In `components/atoms/index.ts`, add:

```ts
export { BoardMotif } from "./BoardMotif";
export type { MotifName } from "./BoardMotif";
```

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/atoms/BoardMotif.tsx components/atoms/BoardMotif.stories.tsx components/atoms/index.ts
git commit -m "feat(ui): BoardMotif atom — board/scoresheet/echo, board derived from dartboard-geometry"
```

---

### Task 3: `Panel` atom

**Files:**
- Create: `components/atoms/Panel.tsx`
- Create: `components/atoms/Panel.stories.tsx`
- Modify: `components/atoms/index.ts`

**Interfaces:**
- Consumes: the `--notch-*` CSS variables and `.motion-lift` class from Task 1.
- Produces: `export type PanelNotch = 'card' | 'panel' | 'inset' | 'none'`, `export type AccentToken = 'wire' | 'double' | 'treble' | 'sisal'`, and `export function Panel(props)` where props are `{ as?: 'div' | 'button'; notch?: PanelNotch; accent?: AccentToken; accentBar?: boolean; active?: boolean; interactive?: boolean; className?: string; children: React.ReactNode }` plus, when `as="button"`, the standard button attributes (`onClick`, `disabled`, `aria-pressed`, `type`). Consumed by Task 4 and by every surface in plan 2.
- **Focus contract:** when `as="button"`, the outer element is unclipped and carries the `focus-visible` ring; the clipped surface is an inner element. Consumers must never apply `clip-path` themselves.

- [ ] **Step 1: Write the component**

Create `components/atoms/Panel.tsx`:

```tsx
import React from 'react';

export type PanelNotch = 'card' | 'panel' | 'inset' | 'none';
export type AccentToken = 'wire' | 'double' | 'treble' | 'sisal';

interface PanelOwnProps {
  as?: 'div' | 'button';
  /** Size of the cut bottom-right corner. */
  notch?: PanelNotch;
  /** Colours the accent bar and the left edge when active. */
  accent?: AccentToken;
  /** Draw the accent bar across the top of the surface. */
  accentBar?: boolean;
  /** Raised background plus a left accent edge — "this is the one in play". */
  active?: boolean;
  /** Hover lift. Implied when `as="button"`; set explicitly for hoverable non-buttons. */
  interactive?: boolean;
  /** Applied to the inner (clipped) surface. */
  className?: string;
  children: React.ReactNode;
}

type PanelProps = PanelOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof PanelOwnProps>;

const notchSize: Record<PanelNotch, string> = {
  card: 'var(--notch-card)',
  panel: 'var(--notch-panel)',
  inset: 'var(--notch-inset)',
  none: '0px',
};

const accentBg: Record<AccentToken, string> = {
  wire: 'bg-wire',
  double: 'bg-double',
  treble: 'bg-treble',
  sisal: 'bg-sisal',
};

/**
 * The app's surface primitive: a cut-corner panel with a lit top edge and a drop shadow.
 *
 * Why the two-element structure: `clip-path` clips borders, outlines and focus rings, so a
 * focus ring drawn on the clipped element would be visually cut off — an accessibility
 * regression. The outer element is therefore never clipped and carries the focus ring; the
 * inner element carries the clipped surface. Consumers get correct focus for free and must
 * not apply `clip-path` themselves.
 *
 * Edges come from background + inset top highlight + shadow, never from a `border`, which
 * the clip would cut.
 */
export function Panel({
  as = 'div',
  notch = 'panel',
  accent = 'wire',
  accentBar = false,
  active = false,
  interactive,
  className = '',
  children,
  ...rest
}: PanelProps) {
  const isButton = as === 'button';
  const lifts = interactive ?? isButton;

  const surface = (
    <span
      className={`
        relative block overflow-hidden
        ${active ? 'bg-[#202B28]' : 'bg-slate'}
        shadow-[0_16px_30px_-16px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]
        ${lifts ? 'motion-lift' : ''}
        ${className}
      `}
      style={{
        clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${notchSize[notch]}), calc(100% - ${notchSize[notch]}) 100%, 0 100%)`,
      }}
    >
      {accentBar && (
        <span
          className={`block h-[5px] w-full ${accentBg[accent]} ${
            lifts ? 'transition-[height] duration-150 group-hover:h-[9px]' : ''
          }`}
        />
      )}
      {active && <span className={`absolute left-0 top-0 bottom-0 w-1 ${accentBg[accent]}`} />}
      {children}
    </span>
  );

  if (!isButton) {
    return <div className="group relative">{surface}</div>;
  }

  return (
    <button
      type="button"
      className="group relative block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wire disabled:opacity-50"
      {...rest}
    >
      {surface}
    </button>
  );
}
```

- [ ] **Step 2: Add the story**

Create `components/atoms/Panel.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Panel } from "./Panel";

const meta: Meta<typeof Panel> = {
  component: Panel,
  title: "Atoms/Panel",
  tags: ["autodocs"],
  argTypes: {
    notch: { control: "select", options: ["card", "panel", "inset", "none"] },
    accent: { control: "select", options: ["wire", "double", "treble", "sisal"] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Surface: Story = {
  args: {
    notch: "card",
    accent: "wire",
    accentBar: true,
    className: "p-5 text-chalk",
    children: "A cut-corner surface",
  },
};

export const Active: Story = {
  args: {
    notch: "panel",
    accent: "wire",
    active: true,
    className: "p-5 text-chalk",
    children: "Active — raised, with a left accent edge",
  },
};

export const AsButton: Story = {
  args: {
    as: "button",
    notch: "card",
    accent: "double",
    accentBar: true,
    className: "p-5 text-chalk",
    children: "Tab to me — the focus ring must be fully visible",
  },
};
```

- [ ] **Step 3: Export it from the barrel**

In `components/atoms/index.ts`, add:

```ts
export { Panel } from "./Panel";
export type { PanelNotch, AccentToken } from "./Panel";
```

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/atoms/Panel.tsx components/atoms/Panel.stories.tsx components/atoms/index.ts
git commit -m "feat(ui): Panel atom — cut-corner surface with clip-safe focus ring"
```

---

### Task 4: Rebuild the dashboard

**Files:**
- Modify: `app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `Panel`, `BoardMotif`, `MotifName`, `AccentToken` from `@/components/atoms`; the `.scanlines` class and `--motif-*` variables from Task 1.
- Produces: nothing other tasks depend on — this is the first surface built on the language.

- [ ] **Step 1: Replace the accent map with accent + motif per game**

In `app/(dashboard)/page.tsx`, replace the existing `GAME_ACCENT` constant (the `Record<GameId, { selected: string; badge: string }>` block, along with its comment) with:

```tsx
/** Each game's identity: its accent token and the motif that says something true about how
 *  it's played. Copycat uses `treble` for identity only — never for state — per the spec. */
const GAME_IDENTITY: Record<GameId, { accent: AccentToken; motif: MotifName }> = {
  x01: { accent: 'wire', motif: 'board' },
  cricket: { accent: 'double', motif: 'scoresheet' },
  copycat: { accent: 'treble', motif: 'echo' },
};

const ACCENT_TEXT: Record<AccentToken, string> = {
  wire: 'text-wire',
  double: 'text-double',
  treble: 'text-treble',
  sisal: 'text-sisal',
};
```

Update the imports at the top of the file to add:

```tsx
import { Panel, BoardMotif } from '@/components/atoms';
import type { AccentToken, MotifName } from '@/components/atoms';
```

- [ ] **Step 2: Rebuild the game card**

Replace the entire existing `GameCard` function with:

```tsx
function GameCard({
  game,
  index,
  selected,
  onSelect,
}: {
  game: GameOption;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { accent, motif } = GAME_IDENTITY[game.id];

  return (
    <Panel
      as="button"
      notch="card"
      accent={accent}
      accentBar
      active={selected}
      onClick={onSelect}
      aria-pressed={selected}
      className="min-h-[172px]"
    >
      <BoardMotif
        name={motif}
        className={`pointer-events-none absolute -right-11 -bottom-14 w-[168px] h-[168px] ${ACCENT_TEXT[accent]} group-hover:rotate-[9deg]`}
        style={{ opacity: 'var(--motif-rest)' }}
      />
      <span className="relative block p-[18px] pt-[18px]">
        <span className={`block font-display font-bold text-[10px] tracking-[0.2em] ${ACCENT_TEXT[accent]}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="block font-display font-bold uppercase text-[30px] leading-[0.94] text-chalk mt-12 mb-1.5">
          {game.name}
        </span>
        <span className="block text-[10px] leading-[1.4] text-sisal/60">
          {game.playerRange[0]}–{game.playerRange[1]} players · {game.description}
        </span>
      </span>
    </Panel>
  );
}
```

(`BoardMotif` already accepts `style` and carries the `board-motif` class from Task 2, and Task 1 already added the global rule that brightens `.board-motif` on hover — nothing further is needed for either.)

- [ ] **Step 3: Put the three games in one row and open up the spacing**

In the `Dashboard` component's JSX, change the game grid from its current two-column form to a single row (stacking only at the narrowest widths), and pass the new `index` prop:

```tsx
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {games.map((game, index) => (
                <GameCard
                  key={game.id}
                  game={game}
                  index={index}
                  selected={game.id === selectedGameId}
                  onSelect={() => setSelectedGameId(game.id)}
                />
              ))}
            </div>
```

In the same component, open up the outer spacing: change the main content wrapper's `gap-6 md:gap-8` to `gap-7 md:gap-9`, and the `<header>`'s `gap-3` to `gap-5`.

- [ ] **Step 4: Add the scanline ground**

The outermost `<div>` of the page currently carries `className="min-h-screen bg-oche text-chalk p-4 md:p-8 flex flex-col items-center"` plus an inline `style` with a radial-gradient background image. Add `relative scanlines` to that className (keep everything else, including the inline style, exactly as it is):

```tsx
    <div
      className="min-h-screen bg-oche text-chalk p-4 md:p-8 flex flex-col items-center relative scanlines"
```

- [ ] **Step 5: Give the two primary actions a slant edge**

Replace the two `<Button>` elements' `className` values so they carry the slanted right edge, and wrap each in a focus-safe container. Change the first (Play Online) from:

```tsx
                <Button
                  onClick={() => handleCreateMatch(selectedGameId, 'remote')}
                  disabled={creating !== null}
                  className="min-h-16 md:min-h-20 rounded-2xl text-xl md:text-2xl w-full"
                >
```

to:

```tsx
              <div className="has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wire">
                <Button
                  onClick={() => handleCreateMatch(selectedGameId, 'remote')}
                  disabled={creating !== null}
                  className="min-h-16 md:min-h-20 rounded-none text-xl md:text-2xl w-full font-display uppercase tracking-[0.14em] [clip-path:polygon(0_0,100%_0,calc(100%-10px)_100%,0_100%)] focus-visible:outline-none"
                >
```

closing that new `<div>` after the `</Button>`. Apply the identical change to the second (Play Local) `<Button>`, keeping its `variant="secondary"` and its own `onClick`/label.

- [ ] **Step 6: Verify types and build**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` clean; 142 tests passing, unchanged (this task touches no logic).

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/page.tsx"
git commit -m "feat(ui): rebuild dashboard on the new visual language"
```

---

### Task 5: Live verification

No code changes unless a defect is found. This task is where the plan's two width-dependent risks and its one accessibility risk are actually checked.

**Files:** none.

- [ ] **Step 1: Desktop pass**

Run `npm run dev` and open the dashboard at a desktop width (≈1280px). Confirm:
- the three game cards sit in **one row**, each with its accent bar (gold / green / red) and its own motif — the full board with a lit T20 on X01, the tally scoresheet on Cricket, the twin bullseyes on Copycat;
- hovering a card lifts it, thickens its accent bar, and brightens + rotates its motif;
- the selected card shows the raised background and left accent edge;
- the X01 board's lit segment sits cleanly **between** two wires, not straddling one (this is the exact defect the geometry requirement exists to prevent — check it by eye).

- [ ] **Step 2: Phone-width pass**

Resize to a 390px-wide viewport (iPhone-class). Confirm the cards stack rather than squashing, the condensed display type is still comfortably legible at that size, and nothing overflows horizontally.

- [ ] **Step 3: Keyboard focus pass — non-negotiable**

With the keyboard only, Tab through the whole dashboard: the History/Sign-in link, each of the three game cards, each settings pill, and both primary buttons. **Every one must show a clearly visible focus ring that is not clipped off by the cut corner.** If any focus ring is cut, missing, or drawn inside the notch, that is a blocking defect — fix it in `Panel` (not per-consumer) before completing this task.

- [ ] **Step 4: Reduced-motion pass**

In Chrome DevTools, open the Rendering panel and set `prefers-reduced-motion: reduce`. Hover a game card. Confirm the card does **not** move, while the motif still brightens and the background still changes.

- [ ] **Step 5: Report**

No commit — verification only. Summarise what was checked, at which widths, and any defect found and fixed. Note explicitly anything that could not be verified in the environment rather than skipping it silently.

---

## For plan 2: the deferred `Pips` API

Recorded here so plan 2 inherits it rather than re-deriving it. `Pips` renders the legs-won indicator as flight-shaped diamonds — filled for won, outlined for remaining — and is the element that makes a match's win condition readable at a glance (the Cricket fix):

```tsx
export function Pips(props: { value: number; target: number; accent?: AccentToken; className?: string }): JSX.Element
```

A filled pip is an 11px square rotated 45° with a 2px radius, in the accent colour with a soft glow; an unfilled pip is the same shape with a `border-sisal/40` outline and no fill. Plan 2 pairs it with a `value/target` counter and the "Leg N in play" chip.
