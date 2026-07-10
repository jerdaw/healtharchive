# Browse-by-Source Orientation And Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a localized source-count summary, named article landmarks, and
an explicit empty state to `/archive/browse-by-source` while preserving its
backend-first, demo-fallback behavior.

**Architecture:** Extend the existing page-local copy object and render branch
without adding a component or client state. Use the visible source heading as
each article's accessible name and the shared `formatNumber()` helper for both
source and snapshot totals.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4, Vitest,
Testing Library.

## Global Constraints

- Preserve backend-first source loading and demo fallback on API failure.
- Treat a successful empty backend result as empty, not as an API failure.
- Keep source sorting, filtering, preview images, and CTA destinations intact.
- Add English and French copy together in `getBrowseBySourceCopy()`.
- Use `aria-labelledby` with the visible source heading; do not duplicate the
  source name in `aria-label`.
- Use `formatNumber(locale, value)` for displayed source and snapshot counts.
- Do not add client state, live regions, routes, API calls, or global styles.

---

### Task 1: Define The Orientation And Empty-State Contract Test-First

**Files:**

- Modify: `frontend/tests/browse-by-source.test.tsx`
- Modify: `frontend/src/app/[locale]/archive/browse-by-source/page.tsx`

**Interfaces:**

- Consumes: `fetchSources()`, `fetchSourcesLocalized()`, existing source
  summary objects, `formatDate()`, `formatNumber()`
- Produces: localized `sourceSummary(formattedCount, count)`, `emptyTitle`,
  and `emptyBody` copy; article/heading `aria-labelledby` contract

- [ ] **Step 1: Extend the API mock for localized tests**

Add `fetchSourcesLocalized: vi.fn()` to the `@/lib/api` mock. Import it with
`fetchSources`, and define:

```tsx
const mockFetchSourcesLocalized = vi.mocked(fetchSourcesLocalized);
```

- [ ] **Step 2: Write failing backend orientation assertions**

In the existing backend-summary test, change `recordCount` to `1234` and add:

```tsx
expect(screen.getByText("Showing 1 source.")).toBeInTheDocument();
expect(screen.getByRole("article", { name: "PHAC" })).toBeInTheDocument();
expect(screen.getByText(/1,234 snapshots captured/)).toBeInTheDocument();
```

- [ ] **Step 3: Write failing filtered-empty and French-copy tests**

Add an English test whose backend result contains only a complete source
summary with `sourceCode: "test"`:

```tsx
mockFetchSources.mockResolvedValue([
  {
    sourceCode: "test",
    sourceName: "Test source",
    baseUrl: null,
    description: null,
    recordCount: 0,
    firstCapture: "2024-01-01",
    lastCapture: "2024-01-01",
    latestRecordId: null,
    entryRecordId: null,
    entryBrowseUrl: null,
    entryPreviewUrl: null,
  },
]);
```

Assert:

```tsx
expect(screen.getByText("Showing 0 sources.")).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "No sources available" })).toBeInTheDocument();
expect(screen.queryAllByRole("article")).toHaveLength(0);
```

Add a French test with `mockFetchSourcesLocalized.mockResolvedValue([])` and
assert:

```tsx
expect(screen.getByText("Affichage de 0 sources.")).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "Aucune source disponible" })).toBeInTheDocument();
```

In the existing API-failure test, also assert that the retained demo data
renders a source-count sentence:

```tsx
expect(screen.getByText(/Showing [1-9][0-9]* sources?\./)).toBeInTheDocument();
expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
```

- [ ] **Step 4: Prove the focused tests fail for the intended reasons**

Run from `frontend/`:

```bash
npm test -- tests/browse-by-source.test.tsx
```

Expected: FAIL because the source summary, empty state, and named article
landmark do not exist yet.

- [ ] **Step 5: Extend the page-local bilingual copy**

Add these properties to both branches of `getBrowseBySourceCopy()`:

```tsx
sourceSummary: (formattedCount: string, count: number) =>
  `Showing ${formattedCount} source${count === 1 ? "" : "s"}.`,
emptyTitle: "No sources available",
emptyBody: "No archive sources are available in this view yet.",
```

```tsx
sourceSummary: (formattedCount: string, count: number) =>
  `Affichage de ${formattedCount} source${count === 1 ? "" : "s"}.`,
emptyTitle: "Aucune source disponible",
emptyBody: "Aucune source d’archive n’est encore disponible dans cette vue.",
```

- [ ] **Step 6: Render the count and explicit empty branch**

Import `formatNumber` alongside `formatDate`, remove the now-unused
`localeToLanguageTag` import, and render before the grid:

```tsx
<p className="text-ha-muted mb-4 text-sm">
  {copy.sourceSummary(formatNumber(locale, summaries.length), summaries.length)}
</p>
```

Render the empty callout before the grid:

```tsx
{summaries.length === 0 && (
  <div className="ha-callout">
    <h2 className="ha-callout-title">{copy.emptyTitle}</h2>
    <p className="mt-2 text-xs leading-relaxed sm:text-sm">{copy.emptyBody}</p>
  </div>
)}
```

