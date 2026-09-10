# Responsive match review

This update focuses on the live scoring experience. Oche's existing cut-corner Panel component, square controls, typography, and color tokens remain the visual foundation.

## Findings addressed

- **Scoring controls below long content on phones.** The desktop grid previously stacked scoreboards, history, and a full dartboard before the keypad. Below 1024px, live play now uses a viewport-height layout with a separate scrolling score list and an input dock. Short landscape screens place the list beside the dock.
- **Too much permanently expanded history.** Each mobile player retains the game's scoreboard, including checkout hints and game-specific status. History and Cricket's detailed marks are expandable. Full match statistics remain in the stats sheet.
- **Unreachable controls and scrolling interference.** The dock stays in layout flow, safe-area padding protects controls, touch targets are at least 44px, and the list scrolls to the active player on turn changes.
- **Stats sheet accessibility.** A native modal dialog now isolates focus, restores focus to the opener, supports Escape, prevents background scrolling, and keeps closed controls out of keyboard navigation. Entry and exit transitions honor reduced-motion preferences.
- **Viewport configuration.** Moved deprecated metadata viewport configuration to Next.js's supported viewport export and restored pinch zoom.
- **Input feedback timer overlap.** Dartboard highlight timers cancel earlier highlights and clean up on unmount. The mobile keypad resets its multiplier on a player change and prevents triple bull entry.
- **Stale scoring test fixtures.** Multi-leg continuation tests depended on defaults that now end a match after one leg. Those scenarios now explicitly use first-to-three settings consistently during initialization and throws; production scoring rules are unchanged.

## Validation

- TypeScript: `npx tsc --noEmit` passed.
- Unit tests: `npx vitest run` — 176 passed across 19 files.
- Chromium checks at 320×568, 390×844, 430×932, 667×375, 768×1024, 844×390, and 1440×900: no horizontal page overflow; compact scoring dock remains in the viewport.
- Browser interaction checks: X01 live score preview, multiplier reset, triple-bull prevention, turn handoff, undo, stats dialog closure and focus restoration, and eight-player list scrolling.

Browser checks used local fixtures and mocked API responses. Real-device Safari safe-area behavior and live multi-device synchronization were not exercised. This is a responsive UI and interaction review, not a full backend/security audit.
