# M2: Stats, Heat Map Redesign & Board Click-to-Throw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the match a real post-match stats screen, redesign the dartboard heat map into an actual density visualization (grey structure + blue-to-red heat, not "the same color but fainter"), and restore board click-to-throw as an addition alongside the existing numeric keypad.

**Architecture:** A new `GameModule.matchStats` accessor computes single-match stats from `X01State.visitHistory` (already in memory, no persistence needed), reusing the existing `statTiles` array for generic rendering. The dartboard's SVG geometry is extracted into a shared, pure module so a new decorative `HeatmapBoard` component (grey structure + heat overlay) and `DartboardInput`'s click-to-throw overlay can never visually drift apart. A small set of new "heat scale" CSS tokens (blue→yellow→red), explicitly scoped to data visualization only, sit alongside the existing 7 brand tokens.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Zustand, Vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-02-m2-stats-heatmap-design.md`

## Global Constraints

- No game-specific branches in views (`app/`, `components/organisms/`) — all X01-specific reads go through the `GameModule` interface.
- Every color traces to a design token (the existing 7 brand tokens, or the new heat-scale tokens this plan adds) via `var()`, a Tailwind token class, or `color-mix()` against one — never a raw hardcoded hex value.
- The X01 engine (`lib/games/x01/engine.ts`) and its 40-test suite (`lib/games/x01/engine.test.ts`) are not modified by this plan — everything needed already exists on `X01State`.
- All interactive controls (keypad, toggles, buttons) keep their existing ≥44px touch targets; nothing in this plan shrinks a touch target.

---

### Task 1: Heat-scale color tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `lib/theme.ts`

**Interfaces:**
- Produces: CSS custom properties `--heat-cold`, `--heat-mid`, `--heat-hot` (usable via `var()` anywhere, including inside `color-mix()`); a `heatScale` export from `lib/theme.ts` documenting the same three values for reference (not wired into Tailwind's `colors` — these are never meant to appear as `bg-*`/`text-*` utility classes, only as raw CSS values inside SVG heat rendering).

- [ ] **Step 1: Add the three heat-scale CSS variables**

In `app/globals.css`, inside the existing `:root { ... }` block (the one already containing `--oche`, `--slate`, etc.), add three new lines after `--double: #1B7F5A;`:

```css
  --double: #1B7F5A;
  /* Heat-scale tokens — data visualization only (dartboard hit-density heat maps).
     Never use these for UI chrome, buttons, or any of the 7 brand/gameplay tokens' jobs. */
  --heat-cold: #2563EB;
  --heat-mid: #EAB308;
  --heat-hot: #DC2626;
}
```

(The closing `}` above is the existing one that already ends the `:root` block — just confirm your edit lands the three new lines directly before it, immediately after the `--double` line.)

- [ ] **Step 2: Document the same values in `lib/theme.ts`**

In `lib/theme.ts`, find the existing `tokens` export (the object with `oche`, `slate`, `chalk`, `sisal`, `wire`, `treble`, `double`). Directly after that object's closing `} as const;`, add:

```typescript
// Heat-scale tokens — data visualization only, never used for UI chrome or brand color.
// Kept here for documentation/reference; not wired into Tailwind's `colors` extension,
// since these should never appear as bg-*/text-* utility classes — only as raw var()
// values inside heat-map rendering (see components/organisms/HeatmapBoard.tsx).
export const heatScale = {
  cold: "#2563EB",
  mid: "#EAB308",
  hot: "#DC2626",
} as const;
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean, no errors.

Run this to confirm the CSS variables actually compile into the generated stylesheet (not just present in source):
```bash
npx @tailwindcss/cli -i app/globals.css -o /tmp/oche-heat-test.css --content "components/**/*.tsx" --content "app/**/*.tsx" && grep -c "heat-cold\|heat-mid\|heat-hot" /tmp/oche-heat-test.css
```
Expected: a nonzero count (the `:root` block containing these variables appears in the compiled output).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css lib/theme.ts
git commit -m "feat(theme): add heat-scale tokens for dartboard density visualization"
```

---

### Task 2: Shared dartboard geometry module

**Files:**
- Create: `lib/dartboard-geometry.ts`
- Modify: `components/organisms/DartboardInput.tsx` (only to import from the new module instead of defining its own copies — no behavior change in this task)

**Interfaces:**
- Produces: `CENTER: number`, `RADIUS: {boardEdge, doubleInner, outerSingleInner, trebleInner, innerSingleInner}`, `BOARD_ORDER: number[]`, `annularWedgePath(innerRadius: number, outerRadius: number, startAngle: number, endAngle: number): string`, `segmentAngles(index: number): {startAngle: number; endAngle: number; midAngle: number}`.
- Consumes: nothing (pure geometry, no dependencies).

This task is a pure extraction — the geometry values and math are copied verbatim from the current `DartboardInput.tsx`, just moved to a shared file so Task 3 (`HeatmapBoard`) and Task 4 (click overlay) can both use the exact same numbers without risk of drift.

- [ ] **Step 1: Create the geometry module**

