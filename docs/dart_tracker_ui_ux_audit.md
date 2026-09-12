# Dart Tracker App — UI/UX Audit & Implementation Backlog

## Scope

This audit is based on the provided mobile screenshots covering:

- Account settings
- Profile overview
- Match summary
- Achievements
- Friends list
- Friend/player profile
- Match history
- Statistics / dartboard visualizations
- Game selection
- X01 match settings

The product already has a distinct visual identity: dark, darts-oriented, slightly industrial, with gold as the primary accent and red/green used for game-specific or result-specific meaning. The biggest opportunity is not a redesign; it is **tightening hierarchy, spacing, consistency, information density, and interaction clarity**.

---

# Executive Summary

## What is working well

1. **Strong visual identity**
   - The dark green/black palette is memorable and appropriate for a darts product.
   - Gold accents communicate premium/game-night character well.
   - Angular card corners and thin borders give the app a recognizable house style.

2. **Consistent bottom navigation**
   - The four main destinations are easy to understand.
   - Active state is usually visible through the gold accent.
   - Labels are clear and preferable to icon-only navigation.

3. **Good use of large typography**
   - Primary page titles and major metrics are easy to scan.
   - Match result labels (`WIN`, `LOSS`) are visually immediate.
   - Game names such as `X01`, `Cricket`, and `Copycat` stand out well.

4. **Useful statistical depth**
   - The app appears to track enough detail to feel serious rather than toy-like.
   - Match history, per-mode stats, achievements, and dartboard visualizations provide a strong foundation.

5. **Logical top-level IA**
   - Play / Friends / Stats / Account is a sensible mental model.
   - Game setup uses a staged flow (`Game → Settings → Review`), which is appropriate.

---

# Main UX Problems

## P0 — Fix first

### 1. Safe-area and system UI collisions

Several screenshots show content visually colliding with or sitting too close to the iOS status bar. On long statistical pages, the title/content appears behind or underneath the clock/system indicators.

**Why this matters**
- Makes the app feel unfinished.
- Can impair readability.
- Suggests layout is being positioned relative to viewport instead of safe-area insets.

**Action**
- Ensure every scrollable screen uses safe-area aware top padding.
- Navigation headers should never scroll under the status bar unless intentionally using a translucent collapsing header.
- Test with Dynamic Island/notch devices and multiple text sizes.

**Acceptance criteria**
- No title, chart, border, or tappable element intersects the iOS status bar.
- Minimum visual breathing room below the status bar is consistent across all screens.
- Scrolling content can pass beneath a fixed header only when the header is intentionally translucent and legible.

---

### 2. Bottom navigation overlaps content

The fixed bottom navigation covers lower content on multiple long pages. In screenshots, cards and statistics appear to continue behind the tab bar.

**Why this matters**
- Users may miss content.
- Last controls may become partially inaccessible.
- It creates uncertainty about whether scrolling is finished.

**Action**
- Add bottom content inset equal to tab bar height + safe-area inset.
- For scroll views, apply `contentInset` / padding rather than hardcoded spacer values.
- Confirm last card can be fully scrolled above the tab bar.

**Acceptance criteria**
- Last interactive element on every page can be fully displayed above the bottom navigation.
- No content is clipped behind the home indicator/tab bar area.

---

### 3. Information hierarchy is too flat

Many cards use similar border weight, typography scale, background tone, and spacing. This makes primary information compete with secondary information.

Examples:
- Profile summary cards
- Match summary metric boxes
- Match history entries
- Achievement cards
- Game-mode selection cards

**Why this matters**
- Users must work harder to determine what matters.
- The product feels visually dense even when content quantity is reasonable.

**Action**
Introduce a clearer hierarchy:
- **Level 1:** page title / dominant action / key match state
- **Level 2:** section title / selected mode
- **Level 3:** metric labels / metadata
- **Level 4:** tertiary notes / helper text

Reduce border intensity on secondary containers.

