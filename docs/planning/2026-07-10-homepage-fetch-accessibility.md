# Homepage Fetch And Source-Link Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start the homepage’s independent API requests concurrently and give
featured-source links unique localized accessible names without changing
fallbacks, visible copy, or navigation.

**Architecture:** Keep the homepage as one server component. Gather the three
individually guarded API promises with `Promise.all`, then derive the existing
view data. Extend route-local home copy with one source-name label function and
apply it as `aria-label` to existing localized links.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Vitest, Testing Library,
axe.

## Global Constraints

- Preserve `fetchArchiveStats()`, `fetchSources()`, and
  `fetchChanges({ pageSize: 5 })` exactly.
- Keep `.catch(() => null)` on each request inside `Promise.all`; do not use one
  outer catch that discards successful responses.
- Preserve every statistics, source, and activity fallback.
- Preserve the featured-source six-card limit, visible link text, link href,
  card layout, and locale routing.
- Keep English and French accessible copy in `getHomeCopy()`.
- Do not add streaming, suspense, caching, retries, client state, or unrelated
  homepage refactors.

---

### Task 1: Implement Concurrent Fetching And Accessible Links Test-First

**Files:**

- Add: `frontend/tests/homepageData.test.tsx`
- Modify: `frontend/tests/a11y/home.a11y.test.tsx`
- Modify: `frontend/src/app/[locale]/page.tsx`
- Modify: `frontend/src/lib/homeCopy.ts`
- Modify: `frontend/src/components/home/FeaturedSources.tsx`

**Interfaces:**

- Consumes: existing homepage API functions and featured source summaries
- Produces: concurrently started guarded promises and
  `featuredSources.browseAriaLabel(sourceName)`

- [ ] **Step 1: Add a deferred-promise test helper and homepage API mocks**

Create `frontend/tests/homepageData.test.tsx`. Mock the same three API functions
as the existing homepage accessibility suite. Import those functions after the
hoisted mock, create `vi.mocked(...)` handles, and define a typed helper:

```tsx
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
```

Reset mocks before each test. Define complete typed fixtures using the actual
return contracts:

```tsx
const statsFixture: Awaited<ReturnType<typeof fetchArchiveStats>> = {
  snapshotsTotal: 321,
  pagesTotal: 123,
  sourcesTotal: 1,
  latestCaptureDate: "2026-07-09",
  latestCaptureAgeDays: 1,
};

const sourcesFixture: Awaited<ReturnType<typeof fetchSources>> = [
  {
    sourceCode: "parallel",
    sourceName: "Parallel Test Source",
    baseUrl: null,
    description: null,
    recordCount: 12,
    firstCapture: "2026-01-01",
    lastCapture: "2026-07-09",
    latestRecordId: 11,
    entryRecordId: null,
    entryBrowseUrl: null,
    entryPreviewUrl: null,
  },
];

const changesFixture: Awaited<ReturnType<typeof fetchChanges>> = {
  enabled: true,
  total: 0,
  page: 1,
  pageSize: 5,
  results: [],
};
```

- [ ] **Step 2: Add a failing concurrent-start test**

Create deferred values with generics derived from the mocked functions:

```tsx
const stats = deferred<Awaited<ReturnType<typeof fetchArchiveStats>>>();
const sources = deferred<Awaited<ReturnType<typeof fetchSources>>>();
const changes = deferred<Awaited<ReturnType<typeof fetchChanges>>>();
```

Return those promises from their mocks and start `HomePage()`. Use this concrete
cleanup sequence so even a `waitFor` failure settles every pending promise:

```tsx
const pagePromise = HomePage({ params: Promise.resolve({ locale: "en" }) });
let callCounts: number[] = [];

try {
  await waitFor(() => expect(mockFetchArchiveStats).toHaveBeenCalledTimes(1));
  callCounts = [
    mockFetchArchiveStats.mock.calls.length,
    mockFetchSources.mock.calls.length,
    mockFetchChanges.mock.calls.length,
  ];
} finally {
  stats.resolve(statsFixture);
  sources.resolve(sourcesFixture);
  changes.resolve(changesFixture);
  await pagePromise;
}

expect(callCounts).toEqual([1, 1, 1]);
```