```typescript
// lib/dartboard-geometry.ts
export const CENTER = 200;

export const RADIUS = {
  boardEdge: 190,
  doubleInner: 160,
  outerSingleInner: 115,
  trebleInner: 92,
  innerSingleInner: 25,
};

/** A real dartboard's segment order, clockwise starting from the top (12 o'clock). */
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/** Builds an SVG path for one non-overlapping annular wedge (a ring "slice"): the actual shape of one dartboard scoring band for one segment. */
export function annularWedgePath(innerRadius: number, outerRadius: number, startAngle: number, endAngle: number): string {
  const point = (r: number, angle: number) => ({
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  });
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  const outerStart = point(outerRadius, startAngle);
  const outerEnd = point(outerRadius, endAngle);
  const innerEnd = point(innerRadius, endAngle);
  const innerStart = point(innerRadius, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

/** The angular span (radians) for the segment at BOARD_ORDER index i, matching a real board's clockwise layout starting from the top. */
export function segmentAngles(index: number): { startAngle: number; endAngle: number; midAngle: number } {
  const midAngle = (index * 18 - 90) * (Math.PI / 180);
  return {
    startAngle: midAngle - 9 * (Math.PI / 180),
    endAngle: midAngle + 9 * (Math.PI / 180),
    midAngle,
  };
}
```

- [ ] **Step 2: Verify the extraction is exact**