**Acceptance criteria**
- A user can identify the primary action or key metric within ~1 second.
- Secondary information is visually quieter than primary information.
- No screen has more than 2–3 equally dominant visual elements at once.

---

### 4. Excessive borders and box-within-box layout

A large portion of the UI is built from nested rectangular borders. This is especially visible in:
- Match summary
- Account settings
- X01 settings
- Game selection
- Friends
- Achievements

The result is a "wireframe that became production" feeling.

**Action**
- Remove borders where spacing and background contrast are sufficient.
- Use dividers selectively.
- Reserve the angular framed card treatment for meaningful grouped modules, not every field.
- Reduce nested containers.

**Acceptance criteria**
- At least 30–40% of non-interactive borders on major screens are removed or softened.
- Cards remain visually grouped through spacing/background, not only outlines.

---

# Layout & Spacing Audit

## 5. Spacing rhythm is inconsistent

There are several competing spacing values. Some headers are tightly packed while other areas have large empty vertical zones.

Examples:
- Profile header has strong spacing, but subsequent cards feel compressed.
- X01 settings page has a large dead zone below the buttons.
- Friends page has substantial empty content area while the input region is visually heavy.
- Match history entries are dense vertically compared with other card types.

**Recommendation**
Adopt a spacing system based on a small token scale, for example:

- `4` — micro spacing
- `8` — icon/label spacing
- `12` — compact component spacing
- `16` — standard content spacing
- `24` — section spacing
- `32` — major section spacing
- `48` — page-level separation

Avoid one-off values unless required by geometry.

**Acceptance criteria**
- All major screens use the same spacing tokens.
- Section spacing is larger than internal component spacing.
- Equivalent components use equivalent padding.

---

## 6. Horizontal alignment drifts

Text, headings, cards, and action links do not always share one consistent content column.

Examples:
- Section headings and card edges sometimes start at different x positions.
- Right-aligned links such as `Full statistics`, `Manage`, and `Show all achievements` use different apparent offsets.
- Metric cards sometimes align internally differently from adjacent cards.

**Action**
Define:
- One global page gutter.
- One card internal padding.
- One right-edge alignment for utility links.
- One baseline convention for icon + label pairs.

**Acceptance criteria**
- Page titles, sections, and cards snap to a common 8pt/4pt grid.
- Utility links align to the same right content boundary.
- Repeated components have identical internal padding.

---

## 7. Some screens waste vertical space

The X01 settings screen leaves a very large unused lower region. This may be acceptable on larger phones, but the composition feels top-heavy.

**Recommendation**
Consider one of:
- Vertically center the settings panel within the remaining usable area.
- Increase visual prominence of review/context.
- Add a compact summary of chosen game rules near the CTA.
- Keep the CTA docked closer to the bottom safe area if it is the main forward action.

Do not fill space merely for decoration.

---

# Typography

## 8. Too many typography treatments compete

The app uses:
- condensed display headings
- uppercase labels
- large numeric metrics
- mixed regular/bold UI text
- colored labels
- tab labels

The visual language is attractive, but there are too many simultaneous emphasis mechanisms.

**Recommendation**
Define explicit text roles:

- `Display / Page Title`
- `Section Heading`
- `Card Title`
- `Metric`
- `Body`
- `Label`
- `Metadata`
- `Button`

Use casing consistently:
- Reserve ALL CAPS for short labels/statuses.
- Avoid ALL CAPS for longer helper text.
- Avoid mixing title case and uppercase for equivalent controls.

---

## 9. Secondary text contrast is occasionally too low

Muted beige/gray text on dark green is visually on-brand, but some helper text approaches low contrast.

Potentially affected:
- game descriptions
- metadata
- inactive step labels
- secondary profile stats
- disabled controls

**Action**
Run WCAG contrast checks on:
- body text
- disabled states
- inactive tabs
- metadata labels

Target:
- 4.5:1 for normal text
- 3:1 for large text and essential graphical UI boundaries

