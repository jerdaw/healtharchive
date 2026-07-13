# Homepage Fetch And Source-Link Accessibility Design

**Date:** 2026-07-10

## Context

The homepage analysis ranks two small, evidence-backed gaps among its highest
remaining priorities:

- archive statistics, sources, and recent changes are fetched serially even
  though none depends on another;
- every featured-source card exposes the same “Browse →” / “Parcourir →” link
  name, which is ambiguous when assistive technology presents links out of
  context.

Current code also disproves the adjacent B7 grid finding: featured sources are
already limited to six, not five, so the documented 3+2 card concern should no
longer remain selectable work.

## Goal

Reduce avoidable homepage server latency and make each featured-source link
uniquely identifiable in English and French without changing data, fallback,
navigation, or visible-card behavior.

## Non-goals

- Changing API endpoints, request parameters, caching, or demo fallbacks.
- Adding client-side loading, streaming, suspense, or retries.
- Changing source-card count, grid layout, visible link text, or destinations.
- Localizing source names returned by the existing homepage source request.
- Refactoring unrelated homepage sections, copy, or animations.
- Reconciling stale homepage-analysis findings other than the linked B7/F7
  five-card claim, F4, and E8.

## Approaches Considered

### 1. Parallel data start plus source-specific accessible names (selected)

Start all three independent API promises together with `Promise.all`, retaining
an individual `.catch(() => null)` on each request. Add a route-copy function
that produces a source-specific accessible link name while preserving the
existing visible “Browse →” / “Parcourir →” text.

These are the two highest confirmed homepage gaps. Together they form a small
homepage-quality batch with focused server-data and accessibility tests.

### 2. Parallelize requests only

This is viable, but leaves the adjacent high-priority accessibility defect even
though it requires only a localized label and focused assertion.

### 3. Add streaming or a shared fetch abstraction

Streaming could alter rendering and loading behavior, while a shared abstraction
would add indirection for three route-local calls. Neither is needed to remove
the serial wait.

## Data-Fetch Contract

Create the three guarded promises in one `Promise.all` expression:

- `fetchArchiveStats().catch(() => null)`;
- `fetchSources().catch(() => null)`;
- `fetchChanges({ pageSize: 5 }).catch(() => null)`.

All requests must be invoked before the component waits for any result. Existing
derivation remains unchanged after resolution:

- missing statistics use demo record/page counts and the existing source-count
  fallback;
- missing sources use `getSourcesSummary()`;
- missing changes produce no recent activity items.

The rejected promise for one endpoint must not reject the whole group because
each request retains its own catch boundary.

## Accessible-Link Contract

Keep visible card copy unchanged. Add `browseAriaLabel(sourceName)` to the
existing `featuredSources` copy contract:

- English: `Browse {sourceName}`;
- French: `Parcourir {sourceName}`.

Each featured-source link receives that value through `aria-label`. The source
name is already visible in the same card, and the localized accessible name
makes repeated links distinguishable in a screen-reader link list.

The destination remains `/archive?source={sourceCode}` and continues to pass
through `LocalizedLink`.

## Test Strategy

Add a focused server-component data test using three unresolved deferred
promises. Capture API mock call counts before resolving any promise; the test
passes only when all three calls have started. Capture the counts first, then
resolve every deferred promise and await the page promise before asserting so a
failing RED run cannot leave pending work. Use a `finally` cleanup guard if an
unexpected error can otherwise strand a deferred promise.

The focused data suite must also:

- assert `fetchChanges` receives exactly `{ pageSize: 5 }`;
- reject only the changes request while returning distinctive successful
  statistics and sources, then render the result and prove those successful
  values remain in use. This prevents an outer catch around `Promise.all` from
  silently discarding every response when one endpoint fails.

Extend existing English and French homepage accessibility tests with one
featured source and assert the uniquely localized accessible link names. Also
assert the existing visible “Browse →” / “Parcourir →” text and localized
`/archive?source=...` destinations remain unchanged. Keep the existing axe
assertions as regression coverage.

The branch will also run focused tests, frontend format/lint/type/full tests and
production build, contract parity, strict docs checks, and the repository
pre-push gate. Browser QA will inspect English and French at narrow and desktop
widths, confirming visible labels/destinations remain unchanged and links have
distinct accessible names without layout overflow.

## Documentation Closeout

In `frontend/HOMEPAGE_ANALYSIS.md`:

- mark F4 and top priority 1 complete after request parallelization;
- mark E8 and top priority 3 complete after accessible-name coverage;
- correct B7, F7, and top priority 2 to “already good” because current code
  already uses `slice(0, 6)`.

Do not change other analysis findings. Update the implementation guide, archive
the implementation plan, and update both planning-directory indexes so
completed work is not selected again.

## Risk And Rollback

The main risks are accidentally moving the catch boundary around `Promise.all`,
changing a request argument, or replacing rather than supplementing visible
link text. Focused tests cover concurrent invocation and accessible names; the
existing homepage accessibility suite covers the rendered page. Rollback is
limited to the homepage route, home copy, featured-source component, focused
tests, and documentation.