Compare every value against the CURRENT `components/organisms/DartboardInput.tsx` (before this task's Step 3 changes it): `CENTER = 200`, the 5 `RADIUS` values, the 20-number `BOARD_ORDER` array, and `annularWedgePath`'s body must be character-for-character identical to what's already there today. `segmentAngles` must produce the same `startAngle`/`endAngle`/`midAngle` values `DartboardInput`'s current inline `const midAngle = (i * 18 - 90) * (Math.PI / 180); const startAngle = midAngle - 9 * (Math.PI / 180); const endAngle = midAngle + 9 * (Math.PI / 180);` computes today.

- [ ] **Step 3: Update `DartboardInput.tsx` to import from the new module instead of its own copies**

In `components/organisms/DartboardInput.tsx`, remove the existing local `CENTER`, `annularWedgePath`, `RADIUS`, and `BOARD_ORDER` definitions, and add this import at the top of the file (after the existing `import { Throw } from '@/lib/types';` line):

```typescript
import { CENTER, RADIUS, BOARD_ORDER, annularWedgePath, segmentAngles } from '@/lib/dartboard-geometry';
```

Then, in the SVG rendering block, replace the inline angle computation:
```typescript
        {BOARD_ORDER.map((segment, i) => {
          const midAngle = (i * 18 - 90) * (Math.PI / 180);
          const startAngle = midAngle - 9 * (Math.PI / 180);
          const endAngle = midAngle + 9 * (Math.PI / 180);
```
with:
```typescript
        {BOARD_ORDER.map((segment, i) => {
          const { startAngle, endAngle, midAngle } = segmentAngles(i);
```

Everything else in the file (the keypad, modifier toggles, `throwSector`, `handleMiss`) stays exactly as it is — this task only changes where the geometry constants/functions come from, not any rendering or scoring logic. The file will still compile and render identically after this step; Task 3/4 are what actually change its visuals and add click-to-throw.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx vitest run lib/games/x01/engine.test.ts`
Expected: unaffected (this task touches no engine files).

If a dev server / headless browser is available, load the match page and visually confirm the dartboard renders identically to before this task (same colors, same segment positions, same heat shading) — this task should be a no-visible-change refactor.

- [ ] **Step 5: Commit**

```bash
git add lib/dartboard-geometry.ts components/organisms/DartboardInput.tsx
git commit -m "refactor(dartboard): extract shared geometry module"
```

---

### Task 3: `HeatmapBoard` component — neutral grey structure + blue/red heat overlay

**Files:**
- Create: `components/organisms/HeatmapBoard.tsx`

**Interfaces:**
- Consumes: `CENTER`, `RADIUS`, `BOARD_ORDER`, `annularWedgePath`, `segmentAngles` from `@/lib/dartboard-geometry` (Task 2); the `--heat-cold`/`--heat-mid`/`--heat-hot` CSS variables (Task 1).
- Produces: `HeatmapBoard({ heatmap }: { heatmap?: Record<string, number> })` — a purely decorative React component (no click handlers, no keypad) rendering the full dartboard SVG with a neutral grey structure and a heat-density overlay. Used by both `DartboardInput` (Task 4) and the post-match screen (Task 6).

This is a new, from-scratch visual: the board's own shape (double/treble rings, single bands, bulls) renders in shades of grey derived from the existing `chalk`/`oche` tokens via `color-mix()` — no new grey tokens needed. Layered on top, a second pass renders the heat itself: for any cell with hits, a color-mixed blue→yellow→red overlay whose opacity scales with relative hit density; cells with zero hits show no overlay at all, letting the plain grey structure show through.

- [ ] **Step 1: Create the component**

```typescript
// components/organisms/HeatmapBoard.tsx
import { CENTER, RADIUS, BOARD_ORDER, annularWedgePath, segmentAngles } from '@/lib/dartboard-geometry';

interface HeatmapBoardProps {
  /** Hit-frequency map (key: `${ring}${sector}`, e.g. "D20", "T19", "IB25"). Defaults to empty — a neutral board with no heat anywhere. */
  heatmap?: Record<string, number>;
}

/** Structural grey shades, derived from the existing chalk/oche tokens via color-mix — the board's shape stays legible without competing with the heat overlay for attention. */
const GREY = {
  ringBand: 'color-mix(in srgb, var(--chalk) 30%, var(--oche))', // double + treble rings
  singleBand: 'color-mix(in srgb, var(--chalk) 12%, var(--oche))', // both single bands
  outerBull: 'color-mix(in srgb, var(--chalk) 40%, var(--oche))',
  innerBull: 'color-mix(in srgb, var(--chalk) 55%, var(--oche))',
};

/** Interpolates a 3-stop blue -> yellow -> red heat color for a 0..1 density ratio. A naive 2-color blue-to-red blend produces a muddy purple in the middle, so this mixes blue->yellow for the first half and yellow->red for the second. */
function heatColor(ratio: number): string {
  if (ratio <= 0.5) {
    const pct = ratio * 200;
    return `color-mix(in srgb, var(--heat-mid) ${pct}%, var(--heat-cold))`;
  }
  const pct = (ratio - 0.5) * 200;
  return `color-mix(in srgb, var(--heat-hot) ${pct}%, var(--heat-mid))`;
}

/** Unhit cells (ratio 0) show no heat overlay at all (fully transparent, letting the grey structure show through); any hit at all becomes visibly tinted, scaling up to a strong, mostly-opaque color at the current match's peak. */
function heatOpacity(ratio: number): number {
  return ratio <= 0 ? 0 : 0.35 + ratio * 0.55;
}

export function HeatmapBoard({ heatmap = {} }: HeatmapBoardProps) {
  const maxHeat = Math.max(1, ...Object.values(heatmap));
  const ratioOf = (key: string) => (heatmap[key] ?? 0) / maxHeat;

  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-md aspect-square">
      <circle cx={CENTER} cy={CENTER} r={RADIUS.boardEdge} fill="var(--oche)" stroke="var(--chalk)" strokeWidth="1" />

      {BOARD_ORDER.map((segment, i) => {
        const { startAngle, endAngle, midAngle } = segmentAngles(i);
        const labelPoint = {
          x: CENTER + ((RADIUS.doubleInner + RADIUS.boardEdge) / 2) * Math.cos(midAngle),
          y: CENTER + ((RADIUS.doubleInner + RADIUS.boardEdge) / 2) * Math.sin(midAngle),
        };

        const doubleRatio = ratioOf(`D${segment}`);
        const outerSingleRatio = ratioOf(`S${segment}`);
        const trebleRatio = ratioOf(`T${segment}`);
        const innerSingleRatio = ratioOf(`S${segment}`);

        return (
          <g key={segment}>
            <path d={annularWedgePath(RADIUS.doubleInner, RADIUS.boardEdge, startAngle, endAngle)} fill={GREY.ringBand} stroke="var(--oche)" strokeWidth="2" />
            <path
              d={annularWedgePath(RADIUS.doubleInner, RADIUS.boardEdge, startAngle, endAngle)}
              style={{ fill: heatColor(doubleRatio), fillOpacity: heatOpacity(doubleRatio) }}
            />

            <path d={annularWedgePath(RADIUS.outerSingleInner, RADIUS.doubleInner, startAngle, endAngle)} fill={GREY.singleBand} stroke="var(--oche)" strokeWidth="2" />
            <path
              d={annularWedgePath(RADIUS.outerSingleInner, RADIUS.doubleInner, startAngle, endAngle)}
              style={{ fill: heatColor(outerSingleRatio), fillOpacity: heatOpacity(outerSingleRatio) }}
            />

            <path d={annularWedgePath(RADIUS.trebleInner, RADIUS.outerSingleInner, startAngle, endAngle)} fill={GREY.ringBand} stroke="var(--oche)" strokeWidth="2" />
            <path
              d={annularWedgePath(RADIUS.trebleInner, RADIUS.outerSingleInner, startAngle, endAngle)}
              style={{ fill: heatColor(trebleRatio), fillOpacity: heatOpacity(trebleRatio) }}
            />

            <path d={annularWedgePath(RADIUS.innerSingleInner, RADIUS.trebleInner, startAngle, endAngle)} fill={GREY.singleBand} stroke="var(--oche)" strokeWidth="2" />
            <path
              d={annularWedgePath(RADIUS.innerSingleInner, RADIUS.trebleInner, startAngle, endAngle)}
              style={{ fill: heatColor(innerSingleRatio), fillOpacity: heatOpacity(innerSingleRatio) }}
            />

            <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" className="text-xs fill-chalk" dy="0.3em">
              {segment}
            </text>
          </g>
        );
      })}

      <circle cx={CENTER} cy={CENTER} r={RADIUS.innerSingleInner} fill={GREY.outerBull} stroke="var(--oche)" strokeWidth="2" />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS.innerSingleInner}
        style={{ fill: heatColor(ratioOf('OB25')), fillOpacity: heatOpacity(ratioOf('OB25')) }}
      />

      <circle cx={CENTER} cy={CENTER} r={RADIUS.innerSingleInner * 0.4} fill={GREY.innerBull} stroke="var(--oche)" strokeWidth="2" />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS.innerSingleInner * 0.4}
        style={{ fill: heatColor(ratioOf('IB25')), fillOpacity: heatOpacity(ratioOf('IB25')) }}
      />
    </svg>
  );
}
```

Note on `style={{ fill: ... }}` vs a plain `fill="..."` JSX attribute: the heat overlay shapes use inline `style` (not the `fill` attribute) specifically because `color-mix()` needs to be parsed as a CSS value — this matches the same pattern already used elsewhere in this codebase for the match page's background glow (`style={{ backgroundImage: 'radial-gradient(... color-mix(...) ...)' }}`), which is already verified working. The plain grey structural shapes use the ordinary `fill="..."` attribute since those are just `var()` references, not functions, and that pattern is already proven throughout the existing `DartboardInput.tsx`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

If a dev server / headless browser is available: render `HeatmapBoard` with an empty heatmap (`{}`) and confirm via computed styles that every heat-overlay shape's `fill-opacity` is `0` (or very close to it) and the board reads as plain grey. Then render it with a heatmap like `{ D20: 5, T19: 2, S5: 1 }` and confirm: (a) the D20 double-ring wedge for segment 20 shows the strongest, most red-shifted color (since it has the highest count, ratio = 1.0); (b) the T19 treble-ring wedge for segment 19 shows a visibly weaker, more blue/yellow-shifted color (ratio = 2/5 = 0.4); (c) the S5 wedge shows the faintest visible tint (ratio = 1/5 = 0.2); (d) every other cell shows no heat at all (plain grey). Take a screenshot and confirm this visually — a heat map that "still looks grey" per the earlier user feedback is a failure of this task, not just a subjective nitpick; confirm the colors are genuinely visible and distinguishable at a glance, not requiring close inspection.

- [ ] **Step 3: Commit**

```bash
git add components/organisms/HeatmapBoard.tsx
git commit -m "feat(dartboard): add HeatmapBoard with neutral-grey structure and blue-to-red heat overlay"
```

---

### Task 4: Rewire `DartboardInput` to use `HeatmapBoard`, add click-to-throw

**Files:**
- Modify: `components/organisms/DartboardInput.tsx`

**Interfaces:**
- Consumes: `HeatmapBoard` (Task 3); `CENTER`, `RADIUS`, `BOARD_ORDER`, `annularWedgePath`, `segmentAngles` from `@/lib/dartboard-geometry` (Task 2, already imported as of Task 2's Step 3).
- Produces: no change to `DartboardInput`'s exported props (`onThrow`, `disabled`, `visitDartCount`, `heatmap` — unchanged) or to any consumer's usage. The visual board is now `HeatmapBoard`'s grey/heat rendering instead of the old green/red/grey gameplay-colored shading, and the whole board becomes clickable again, firing the same `onThrow` the keypad already does.

**Design (confirmed with the user):** clicking anywhere within a segment's full radial span (any of its double/single/treble sub-bands) scores that segment's number using the *current* DOUBLE/TRIPLE modifier toggle — exactly the same semantics as tapping that number on the keypad. The board is a second way to pick the *number*; the toggle still controls the *ring*, for both input paths equally. This means the click overlay needs only ONE clickable region per segment (spanning the full radius from the bull's edge out to the board's edge), not four separate per-band regions — clicking any point in a segment's wedge calls the exact same `throwSector(segment)` the keypad's number button already calls, with no new parameters.

- [ ] **Step 1: Replace the old inline SVG with `HeatmapBoard` plus a transparent click overlay**

Find the current rendering block in `components/organisms/DartboardInput.tsx` — everything from `{/* Decorative dartboard — visual reference only, not interactive */}` through the closing `</svg>` of that board (the whole SVG element, including its `circle`/`path`/`text` children). Replace that entire block with:

```typescript
      {/* Dartboard: HeatmapBoard renders the visual (grey structure + heat), a transparent
          overlay on top makes it clickable — an alternative to the keypad below, not a
          replacement for it. */}
      <div className="relative w-full max-w-md">
        <HeatmapBoard heatmap={heatmap} />
        <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full">
          {BOARD_ORDER.map((segment, i) => {
            const { startAngle, endAngle } = segmentAngles(i);
            return (
              <path
                key={segment}
                d={annularWedgePath(RADIUS.innerSingleInner, RADIUS.boardEdge, startAngle, endAngle)}
                fill="transparent"
                className={disabled ? '' : 'cursor-pointer'}
                onClick={() => throwSector(segment)}
              />
            );
          })}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS.innerSingleInner}
            fill="transparent"
            className={disabled ? '' : 'cursor-pointer'}
            onClick={() => throwSector(25)}
          />
        </svg>
      </div>
