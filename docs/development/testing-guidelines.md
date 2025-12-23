# Testing guidelines (frontend)

This document describes expectations and conventions for tests in the
HealthArchive frontend (`healtharchive-frontend`).

Goals:

- Catch regressions in routing, localization, metadata/SEO, and safety posture.
- Keep tests fast, deterministic, and low-maintenance.
- Make it easy to add a test when fixing a bug or adding a feature.

## What we test (priority order)

1. **Bilingual/i18n invariants**
   - Locale routing works (English canonical; French under `/fr`).
   - Language switch preserves path + query string.
   - French indexing posture stays correct while alpha (`noindex`).
   - No forbidden references leak into shipped content.
2. **Page-level behavior**
   - Route components render and show essential copy/CTAs/disclaimers.
   - Dynamic routes (`/snapshot/[id]`, `/browse/[id]`) behave under both locales.
3. **User workflows**
   - Search/filter/sort/pagination behaviors on archive/browse pages.
   - Copy/cite/download flows.
4. **Metadata**
   - Every page exports `generateMetadata`.
   - `hreflang` alternates and localized titles/descriptions are present.
5. **Accessibility and basic UX**
   - Critical ARIA labels exist and interactions remain keyboard-usable.

## What we generally avoid

- **Real network calls** (tests must not depend on a running backend).
- **Brittle snapshot tests** of large DOM trees; prefer explicit assertions.
- **Testing implementation details** (private helper internals, CSS class lists)
  unless the class is the API (e.g., `.ha-*` components) and changes would be a
  breaking design regression.

## Test stack and structure

- Runner: `vitest`
- Rendering: React Testing Library (see existing tests in `tests/`)
- Test files live in `tests/` and should follow the existing naming style:
  `feature.test.tsx` or `feature.test.ts`

Conventions:

- Prefer **one “behavior” per test**.
- Keep tests **small and local**; avoid shared global fixtures unless it reduces
  duplication significantly.
- When a bug is fixed, add a regression test that would have failed before the
  fix.

## Testing Next.js App Router routes

Many route components are async server components. The standard pattern is:

```ts
const ui = await Page({ params: Promise.resolve({ locale: "en" }) });
render(ui);
```

Notes:

- Route `params` and `searchParams` are promises in this codebase; keep tests
  consistent with that.
- Prefer testing the route component for routing/locale behavior rather than
  only testing helpers.

## Mocking API calls

- Prefer mocking `fetch` at the test boundary rather than patching internal
  implementation details.
- Assert on:
  - request URL + query params
  - error handling behavior (empty states, retry hints)
  - parsing/validation expectations

Avoid:

- Using real environment variables in tests beyond what’s needed for the unit
  under test.

## i18n and copy in tests

- For bilingual UI, add at least one FR test when introducing new user-visible
  copy or a new route.
- Prefer asserting on **meaningful strings** (headings, primary CTA, legal
  notices) rather than incidental microcopy.
- When copy changes intentionally, update tests alongside the copy change.

## Metadata/SEO tests

Use invariants to keep maintenance low:

- Ensure every `page.tsx` exports `generateMetadata` (coverage-style test).
- Ensure a small set of representative pages produce correct localized metadata
  and `hreflang`.

Avoid trying to parse the full rendered `<head>` unless needed for a regression.

## Test quality checklist (before merging)

- `npm run check` passes locally.
- Tests are deterministic (no timers, network, locale drift).
- New behavior has a test that would fail if the behavior regressed.
- Any new invariants are implemented as narrow, readable tests.

## When to add e2e tests

This repo currently emphasizes unit/integration-style tests. Consider adding a
small Playwright suite only if we repeatedly miss regressions that require a
real browser (e.g., navigation edge cases, snapshot viewer sandboxing, or
proxy behavior).
