You are working on my existing **Dart Tracker** application.

I am currently not happy with the app’s UI, visual hierarchy, or overall design language. I want you to approach this as a substantial product/UI redesign rather than a collection of small cosmetic improvements.

## Your task

First, inspect the existing application thoroughly so you understand:

- the current screens and navigation
- the application's core functionality
- the main user flows
- reusable components
- existing state/data architecture
- which functionality must remain intact

Then create a **new git branch dedicated to the redesign**. Do not implement this redesign directly on the current/main branch.

Choose an appropriate descriptive branch name such as:

`redesign/new-ui`

or something similarly clear.

## Design freedom

You have **complete creative freedom** to redesign the application's UI and visual language.

Do not feel constrained by the current:

- layouts
- component styling
- navigation presentation
- spacing
- colors
- typography
- cards
- dashboards
- screen composition

You may substantially restructure screens if it produces a better user experience.

The goal is not to make the current UI slightly prettier.

The goal is to create a **new, cohesive, polished version of the Dart Tracker UI** that feels intentionally designed.

## Design direction

The application should still clearly feel connected to **darts**.

Use the visual world of darts as inspiration, but avoid turning the interface into a gimmick.

Potential inspiration can come from:

- dartboards and their geometry
- scoring rings
- match-night / competition atmosphere
- scoreboards
- tournament graphics
- precision and targeting
- subtle references to doubles, triples, bullseye, checkout numbers, etc.

These ideas should influence the design language rather than simply adding dartboard graphics everywhere.

Aim for something that feels:

- modern
- premium
- focused
- sporty
- competitive
- clean
- highly usable

Think of it as a product someone who regularly plays darts would genuinely enjoy using.

## UX priorities

Prioritize the actions users perform most frequently.

The scoring/tracking experience should be extremely quick and obvious. During a game, users should not have to visually search for important information or navigate through unnecessary UI.

Pay particular attention to:

- current score
- remaining score
- current player
- turn/throw information
- score entry
- checkout information
- player comparison
- leg/set/match status
- clear primary actions

Information hierarchy is more important than decoration.

## Design system

Create a coherent design system for the redesigned application rather than styling each screen independently.

Establish consistent:

- typography
- spacing
- border radii
- surfaces
- backgrounds
- accent colors
- semantic colors
- buttons
- inputs
- cards
- navigation
- icons
- score displays
- interactive states

Avoid excessive visual noise and avoid making every piece of information a separate card.

Use whitespace, typography, grouping, and contrast to create hierarchy.

## Important constraints

Preserve the application's existing functionality unless there is a strong UX reason to change how that functionality is accessed.

Do not unnecessarily rewrite working application logic simply for the redesign.

Prefer separating presentation improvements from core business logic.

The redesigned app should remain maintainable and should reuse sensible components rather than accumulating one-off styling.

Make sure the UI works properly across the screen sizes currently supported by the application.

## Working approach

Before making major changes:

1. Inspect the existing project and understand the application's structure.
2. Identify the main user journeys and important screens.
3. Briefly formulate a visual/design direction for the redesign.
4. Create the redesign branch.
5. Establish the new design system/foundations.
6. Implement the new UI consistently across the application.
7. Run the application and visually inspect the result.
8. Fix inconsistencies, awkward spacing, overflow, broken states, or obviously unfinished areas.

Do not stop after redesigning only the first or most obvious screen. Treat the application as a complete product and make the experience feel cohesive.

## Decision making

You are explicitly encouraged to make design decisions yourself.

Do not preserve something simply because the old application did it that way.

If you see a clearly better approach to a screen, flow, navigation structure, or component, implement it.

At the same time, avoid arbitrary complexity. Every major design choice should improve usability, clarity, speed, or the overall coherence of the product.

## Definition of done

The task is complete when:

- the redesign exists on its own branch
- existing core functionality still works
- the app has a clearly new visual identity
- the visual language is consistently applied throughout the product
- the darts theme is recognizable but tasteful
- important gameplay/scoring information has strong hierarchy
- common interactions feel fast and obvious
- the UI feels intentionally designed rather than template-driven
- there are no obvious unfinished or legacy-styled areas
- the app has been run and visually reviewed after implementation

At the end, summarize:

- the design direction you chose
- the most important UX/UI changes
- major components or foundations you introduced
- any structural/navigation changes you made
- anything you intentionally chose not to change