Do not use opacity alone for disabled content if it becomes unreadable.

---

# Navigation & Interaction

## 10. Back navigation treatment is oversized

The square back button in Account Settings and Player Profile takes a large amount of visual space and feels detached from the page header.

**Problem**
It creates an extra visual row and pushes content downward.

**Recommendation**
Use a compact top app bar:
- back chevron
- page title / eyebrow
- optional trailing action

Keep touch target at least 44×44pt even if the visual icon is smaller.

---

## 11. Utility links need stronger affordance consistency

Examples:
- `Full statistics →`
- `Manage →`
- `Show all achievements`
- `View profile →`
- `Head-to-head ↗`

These are related patterns but use different wording and icon conventions.

**Recommendation**
Create one `TextLink` component with variants:
- navigation chevron `→`
- external/open detail icon only when semantically appropriate

Prefer consistent verbs:
- `View statistics`
- `View achievements`
- `Manage friends`
- `View profile`
- `View head-to-head`

---

## 12. Selected-state styling is sometimes too heavy

The active tab/option often receives a solid gold fill while other states are outlined. This works, but across dense screens the gold blocks become visually dominant.

Examples:
- All time
- All Games
- 501
- legs/sets choices

**Recommendation**
Use solid gold only for the highest-priority selected controls.
For lower-level segmented controls, consider:
- darker filled selected state + gold border
- gold underline
- gold label with subtle background

This preserves hierarchy.

---

## 13. Disabled states are ambiguous

On game setup, Step 3 (`Review`) and some buttons are visually dimmed, but the distinction between disabled, inactive, and unavailable could be clearer.

**Action**
Standardize state tokens:
- default
- pressed
- selected
- disabled
- focus (if web)
- error

Disabled state should retain legibility while clearly not being actionable.

---

# Screen-by-Screen Review

## Account Settings

### Strengths
- Clear distinction between profile details and account management.
- Primary action is obvious.
- Destructive `Sign out` is visually separated.

### Issues
- Email/account information is visually prominent despite low task frequency.
- `Save changes` looks enabled even when no change may have occurred.
- Card framing is very heavy.
- The large back control consumes vertical space.

### TODO
- Disable Save until data changes.
- Add save success feedback.
- Consider moving sign-out into a lower-priority account-actions section.
- Reduce borders around static account metadata.
- Never expose private account identifiers in shareable screenshots/debug previews.

---

## Profile / Account Home

### Strengths
- Good top-level summary.
- Match summary + achievements + friends is a sensible composition.
- `All time` default is understandable.

### Issues
- Logged-in identity card is visually too large relative to its utility.
- Match summary uses four bordered statistic cells inside a bordered card, creating excessive framing.
- Achievement cards are dense and visually similar.
- Friends section feels detached from the rest of the hierarchy.

### TODO
- Shrink identity header to a compact profile row.
- Convert four match stats to cleaner metric cells without full individual borders.
- Add more spacing before major sections.
- Consider a compact “Recent form” visualization if stats are a core value prop.

---

## Match History

### Strengths
- Result state is immediately scannable.
- Game type and opponent are easy to find.
- Filters are visible without opening another panel.

### Issues
- WIN/LOSS chips are too visually heavy relative to match title.
- Right-side metrics shift between `POINTS`, `3-DART AVG`, `MPR`, making scanning inconsistent.
- Entries have a lot of border geometry.
- There is no visible date grouping.
- Filter bar takes substantial vertical space.

### TODO
- Align result badge, game name, opponent/date, and key metric on a consistent grid.
- Use smaller result pills.
- Add date-group headers (`Today`, `Yesterday`, `Sep 7`) where useful.
- Consider horizontally scrollable filter chips instead of four full-width tabs.
- Normalize metric label/value alignment.

---

## Detailed Stats / Dartboard Charts

### Strengths
- The dartboard metaphor is domain-appropriate and memorable.
- The visual can provide spatial insight unavailable in a regular bar chart.