Wrap the existing grid without changing its map body. Replace its opening with:

```tsx
{summaries.length > 0 && (
  <div className="ha-grid-2">
```

and replace its final closing tag with:

```tsx
  </div>
)}
```

- [ ] **Step 7: Name each article from its visible heading**

Inside `summaries.map`, define:

```tsx
const sourceHeadingId = `source-${source.sourceCode}-title`;
```

Apply it to the card:

```tsx
<article
  key={source.sourceCode}
  aria-labelledby={sourceHeadingId}
  className="ha-card ha-card-elevated overflow-hidden p-0"
>
  <h2 id={sourceHeadingId} className="text-sm font-semibold text-slate-900">
    {source.sourceName}
  </h2>
</article>
```

- [ ] **Step 8: Use the shared formatter for card counts**

Replace both inline `new Intl.NumberFormat(...).format(source.recordCount)`
expressions with:

```tsx
formatNumber(locale, source.recordCount)
```

- [ ] **Step 9: Prove the focused tests pass**

Run the Step 4 command.

Expected: 5 tests pass.

- [ ] **Step 10: Run focused static checks**

```bash
npx prettier --check 'src/app/[locale]/archive/browse-by-source/page.tsx' tests/browse-by-source.test.tsx
npx eslint --max-warnings=0 'src/app/[locale]/archive/browse-by-source/page.tsx' tests/browse-by-source.test.tsx
npx tsc --noEmit
git diff --check
```

- [ ] **Step 11: Commit the behavior and tests**

```bash
git add frontend/src/app/[locale]/archive/browse-by-source/page.tsx \
  frontend/tests/browse-by-source.test.tsx
git commit -m "feat: orient browse-by-source results"
```

### Task 2: Close The Documented Findings

**Files:**

- Modify: `frontend/FEATURE_PAGES_ANALYSIS.md`
- Modify: `frontend/docs/implementation-guide.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive: `docs/planning/2026-07-10-browse-by-source-orientation.md`

**Interfaces:**

- Consumes: the completed source-list rendering contract
- Produces: canonical behavior documentation and an archived implementation
  record

- [ ] **Step 1: Mark the feature-analysis items complete**

Update browse-by-source observations 8, 13, and 15 to `✅`, describing the
implemented shared formatter, named articles, source summary, and empty state.
Mark top improvements 1 through 3 as implemented on 2026-07-10 while leaving
CTA hierarchy and French snapshot-count helper work open.

- [ ] **Step 2: Update the canonical implementation guide**

In section 8.3, document that the page:

- displays a localized source total before the grid;
- names each article landmark from its visible heading;
- renders an explicit localized callout when no public sources remain;
- uses demo data only when the API fails, not for a successful empty result.

- [ ] **Step 3: Run frontend validation**

From `frontend/`:

```bash
npm test -- tests/browse-by-source.test.tsx
npm run check
```

Expected: formatting, lint, typecheck, all frontend tests, and production build
pass.

- [ ] **Step 4: Run monorepo and docs parity**

From the repository root, using the existing root backend venv if needed:

```bash
make contract-sync
make frontend-ci
make docs-coverage-strict
make docs-build-strict
git diff --check
```

- [ ] **Step 5: Perform localized browser QA**

Inspect `/archive/browse-by-source` and `/fr/archive/browse-by-source` at 320px
and a desktop width. Confirm the source summary is readable, cards retain their
layout, visible headings match article accessible names, and no horizontal
overflow appears. Component tests provide the empty-state branch evidence.

- [ ] **Step 6: Archive the plan and update indexes**

Move this plan to
`docs/planning/implemented/2026-07-10-browse-by-source-orientation.md`, compress
it to the implemented-plan summary format, remove it from active plans, and add
it to both implemented-plan indexes.

- [ ] **Step 7: Commit the closeout**

```bash
git add frontend/FEATURE_PAGES_ANALYSIS.md frontend/docs/implementation-guide.md \
  docs/planning/README.md docs/planning/implemented/README.md \
  docs/planning/2026-07-10-browse-by-source-orientation.md \
  docs/planning/implemented/2026-07-10-browse-by-source-orientation.md
git commit -m "docs: close browse-by-source orientation follow-up"
```

### Task 3: Verify And Prepare Review

- [ ] **Step 1: Run exact-HEAD validation**

```bash
npm --prefix frontend test -- tests/browse-by-source.test.tsx
make contract-check
make frontend-ci
make docs-coverage-strict
make docs-build-strict
make prepush
git diff --exit-code
git status --short --branch
```

- [ ] **Step 2: Request an independent read-only review**

Review `origin/main..HEAD` for semantics, bilingual copy, accessibility,
fallback behavior, test quality, documentation truthfulness, and public/private
boundary compliance.

- [ ] **Step 3: Address validated findings and rerun affected gates**

Use the receiving-review and systematic-debugging workflows for any finding;
do not implement suggestions without verifying them against the code.

- [ ] **Step 4: Push and open a ready PR**

Push `codex/browse-by-source-orientation`, open a ready PR against `main`, wait
for hosted checks, and leave the PR unmerged.
