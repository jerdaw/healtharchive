# Changes Result Orientation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a localized change-result total and replace the terse filter
heading on `/changes` while preserving all API, error, selection, and
pagination behavior.

**Architecture:** Extend the route-local bilingual copy object and render one
server-side summary from the existing API `total`. The summary appears only
for successful enabled responses, so unavailable and disabled feeds never
misrepresent failure as zero results.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4, Vitest,
Testing Library.

## Global Constraints

- Preserve source/edition selection, API calls, page size, and pagination.
- Render the total only when `changes` exists and `changes.enabled` is true.
- Use `formatNumber(locale, total)` for the displayed total.
- Keep English and French copy together in `getChangesCopy()`.
- Singular applies only to `total === 1`; zero and other values are plural.
- Do not add client state, live regions, routes, API calls, or global styles.
- Do not change form submission, action hierarchy, event cards, or CTA URLs.

---

### Task 1: Define And Implement The Result-Orientation Contract Test-First

**Files:**

- Modify: `frontend/tests/changes.test.tsx`
- Modify: `frontend/src/app/[locale]/changes/page.tsx`

**Interfaces:**

- Consumes: `fetchSources()`, `fetchSourcesLocalized()`,
  `fetchSourceEditions()`, `fetchChanges()`, existing `ChangesResponse.total`
- Produces: localized `filterHeading` and
  `resultSummary(formattedTotal, total)` copy

- [ ] **Step 1: Extend the localized API mock**

Add `fetchSourcesLocalized: vi.fn()` to the `@/lib/api` mock, import it with
the existing API functions, and define:

```tsx
const mockFetchSourcesLocalized = vi.mocked(fetchSourcesLocalized);
```

- [ ] **Step 2: Add failing singular assertions to the existing test**

After rendering the existing one-result English response, assert:

```tsx
expect(
  screen.getByRole("heading", { name: "Filter by source & edition" }),
).toBeInTheDocument();
expect(screen.getByText("Showing 1 change.")).toBeInTheDocument();
```

- [ ] **Step 3: Add a failing successful-empty test**

Mock one English source and edition, then return:

```tsx
{
  enabled: true,
  total: 0,
  page: 1,
  pageSize: 20,
  results: [],
}
```

Assert:

```tsx
expect(screen.getByText("Showing 0 changes.")).toBeInTheDocument();
expect(screen.getByText(/No changes found for this edition yet/i)).toBeInTheDocument();
```

- [ ] **Step 4: Add a failing French multi-result orientation test**

Mock a localized French source, one edition, and a response whose `total` is
`21`, `pageSize` is `20`, and `results` contains one complete change event.
Render with locale `fr`, then assert:

```tsx
expect(
  screen.getByRole("heading", { name: "Filtrer par source et édition" }),
).toBeInTheDocument();
expect(screen.getByText("Affichage de 21 changements.")).toBeInTheDocument();
expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument();
```

- [ ] **Step 5: Add failing unavailable and disabled boundary tests**

For unavailable, reject `fetchChanges()` and assert the existing “Changes
unavailable” heading plus no text matching `/^Showing \d+ changes?\.$/`.

For disabled, return:

```tsx
{
  enabled: false,
  total: 0,
  page: 1,
  pageSize: 20,
  results: [],
}
```

Assert the existing disabled copy plus no English result-summary text.

- [ ] **Step 6: Prove the focused tests fail for the intended reasons**

From `frontend/`:

```bash
npm test -- tests/changes.test.tsx
```

Expected: the new heading/summary assertions fail because those strings do
not exist; existing behavior assertions continue to pass.

- [ ] **Step 7: Extend the route-local bilingual copy**

Add to the French copy branch:

```tsx
filterHeading: "Filtrer par source et édition",
resultSummary: (formattedTotal: string, total: number) =>
  `Affichage de ${formattedTotal} changement${total === 1 ? "" : "s"}.`,
```

Add to the English branch:

```tsx
filterHeading: "Filter by source & edition",
resultSummary: (formattedTotal: string, total: number) =>
  `Showing ${formattedTotal} change${total === 1 ? "" : "s"}.`,
```

- [ ] **Step 8: Render the clearer heading and successful-result summary**

Import `formatNumber` beside `formatDate`. Replace the inline Scope/Portée
ternary with:

```tsx
<h2 className="ha-section-heading">{copy.filterHeading}</h2>
```

Immediately after the existing Changes feed heading, add:

```tsx
{changes?.enabled && (
  <p className="text-ha-muted text-sm">
    {copy.resultSummary(formatNumber(locale, total), total)}
  </p>
)}
```

- [ ] **Step 9: Prove the focused suite passes**