### Issues
- Charts are visually complex and not self-explanatory.
- Color meaning is unclear without a legend.
- Some segment fills are difficult to distinguish.
- The chart takes a lot of vertical space.
- “All throws” vs “Finishing throws” is clear semantically, but there is little guidance on interpretation.

### TODO
- Add compact legend.
- Add tap interaction for segment detail:
  - count
  - hit %
  - score contribution
- Provide an accessible table/list alternative.
- Ensure colors are not the sole carrier of meaning.
- Consider small summary callouts above the board:
  - favorite segment
  - miss bias
  - strongest double
- Keep board labels readable and outside clipping zones.

---

## Friend / Player Profile

### Strengths
- Strong concept: rival/player profile with head-to-head access.
- Per-mode breakdown is valuable.
- Friendship management is clearly separated at the bottom.

### Issues
- Friend identity is repeated multiple times.
- Head-to-head action is visually distant from the stats it relates to.
- Game-specific subsections feel long and may become cumbersome with more data.
- Destructive `Remove friend` is large and prominent.

### TODO
- Compress repeated identity elements.
- Place `Head-to-head` closer to match summary or convert to a segmented sub-view.
- Collapse game-mode details by default if profile grows.
- Move destructive relationship action behind a secondary menu or confirmation flow.

---

## Friends

### Strengths
- Very easy to understand.
- Friend code is prominent.
- Add-by-code workflow is direct.

### Issues
- Page becomes visually empty with only one friend.
- Friend-code card dominates the screen.
- Copy and Send use different button weights.
- Adding a friend by raw code is functional but not delightful.

### TODO
- Make friend code block more compact.
- Standardize button height and style.
- Add share action.
- Add QR code support if appropriate.
- Add search once friend count grows.
- Add empty-state and request/pending state designs.

---

## Game Selection

### Strengths
- Strongest screen visually.
- Game modes are easy to distinguish.
- Color coding between X01, Cricket, Copycat is effective.
- Local & solo selection is clear.

### Issues
- `House Rules` card competes with core game modes.
- Multiple decorative board graphics add visual noise.
- Game cards are tall, making the page feel heavier than needed.
- Color is doing a lot of semantic work.

### TODO
- Reduce decorative illustration opacity or frequency.
- Make game cards slightly more compact.
- Ensure selected/hover/pressed states do not rely on color only.
- Re-evaluate whether House Rules belongs above classic games or under a separate “Modes” area.

---

## X01 Match Settings

### Strengths
- Very understandable control structure.
- Stepper communicates process.
- Large options are touch-friendly.
- Primary CTA is obvious.

### Issues
- Too many full-border buttons.
- The layout feels like a desktop form scaled to mobile.
- Large unused space below content.
- `Back` and `Next` are equally large despite unequal importance.
- Step labels and settings labels create a lot of uppercase text.

### TODO
- Make `Next` primary and `Back` secondary/tertiary.
- Use segmented controls with tighter spacing.
- Reduce box density.
- Consider sticky bottom CTA.
- Add concise generated summary: `501 · First to 1 leg · No sets`.

---

# Design System TODOs

## Tokens

Create centralized tokens for:

```txt
color.background.primary
color.background.surface
color.background.elevated
color.border.default
color.border.subtle
color.text.primary
color.text.secondary
color.text.muted
color.accent.gold
color.success
color.danger
color.game.x01
color.game.cricket
color.game.copycat

space.1 = 4
space.2 = 8
space.3 = 12
space.4 = 16
space.5 = 24
space.6 = 32
space.7 = 48

radius/silhouette.card
stroke.card
height.button
height.segment
height.tabbar
gutter.page
```

If the angular cut-corner shape is part of the brand, make it a reusable component rather than reimplementing it per screen.

---

# Component Backlog

Build or normalize the following reusable components:

- `AppHeader`
- `BottomTabBar`
- `SectionHeader`
- `CutCornerCard`
- `MetricCell`
- `ResultBadge`
- `TextLink`
- `PrimaryButton`
- `SecondaryButton`
- `DangerButton`
- `SegmentedControl`
- `StepIndicator`
- `GameModeCard`
- `AchievementCard`
- `PlayerRow`
- `MatchHistoryRow`
- `EmptyState`
- `StatLabelValue`
- `DartboardChart`
- `ChartLegend`
- `InlineFeedback` / toast

Each component should own:
- spacing
- typography
- border treatment
- interaction states
- accessibility labels
- min touch target

---

# Accessibility Backlog

## P0
- Respect iOS safe areas.
- Minimum touch target: 44×44 pt.
- Verify text contrast.
- Support Dynamic Type without clipping.
- Ensure selected states are not communicated by color alone.
- Add semantic labels for charts and icons.

## P1
- Add reduced-motion behavior.
- Ensure focus order is logical if the app is also web/PWA.
- Add screen-reader summaries for:
  - match summary
  - achievements
  - dartboard stats
  - match history results

## Example chart accessibility text

> “All throws: 105 darts recorded. Most-hit region: 19. Finishing throws: strongest finishing region is 19 double/treble area.”

Use computed real values, not hardcoded text.

---

# Privacy / Sharing UX

The screenshots include account and social identifiers. Treat any screenshot/share/export path as privacy-sensitive.

## TODO
- Add a “privacy mode” for screenshots or shared stats.
- Hide:
  - email addresses
  - friend codes
  - internal IDs
- Consider replacing usernames with aliases when sharing match images.
- Add confirmation before copying sensitive friend/account codes where appropriate.

---

# UX Polish Backlog

## P1 — High impact

- Add loading/skeleton states for stats and profiles.
- Add empty states for:
  - no matches
  - no friends
  - no achievements
  - no finishing throws
- Add inline success/error feedback for:
  - friend request sent
  - profile saved
  - friend removed
  - code copied
- Add confirmation dialogs only for destructive or irreversible actions.
- Preserve filter selections when navigating back from detail screens.
- Remember last selected stats period where useful.

---

# Copy / Microcopy Improvements

Current copy is generally clear, but consistency can improve.

Suggested patterns:

| Current pattern | Better pattern |
|---|---|
| Full statistics | View statistics |
| Show all achievements | View all achievements |
| Manage | Manage friends |
| Their friend code | Enter friend code |
| Send | Add friend |
| Signed in as | Account |
| Currently logged in as | Playing as |
| Played | Matches |
| 1 W | 1-win streak |

Keep terminology identical across summary, history, profile, and detailed statistics.

---

# Proposed Priority Plan

## Sprint 1 — Layout correctness

- [ ] Fix top safe-area handling across all screens.
- [ ] Fix bottom navigation content inset.
- [ ] Establish global page gutter.
- [ ] Establish spacing tokens.
- [ ] Normalize button heights and touch targets.
- [ ] Remove obvious content clipping/overlap.
- [ ] Verify layouts on small and large iPhones.

## Sprint 2 — Visual hierarchy

- [ ] Reduce nested borders.
- [ ] Define typography roles.
- [ ] Normalize section headers.
- [ ] Normalize selected/disabled states.
- [ ] Reduce unnecessary gold fills.
- [ ] Standardize utility links.
- [ ] Rework profile identity card density.

## Sprint 3 — Core component refactor

- [ ] Build unified `MetricCell`.
- [ ] Build unified `MatchHistoryRow`.
- [ ] Build unified `GameModeCard`.
- [ ] Build unified `AchievementCard`.
- [ ] Build unified `SegmentedControl`.
- [ ] Build unified `AppHeader`.
- [ ] Build unified `BottomTabBar`.

## Sprint 4 — Stats usability

- [ ] Add dartboard chart legend.
- [ ] Add tap-to-inspect segments.
- [ ] Add chart text alternative.
- [ ] Add summary insights above charts.
- [ ] Normalize stat labels across game modes.
- [ ] Improve empty/no-data state.