Then assert:

```tsx
expect(mockFetchChanges).toHaveBeenCalledWith({ pageSize: 5 });
```

On current code, captured counts should be `[1, 0, 0]` because the first await
blocks later calls. The `finally` block must remain even if the test is later
refactored.

- [ ] **Step 3: Add an individual-failure-isolation regression test**

Resolve distinctive live statistics and a unique source named
`Parallel Test Source`, but reject only `fetchChanges`. Await and render the
page inside `<LocaleProvider locale="en">`.

Assert the live-statistics subtext and unique source name are present. Also
assert the exact change request argument. This test must continue to pass on
current serial code and on the selected implementation, and would fail if a
single outer `Promise.all(...).catch(...)` discarded all successful data.

- [ ] **Step 4: Extend the English/French accessibility fixtures**

In `frontend/tests/a11y/home.a11y.test.tsx`, make `fetchSources()` return one
complete source summary with source code `hc` and name `Health Canada`.

Wrap each rendered page with its matching route context:

```tsx
<LocaleProvider locale="en">{ui}</LocaleProvider>
```

and the corresponding French provider. This matches the production layout and
makes localized href assertions authoritative.

- [ ] **Step 5: Add failing link-contract assertions**

For English, assert:

```tsx
const link = screen.getByRole("link", { name: "Browse Health Canada" });
expect(link).toHaveTextContent("Browse →");
expect(link).toHaveAttribute("href", "/archive?source=hc");
```

For French, assert the accessible name `Parcourir Health Canada`, visible text
`Parcourir →`, and href `/fr/archive?source=hc`. Keep both existing axe checks.

- [ ] **Step 6: Prove the focused suites fail for intended reasons**

From `frontend/`:

```bash
npm test -- tests/homepageData.test.tsx tests/a11y/home.a11y.test.tsx
```

Expected: the concurrent-start count and source-specific accessible-name
assertions fail; existing fallback-isolation and axe assertions pass.

- [ ] **Step 7: Start all guarded API calls together**

Replace the three serial awaits with:

```tsx
const [stats, apiSources, recentChanges] = await Promise.all([
  fetchArchiveStats().catch(() => null),
  fetchSources().catch(() => null),
  fetchChanges({ pageSize: 5 }).catch(() => null),
]);
```

Move only the existing derived-value declarations as needed so they consume
these resolved variables. Do not change arguments, catch boundaries, fallback
values, or activity mapping.

- [ ] **Step 8: Add localized accessible-name copy**

Extend `HomeCopy.featuredSources` with:

```tsx
browseAriaLabel: (sourceName: string) => string;
```

Implement:

```tsx
browseAriaLabel: (sourceName) => `Browse ${sourceName}`,
```

for English and:

```tsx
browseAriaLabel: (sourceName) => `Parcourir ${sourceName}`,
```

for French.

- [ ] **Step 9: Apply the accessible label without changing link content**

On each featured-source `LocalizedLink`, add:

```tsx
aria-label={copy.featuredSources.browseAriaLabel(source.sourceName)}
```

Keep its child text, href, classes, and surrounding card unchanged.

- [ ] **Step 10: Prove the focused suites pass**

Run the Step 6 command.

Expected: the new data suite and both axe-rendered locale cases pass.

- [ ] **Step 11: Run focused static checks**