```

Add the import for `HeatmapBoard` at the top of the file, alongside the existing `@/lib/dartboard-geometry` import from Task 2:

```typescript
import { HeatmapBoard } from './HeatmapBoard';
```

Do not change `throwSector`, `handleMiss`, `toggleModifier`, the keypad grid, or the DOUBLE/TRIPLE/MISS row — this task only touches the board's own rendering block. `throwSector(segment)` already exists and already does the right thing (uses the current `modifier`, guards against triple-bull, resets the modifier after firing) — the click overlay calls it exactly the same way the keypad's number buttons already do, so scoring logic for board clicks and keypad taps is provably identical (same function, same call shape).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx vitest run lib/games/x01/engine.test.ts`
Expected: unaffected.

If a dev server / headless browser is available: load a live match and verify — (a) the board now renders via `HeatmapBoard` (grey structure, heat overlay after some throws) instead of the old green/red coloring; (b) clicking a segment's wedge (any band within it) fires a throw for that segment's number, using the current modifier toggle — click DOUBLE, then click segment 20's wedge, and confirm a `{sector: 20, ring: 'D', points: 40}` throw fires (check via the live score updating by 40, or via a temporary console log removed before committing); (c) clicking the center (bull) fires a bull throw respecting the toggle the same way the keypad's BULL button does, including the same triple-bull block (activate TRIPLE, click the bull, confirm nothing happens — no throw fires, state unchanged); (d) the keypad below still works exactly as before, unaffected by this change; (e) both input paths can be used interchangeably within the same visit (e.g. keypad for dart 1, board click for dart 2) with no state inconsistency.