Run the Step 6 command.

Expected: 5 tests pass.

- [ ] **Step 10: Run focused static checks**

```bash
npx prettier --check 'src/app/[locale]/changes/page.tsx' tests/changes.test.tsx
npx eslint --max-warnings=0 'src/app/[locale]/changes/page.tsx' tests/changes.test.tsx
npx tsc --noEmit
git diff --check
```

- [ ] **Step 11: Commit the behavior and tests**

```bash
git add frontend/src/app/[locale]/changes/page.tsx frontend/tests/changes.test.tsx
git commit -m "feat: orient change feed results"
```

### Task 2: Close The Documented Findings

**Files:**

- Modify: `frontend/FEATURE_PAGES_ANALYSIS.md`
- Modify: `frontend/docs/implementation-guide.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive: `docs/planning/2026-07-10-changes-result-orientation.md`

**Interfaces:**

- Consumes: the completed `/changes` rendering contract
- Produces: canonical behavior documentation and an archived implementation
  record

- [ ] **Step 1: Mark the feature-analysis items complete**

Mark `/changes` observation 15 and top improvement 1 complete, describing the
localized total for zero/single/multi-page results. Mark observation 7 and top
improvement 4 complete, describing the clearer bilingual filter heading. Leave
the remaining observations and recommendations unchanged.

- [ ] **Step 2: Update the canonical implementation guide**

In section 8.11, document that `/changes`:

- labels its filter section explicitly by source and edition;
- shows the localized API total for successful enabled responses, including
  zero;
- omits the total for disabled or unavailable feeds.

- [ ] **Step 3: Run frontend validation**

From `frontend/`:

```bash
npm test -- tests/changes.test.tsx
npm run check
```

Expected: formatting, lint, typecheck, all frontend tests, and production build
pass.

- [ ] **Step 4: Run monorepo and docs parity**

From the repository root, using the shared root backend venv:

```bash
make VENV=/home/jer/repos/vps/healtharchive/healtharchive/.venv contract-check
make VENV=/home/jer/repos/vps/healtharchive/healtharchive/.venv frontend-ci
make VENV=/home/jer/repos/vps/healtharchive/healtharchive/.venv docs-coverage-strict
make VENV=/home/jer/repos/vps/healtharchive/healtharchive/.venv docs-build-strict
git diff --check
```

- [ ] **Step 5: Perform localized runtime QA**

Inspect `/changes` and `/fr/changes` at 320px and a desktop width when the
local runtime is available. Confirm the filter heading is clear, the successful
result summary is readable when backed by data, existing cards/pagination keep
their layout, and no horizontal overflow appears. Component tests are the
authoritative zero/one/many and unavailable/disabled branch evidence.

- [ ] **Step 6: Archive the plan and update indexes**

Move this plan to
`docs/planning/implemented/2026-07-10-changes-result-orientation.md`, compress
it to the implemented-plan summary format, remove it from active plans, and add
it to both implemented-plan indexes.

- [ ] **Step 7: Commit the closeout**

```bash
git add frontend/FEATURE_PAGES_ANALYSIS.md frontend/docs/implementation-guide.md \
  docs/planning/README.md docs/planning/implemented/README.md \
  docs/planning/2026-07-10-changes-result-orientation.md \
  docs/planning/implemented/2026-07-10-changes-result-orientation.md
git commit -m "docs: close changes result orientation"
```

### Task 3: Verify And Prepare Review

- [ ] **Step 1: Run exact-HEAD validation**

```bash
npm --prefix frontend test -- tests/changes.test.tsx
make VENV=/home/jer/repos/vps/healtharchive/healtharchive/.venv contract-check
make VENV=/home/jer/repos/vps/healtharchive/healtharchive/.venv frontend-ci
make VENV=/home/jer/repos/vps/healtharchive/healtharchive/.venv docs-coverage-strict
make VENV=/home/jer/repos/vps/healtharchive/healtharchive/.venv docs-build-strict
make VENV=/home/jer/repos/vps/healtharchive/healtharchive/.venv prepush
git diff --exit-code
git status --short --branch
```

- [ ] **Step 2: Request an independent read-only review**

Review `origin/main..HEAD` for the enabled/disabled/unavailable boundary,
bilingual plural copy, formatting, accessibility, test quality, documentation
truthfulness, and public/private boundary compliance.

- [ ] **Step 3: Address validated findings and rerun affected gates**

Use the receiving-review and systematic-debugging workflows for any finding;
do not implement suggestions without verifying them against the code.

- [ ] **Step 4: Push and open a ready PR**

Push `codex/changes-result-orientation`, open a ready PR against `main`, wait
for hosted checks, and leave the PR unmerged.