```bash
npx prettier --check \
  'src/app/[locale]/page.tsx' \
  src/components/home/FeaturedSources.tsx \
  src/lib/homeCopy.ts \
  tests/homepageData.test.tsx \
  tests/a11y/home.a11y.test.tsx
npx eslint --max-warnings=0 \
  'src/app/[locale]/page.tsx' \
  src/components/home/FeaturedSources.tsx \
  src/lib/homeCopy.ts \
  tests/homepageData.test.tsx \
  tests/a11y/home.a11y.test.tsx
npx tsc --noEmit
git diff --check
```

- [ ] **Step 12: Commit behavior and tests**

Return to the repository root before staging:

```bash
cd ..
git add frontend/src/app/[locale]/page.tsx \
  frontend/src/components/home/FeaturedSources.tsx \
  frontend/src/lib/homeCopy.ts \
  frontend/tests/homepageData.test.tsx \
  frontend/tests/a11y/home.a11y.test.tsx
git commit -m "feat: improve homepage fetch and source links"
```

### Task 2: Close The Confirmed Homepage Findings

**Files:**

- Modify: `frontend/HOMEPAGE_ANALYSIS.md`
- Modify: `frontend/docs/implementation-guide.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive: `docs/planning/2026-07-10-homepage-fetch-accessibility.md`

**Interfaces:**

- Consumes: the completed homepage data/link contract
- Produces: accurate analysis, canonical behavior documentation, and an
  archived implementation record

- [ ] **Step 1: Reconcile only the scoped analysis entries**

In `frontend/HOMEPAGE_ANALYSIS.md`:

- mark F4 and top priority 1 complete, describing concurrent guarded requests;
- mark E8 and top priority 3 complete, describing unique localized accessible
  names with unchanged visible text;
- correct B7, F7, and top priority 2 to “already good,” accurately recording
  that `FeaturedSources` already uses `slice(0, 6)`.

Leave every other analysis entry unchanged.

- [ ] **Step 2: Update the canonical implementation guide**

In section 8.1, document that the homepage:

- starts stats, sources, and recent-change requests concurrently with
  independent failure fallbacks;
- keeps featured-source visible Browse text while exposing source-specific
  English/French accessible names.

- [ ] **Step 3: Run frontend validation**

From `frontend/`:

```bash
npm test -- tests/homepageData.test.tsx tests/a11y/home.a11y.test.tsx
npm run check
```

- [ ] **Step 4: Run monorepo and docs parity**

From the repository root, after creating the documented local environment with
`make venv` when needed:

```bash
make contract-check
make frontend-ci
make docs-coverage-strict
make docs-build-strict
make prepush
git diff --check
```

- [ ] **Step 5: Perform localized runtime QA**

Inspect `/` and `/fr` at 320px and a desktop width against controlled API data.
Confirm all three API-backed sections render, visible Browse/Parcourir copy and
destinations are unchanged, source links expose unique accessible names, and no
horizontal overflow appears. Focused deferred tests remain authoritative for
concurrent invocation and partial request failure.

- [ ] **Step 6: Archive the plan and update indexes**

Replace this active plan with a 40–80-line implemented summary at
`docs/planning/implemented/2026-07-10-homepage-fetch-accessibility.md`. Remove
it from the active-plan list and add it to both implemented-plan indexes.

- [ ] **Step 7: Commit the documentation closeout**

```bash
git add -A -- \
  docs/planning/2026-07-10-homepage-fetch-accessibility.md \
  docs/planning/implemented/2026-07-10-homepage-fetch-accessibility.md \
  docs/planning/README.md \
  docs/planning/implemented/README.md \
  frontend/HOMEPAGE_ANALYSIS.md \
  frontend/docs/implementation-guide.md
git commit -m "docs: close homepage fetch accessibility"
```

## Final Verification

After both task reviews are clean, rerun the focused homepage suites, contract
check, frontend parity/build, strict docs checks, pre-push gate, `git diff
--check`, and a clean-worktree check at exact HEAD. Generate a whole-branch
review package for `origin/main..HEAD`, address findings through the review
workflow, then push and open a ready PR. Wait for all hosted checks and leave
the PR unmerged.