- [ ] **Step 3: Commit**

```bash
git add components/organisms/DartboardInput.tsx
git commit -m "feat(dartboard): restore click-to-throw via HeatmapBoard overlay, alongside the keypad"
```

---

### Task 5: `matchStats` — single-match stats with a corrected checkout-rate formula

**Files:**
- Create: `lib/games/x01/matchStats.ts`
- Create: `lib/games/x01/matchStats.test.ts`
- Modify: `lib/games/x01/stats.ts` (export `EMPTY_X01_STATS`; add two new `statTiles` entries)
- Modify: `lib/types.ts` (add `matchStats` to `GameModule`)
- Modify: `lib/games/x01/index.ts` (wire `matchStats` into `X01Module`)

**Interfaces:**
- Consumes: `X01State` (specifically its `visitHistory: VisitHistoryEntry[]` field — entries have `playerId`, `throws`, `scoreBefore`, `scoreAfter`, `busted`, `wasCheckout`, `legNumberBefore`) from `./engine`; `X01Stats` type and a newly-exported `EMPTY_X01_STATS` constant from `./stats`.
- Produces: `matchStats(state: X01State, playerId: PlayerId, settings: X01Settings): X01Stats`, wired into `GameModule.matchStats: (state: TState, playerId: PlayerId, settings: TSettings) => GameStats`. Two additional entries appended to `statTiles` (`Highest checkout`, `Doubles %`).

**Why a new file, not a change to `computeStats`:** `computeStats` (in `stats.ts`) operates on the DB-persisted `Visit[]` type — the eventual input for real cross-match aggregate stats, once match/visit persistence exists (a later milestone, not this one). `matchStats` operates directly on `X01State.visitHistory`, which is already in memory the moment a match ends, needing no persistence at all. Keeping them as separate functions in separate files makes this scope boundary explicit and means neither one needs to change when the other's assumptions eventually do.

**Why the checkout-rate formula is being fixed here:** `computeStats`'s existing formula counts every bust as a checkout attempt, which is wrong — most busts have nothing to do with finishing (a bust at 380 remaining isn't a missed checkout). This was found during an earlier review and deliberately left unfixed because nothing displayed it yet; this task is the first time a user will actually see this number, so it gets the correct formula from the start: a visit counts as a checkout *attempt* if `scoreBefore <= 170` (the maximum a 3-dart visit can finish from, under any checkout mode), and as a *hit* if `wasCheckout` is true. This is a documented simplification (see the spec, section 3) — it doesn't know which specific darts were "going for it," only whether finishing was numerically reachable — but it's a correct, defensible proxy, unlike the current formula's outright wrong "every bust counts" behavior.

- [ ] **Step 1: Export `EMPTY_X01_STATS` from `stats.ts` and add the two new stat tiles**

In `lib/games/x01/stats.ts`, find:
```typescript
const EMPTY_STATS: X01Stats = {
```
Change `const EMPTY_STATS` to `export const EMPTY_X01_STATS` (rename, and export it), and update the one place inside `computeStats` that references it:
```typescript
  if (visits.length === 0) {
    return { ...EMPTY_STATS };
  }
```
to:
```typescript
  if (visits.length === 0) {
    return { ...EMPTY_X01_STATS };
  }
```