## Sprint 5 — Friends / profile flows

- [ ] Compact friend-code area.
- [ ] Standardize Copy/Add/Share actions.
- [ ] Add friend request feedback.
- [ ] Improve head-to-head discoverability.
- [ ] De-emphasize destructive remove-friend action.
- [ ] Add pending/empty/search states.

## Sprint 6 — Accessibility & polish

- [ ] Dynamic Type audit.
- [ ] VoiceOver audit.
- [ ] Contrast audit.
- [ ] Reduced-motion support.
- [ ] Haptic consistency.
- [ ] Loading/skeleton states.
- [ ] Success/error toasts.
- [ ] Privacy mode for screenshots/sharing.

---

# AI Agent Execution Rules

When implementing any TODO from this document:

1. **Do not redesign the brand.**
   Preserve:
   - dark green/black base
   - warm gold accent
   - angular/cut-corner motif
   - darts-specific visual language

2. **Prefer simplification over addition.**
   Before adding a container, border, icon, or label, ask whether spacing or typography can solve the hierarchy instead.

3. **Use shared tokens/components.**
   Do not introduce one-off spacing, colors, or button styles.

4. **Protect safe areas.**
   Every new screen must account for:
   - top status bar/notch
   - bottom home indicator
   - fixed tab bar
   - keyboard

5. **Design states, not screenshots.**
   Every interactive component needs:
   - default
   - pressed
   - selected
   - disabled
   - loading where relevant
   - error where relevant

6. **Build for content growth.**
   Assume:
   - long usernames
   - 100+ friends
   - many achievements
   - many matches
   - localized strings
   - larger accessibility text

7. **Do not rely on color alone.**
   Result, selection, and game type must remain understandable in grayscale or for color-vision deficiencies.

8. **Verify every change at multiple widths.**
   Minimum:
   - small iPhone width
   - current target iPhone
   - large iPhone width

9. **Add acceptance criteria to every implementation PR/task.**
   A task is not done because it “looks better”; it is done when measurable layout and interaction requirements pass.

10. **Avoid exposing private user data.**
    Do not include real emails, friend codes, IDs, or account identifiers in fixtures, screenshots, logs, or test snapshots.

---

# Definition of Done for UI Tasks

A UI/UX task is complete only when:

- [ ] No overlap with status bar or bottom navigation.
- [ ] Touch targets are at least 44×44pt.
- [ ] Layout works with long text.
- [ ] Layout works with larger accessibility text.
- [ ] Colors meet contrast requirements.
- [ ] Interactive states are implemented.
- [ ] Component uses shared design tokens.
- [ ] No unnecessary hardcoded spacing.
- [ ] Screen has been checked at small/medium/large phone widths.
- [ ] No sensitive data appears in screenshots or fixtures.
- [ ] Visual regression snapshot has been updated if applicable.

---

# Suggested First Refactor

Start with **Profile → Match Summary** because it exposes the most repeated design patterns.

Refactor goals:

1. Replace four fully bordered metric boxes with a lighter metric grid.
2. Use one section-level card boundary, not five nested boundaries.
3. Tighten `All time / Monthly / Weekly / Daily` segmented control.
4. Standardize `View statistics` link.
5. Ensure bottom content can scroll fully above the tab bar.
6. Extract reusable:
   - `SectionHeader`
   - `SegmentedControl`
   - `MetricCell`

Once this is stable, reuse the same primitives in Friend Profile and Match History.

---

# Product-Level Observation

The app currently communicates **“feature-rich darts tracker”** successfully, but not yet **“effortless darts companion.”**

The next quality jump should come from:

- fewer visible containers
- stronger spacing rhythm
- clearer information priority
- better safe-area behavior
- more consistent interaction states
- simpler repeated components

The visual identity is already distinctive enough. The best next move is restraint and systemization rather than adding more visual treatment.