Then find the `statTiles` array's closing `];` and add two new entries before it, after the existing `Best leg` entry:
```typescript
  {
    label: 'Best leg',
    key: 'bestLeg',
    value: (stats) => (stats.bestLeg ? `${stats.bestLeg}` : '—'),
  },
  {
    label: 'Highest checkout',
    key: 'highestCheckout',
    value: (stats) => (stats.highestCheckout ? `${stats.highestCheckout}` : '—'),
  },
  {
    label: 'Doubles %',
    key: 'doublesRate',
    value: (stats) => `${stats.doublesRate.toFixed(0)}%`,
  },
];
```
(This means the file's existing `Best leg` entry, followed by these two new ones, followed by the closing `];` — the existing 4 tiles are unchanged, just two more appended.)

- [ ] **Step 2: Write the failing test for `matchStats`**

```typescript
// lib/games/x01/matchStats.test.ts
import { describe, it, expect } from 'vitest';
import { matchStats } from './matchStats';
import { init, applyThrow } from './engine';
import { createPlayerId } from '@/lib/types';
import { X01DefaultSettings } from './schema';

describe('matchStats', () => {
  const player1 = createPlayerId('p1');
  const player2 = createPlayerId('p2');

  it('returns empty stats for a player with no visits yet', () => {
    const state = init([player1, player2], X01DefaultSettings);
    const stats = matchStats(state, player1, X01DefaultSettings);
    expect(stats.avg3Dart).toBe(0);
    expect(stats.checkoutRate).toBe(0);
    expect(stats.bestLeg).toBe(null);
    expect(stats.highestCheckout).toBe(null);
  });

  it('counts a bust within checkout range as an attempt, but not a hit', () => {
    const settings = { ...X01DefaultSettings, checkOut: 'double' as const };
    const state = init([player1, player2], settings);
    state.playerScores[player1] = 50; // within the 170 checkout-attempt threshold
    const overshoot = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const }; // 50 - 60 < 0, busts
    const afterBust = applyThrow(state, overshoot, settings);

    const stats = matchStats(afterBust, player1, settings);
    expect(stats.checkoutRate).toBe(0); // 1 attempt (scoreBefore=50 <= 170), 0 hits -> 0%
  });

  it('does not count a normal visit with scoreBefore above the checkout threshold as an attempt', () => {
    const settings = { ...X01DefaultSettings, checkOut: 'double' as const };
    let state = init([player1, player2], settings);
    state.playerScores[player1] = 500; // scoreBefore well above the 170 threshold
    const throw1 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 0 as const };
    const throw2 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 1 as const };
    const throw3 = { sector: 20 as const, ring: 'T' as const, points: 60, order: 2 as const };
    state = applyThrow(state, throw1, settings);
    state = applyThrow(state, throw2, settings);
    state = applyThrow(state, throw3, settings); // 500 - 180 = 320, a normal non-bust, non-checkout visit

    const stats = matchStats(state, player1, settings);
    expect(stats.checkoutRate).toBe(0); // 0 attempts recorded (0/0 -> 0), not "every visit counts"
  });

  it('counts a successful checkout as both an attempt and a hit', () => {
    const settings = { ...X01DefaultSettings, checkOut: 'double' as const };
    const state = init([player1, player2], settings);
    state.playerScores[player1] = 40;
    const finishDart = { sector: 20 as const, ring: 'D' as const, points: 40, order: 0 as const };
    const afterCheckout = applyThrow(state, finishDart, settings);

    const stats = matchStats(afterCheckout, player1, settings);
    expect(stats.checkoutRate).toBe(100); // 1 attempt (scoreBefore=40 <= 170), 1 hit -> 100%
    expect(stats.highestCheckout).toBe(40);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run lib/games/x01/matchStats.test.ts`
Expected: FAIL — `matchStats` module does not exist yet.

- [ ] **Step 4: Implement `matchStats`**

```typescript
// lib/games/x01/matchStats.ts
import { PlayerId } from '@/lib/types';
import { X01State } from './engine';
import { X01Settings } from './schema';
import { X01Stats, EMPTY_X01_STATS } from './stats';

/** A visit counts as a checkout attempt if the score it started from was within reach of a
 * finish in one 3-dart visit under any checkout mode (max 170, e.g. T20 T20 D-bull). This is a
 * documented simplification — it can't know which darts were deliberately "going for it" — but
 * it correctly excludes ordinary busts far from finishing range, unlike counting every bust. */
function isCheckoutAttempt(scoreBefore: number): boolean {
  return scoreBefore <= 170;
}

export function matchStats(state: X01State, playerId: PlayerId, settings: X01Settings): X01Stats {
  const entries = state.visitHistory.filter((entry) => entry.playerId === playerId);

  if (entries.length === 0) {
    return { ...EMPTY_X01_STATS };
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

  const dartsInLeg = new Map<number, number>();

  entries.forEach((entry) => {
    const legKey = entry.legNumberBefore;

    entry.throws.forEach((t) => {
      totalPoints += t.points;
      totalDarts++;

      if (t.ring === 'T') {
        treblesHit++;
        trebleAttempts++;
      } else if (t.ring === 'D' || t.ring === 'IB') {
        doublesHit++;
        doublesAttempts++;
      }
    });

    const dartsThisLeg = (dartsInLeg.get(legKey) ?? 0) + entry.throws.length;
    dartsInLeg.set(legKey, dartsThisLeg);

    if (isCheckoutAttempt(entry.scoreBefore)) {
      checkoutAttempts++;
      if (entry.wasCheckout) checkoutHits++;
    }

    if (entry.wasCheckout) {
      highestCheckout = Math.max(highestCheckout, entry.scoreBefore);
      legsCompleted++;
      totalDartsInLegs += dartsThisLeg;
      bestLegDarts = Math.min(bestLegDarts, dartsThisLeg);
      dartsInLeg.delete(legKey);
    }
  });

  const allDarts = entries.flatMap((e) => e.throws);
  const firstNine = allDarts.slice(0, 9);

  const avg3Dart = totalDarts > 0 ? (totalPoints / totalDarts) * 3 : 0;
  const firstNineAvg =
    firstNine.length > 0 ? (firstNine.reduce((sum, t) => sum + t.points, 0) / firstNine.length) * 3 : 0;
  const checkoutRate = checkoutAttempts > 0 ? checkoutHits / checkoutAttempts : 0;
  const dartsPerLeg = legsCompleted > 0 ? totalDartsInLegs / legsCompleted : 0;
  const doublesRate = doublesAttempts > 0 ? doublesHit / doublesAttempts : 0;
  const treblesRate = trebleAttempts > 0 ? treblesHit / trebleAttempts : 0;

  return {
    avg3Dart: Math.round(avg3Dart * 10) / 10,
    firstNineAvg: Math.round(firstNineAvg * 10) / 10,
    checkoutRate: Math.round(checkoutRate * 1000) / 10,
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/games/x01/matchStats.test.ts`
Expected: PASS, all 4 tests.

- [ ] **Step 6: Add `matchStats` to the `GameModule` interface**

In `lib/types.ts`, find the `heatmap` method inside the `GameModule` interface:
```typescript
  /**
   * Hit-frequency map for a player's darts across the whole match so far, keyed as
   * `${ring}${sector}` (e.g. "D20", "T19", "IB25"). Used to render a heatmap.
   */
  heatmap: (state: TState, playerId: PlayerId) => Record<string, number>;
```
Add directly after it (still before `ScoreboardSlot`):
```typescript
  /**
   * Single-match statistics for a player, computed from in-memory match state (no persistence
   * required). Distinct from `computeStats`, which operates on persisted `Visit[]` records for
   * future cross-match aggregate stats.
   */
  matchStats: (state: TState, playerId: PlayerId, settings: TSettings) => GameStats;
```

- [ ] **Step 7: Wire `matchStats` into `X01Module`**

In `lib/games/x01/index.ts`, add the import:
```typescript
import { matchStats } from './matchStats';
```
(alongside the existing `import { computeStats, statTiles } from './stats';` line)

Then add `matchStats,` to the `X01Module` object literal, directly after `heatmap,`:
```typescript
  players,
  currentPlayer,
  visitProgress,
  matchInfo,
  visitHistory,
  heatmap,
  matchStats,
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx vitest run lib/games/x01/`
Expected: all tests pass — the existing 40 in `engine.test.ts`, plus the 4 new ones in `matchStats.test.ts` (44 total).

- [ ] **Step 9: Commit**

```bash
git add lib/games/x01/matchStats.ts lib/games/x01/matchStats.test.ts lib/games/x01/stats.ts lib/types.ts lib/games/x01/index.ts
git commit -m "feat(x01): add matchStats with corrected checkout-rate formula"
```

---

### Task 6: Post-match stats screen

**Files:**
- Create: `components/organisms/PostMatchStats.tsx`
- Modify: `app/(match)/match/[id]/page.tsx`

**Interfaces:**
- Consumes: `HeatmapBoard` (Task 3); `GameModule.matchStats`/`statTiles`/`heatmap`/`winner`/`players` (all already on the interface as of Task 5 and earlier work).
- Produces: `PostMatchStats({ gameModule, state, settings, players, winnerId })` — replaces the match page's small "Match Complete!" banner with a full stats view.

- [ ] **Step 1: Create `PostMatchStats`**

```typescript
// components/organisms/PostMatchStats.tsx
'use client';
import { GameModule, PlayerId } from '@/lib/types';
import { HeatmapBoard } from './HeatmapBoard';
import { Button } from '@/components/atoms/Button';

interface PostMatchStatsProps {
  gameModule: GameModule<any, any>;
  state: any;
  settings: any;
  players: PlayerId[];
  winnerId: PlayerId | null;
}

export function PostMatchStats({ gameModule, state, settings, players, winnerId }: PostMatchStatsProps) {
  return (
    <div className="rounded-2xl bg-slate p-4 border border-wire/40 flex flex-col gap-4">
      <p className="text-lg font-display font-bold text-center">Match Complete!</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((playerId) => {
          const stats = gameModule.matchStats(state, playerId, settings);
          const heatmap = gameModule.heatmap(state, playerId);
          const isWinner = playerId === winnerId;

          return (
            <div
              key={playerId}
              className={`rounded-2xl p-4 border-2 flex flex-col gap-3 ${
                isWinner ? 'border-wire bg-wire/10' : 'border-transparent bg-oche'
              }`}
            >
              <div className="text-sm font-bold uppercase tracking-widest text-sisal">
                {playerId}
                {isWinner ? ' — Winner' : ''}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {gameModule.statTiles.map((tile: { label: string; key: string; value: (s: any) => string | number }) => (
                  <div key={tile.key} className="text-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-sisal">{tile.label}</div>
                    <div className="text-xl font-display font-bold">{tile.value(stats)}</div>
                  </div>
                ))}
              </div>

              <HeatmapBoard heatmap={heatmap} />
            </div>
          );
        })}
      </div>

      <Button onClick={() => (window.location.href = '/')}>Back to Dashboard</Button>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the match page, replacing the old banner**

In `app/(match)/match/[id]/page.tsx`, add the import:
```typescript
import { PostMatchStats } from '@/components/organisms/PostMatchStats';
```

Find the "Match end" block:
```typescript
      {/* Match end */}
      {isComplete && (
        <div className="rounded-2xl bg-slate p-4 text-center border border-wire/40">
          <p className="text-lg font-display font-bold mb-2">Match Complete!</p>
          <p className="mb-4">Winner: {gameModule.winner(gameState)}</p>
          <Button onClick={() => (window.location.href = '/')}>Back to Dashboard</Button>
        </div>
      )}
```
Replace it with:
```typescript
      {/* Match end */}
      {isComplete && (
        <PostMatchStats
          gameModule={gameModule}
          state={gameState}
          settings={settings}
          players={players}
          winnerId={gameModule.winner(gameState)}
        />
      )}
```

Then hide the middle row (History/Dartboard/History) once the match is complete, since the post-match screen replaces it — find:
```typescript
      {/* Middle row: history / board+keypad / history */}
      <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.4fr_0.8fr] gap-3 flex-1">
```
and wrap that whole `<div>...</div>` block (everything through its matching closing `</div>`, which contains both `HistoryPanel`s and the `DartboardInput` wrapper) in a condition:
```typescript
      {/* Middle row: history / board+keypad / history */}
      {!isComplete && (
        <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.4fr_0.8fr] gap-3 flex-1">
          {leftPlayer && (
            <HistoryPanel
              playerId={leftPlayer}
              visits={gameModule.visitHistory(gameState, leftPlayer)}
              inProgress={leftPlayer === currentPlayerId ? visitProgress.throws : []}
            />
          )}

          <div className="flex flex-col items-center justify-center gap-4 w-full">
            <DartboardInput
              onThrow={handleThrow}
              disabled={isComplete}
              visitDartCount={visitProgress.darts}
              heatmap={currentPlayerHeatmap}
            />
          </div>

          {rightPlayer && (
            <HistoryPanel
              playerId={rightPlayer}
              visits={gameModule.visitHistory(gameState, rightPlayer)}
              inProgress={rightPlayer === currentPlayerId ? visitProgress.throws : []}
            />
          )}
        </div>
      )}
```
(This is the exact same JSX already there — only the wrapping `{!isComplete && ( ... )}` is new.)

Finally, hide the Undo button once complete (it has nothing left to undo) — find:
```typescript
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-display font-bold">{gameModule.name}</h1>
        <Button onClick={handleUndo} size="sm" variant="ghost">
          <Undo2 className="w-4 h-4 mr-1" /> Undo
        </Button>
      </header>
```
Replace with:
```typescript
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-display font-bold">{gameModule.name}</h1>
        {!isComplete && (
          <Button onClick={handleUndo} size="sm" variant="ghost">
            <Undo2 className="w-4 h-4 mr-1" /> Undo
          </Button>
        )}
      </header>
```

The `Button` import at the top of the file is already present (used by the old banner) — no import changes needed there. The top row (Score panels + leg info) is untouched by this task, per the spec.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx vitest run lib/games/x01/`
Expected: all 44 tests still pass (this task touches no engine/stats logic, only UI wiring).

If a dev server / headless browser is available: play a match to completion (drive it via the API/store directly if faster than clicking through a full match), and confirm: the History/board/keypad row disappears once the match ends; the Undo button disappears from the header; the `PostMatchStats` view appears in its place, showing both players' stat tiles (all 6, including the two new ones) and each player's heatmap; the winner's card has the gold border/tint; the "Back to Dashboard" button navigates to `/`. Take a screenshot and confirm the layout doesn't look broken (no overlapping text, legible contrast) — this is a design-sensitive task per this session's established bar of "does it look right," not just "does it compile."

- [ ] **Step 4: Commit**

```bash
git add components/organisms/PostMatchStats.tsx "app/(match)/match/[id]/page.tsx"
git commit -m "feat(match): add post-match stats screen with per-player heatmaps"
```

---

## Summary

Six tasks, in dependency order: heat-scale tokens → shared geometry extraction → `HeatmapBoard` (grey structure + blue/red heat) → `DartboardInput` rewired onto it with click-to-throw restored → `matchStats` with a corrected checkout-rate formula → the post-match screen tying it all together. Each task leaves the app in a working, testable state; the engine and its 40 tests are untouched throughout.
