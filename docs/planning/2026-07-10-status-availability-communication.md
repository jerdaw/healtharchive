# Status Availability Communication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/status` a machine-readable check timestamp and neutral public
copy when usage reporting is unavailable, in English and French.

**Architecture:** Keep the existing server component and API behavior. Create
one render-time `Date` for both the localized text and ISO `dateTime`, and keep
the bilingual usage fallback in the route-local copy object.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Vitest, Testing Library.

## Global Constraints

- Preserve all four API calls, `Promise.allSettled`, and current fallback
  rendering.
- Preserve the current Operational/Degraded/Unavailable derivation, label, and
  `ha-tag` styling; its scope during partial endpoint failure remains a separate
  product decision.
- Use one `Date` instance for the visible timestamp and ISO `dateTime`.
- Keep English and French route copy together in `getStatusCopy()`.
- Do not add caching, client refresh, uptime history, routes, navigation, or
  API behavior.
- Do not change `/impact` or close unrelated `/status` findings.

---

### Task 1: Implement The Timestamp And Public Fallback Test-First

**Files:**

- Modify: `frontend/tests/status.test.tsx`
- Modify: `frontend/src/app/[locale]/status/page.tsx`

**Interfaces:**

- Consumes: the render-time clock and existing `UsageMetrics.enabled`
- Produces: `<time dateTime="ISO">localized value</time>` and bilingual public
  usage-unavailable copy

- [ ] **Step 1: Extend the localized API mock and clock cleanup**

Add `fetchSourcesLocalized: vi.fn()` to the `@/lib/api` mock, import it with
the existing API functions, and define:

```tsx
const mockFetchSourcesLocalized = vi.mocked(fetchSourcesLocalized);
```

Add an `afterEach` that restores real timers so a failed test cannot leak its
frozen clock into another test.

- [ ] **Step 2: Add failing structured-time assertions**

In the existing successful English test, freeze the clock before rendering:

```tsx
const checkedAt = new Date("2026-01-02T15:04:05.000Z");
vi.useFakeTimers();
vi.setSystemTime(checkedAt);
```

Keep the result returned by `render(ui)`, find its `time` element, and assert:

```tsx
expect(time).toHaveAttribute("datetime", checkedAt.toISOString());
expect(time).toHaveTextContent(
  checkedAt.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }),
);
```

- [ ] **Step 3: Add failing public-copy assertions for rejected usage**

Extend the existing all-API-failure English test to assert:

```tsx
expect(
  screen.getByText("Usage data is not available for this reporting period."),
).toBeInTheDocument();
expect(screen.queryByText(/Enable aggregated usage counts/i)).not.toBeInTheDocument();
```

- [ ] **Step 4: Add a failing French disabled-usage test**

Return healthy API status, reject or return minimal non-usage data, resolve
`fetchSourcesLocalized()` for the French route, and return a complete usage
response with `enabled: false`. Assert:

```tsx
expect(
  screen.getByText(
    "Les données d’utilisation ne sont pas disponibles pour cette période de rapport.",
  ),
).toBeInTheDocument();
expect(screen.queryByText(/Activez les décomptes agrégés/i)).not.toBeInTheDocument();
```

This covers both absent/rejected and explicitly disabled usage responses across
the two locales.

- [ ] **Step 5: Prove the focused tests fail for the intended reasons**

From `frontend/`:

```bash
npm test -- tests/status.test.tsx
```

Expected: the new semantic element and public-copy assertions fail because the
route still renders a span and operator-facing strings; existing behavior
assertions continue to pass.

- [ ] **Step 6: Add bilingual route-local fallback copy**

Add to the French copy branch:

```tsx
usageUnavailable:
  "Les données d’utilisation ne sont pas disponibles pour cette période de rapport.",
```

Add to the English branch:

```tsx
usageUnavailable: "Usage data is not available for this reporting period.",
```

- [ ] **Step 7: Emit one timestamp in visible and machine-readable forms**

Replace the direct display-time construction with:

```tsx
const checkedAt = new Date();
const lastChecked = checkedAt.toLocaleString(localeToLanguageTag(locale), {
  dateStyle: "medium",
  timeStyle: "short",
});
const annualCoverageYear = checkedAt.getUTCFullYear();
```

Wrap only the localized value in:

```tsx
<time dateTime={checkedAt.toISOString()}>{lastChecked}</time>
```

Keep the existing localized label outside the `time` element.

- [ ] **Step 8: Render the public usage fallback**

Replace the inline operator-facing locale ternary in the disabled/unavailable
usage callout with `copy.usageUnavailable`. Preserve the privacy explanation
below it.

- [ ] **Step 9: Prove the focused suite passes**

Run the Step 5 command.

Expected: 3 tests pass.

- [ ] **Step 10: Run focused static checks**

```bash
npx prettier --check 'src/app/[locale]/status/page.tsx' tests/status.test.tsx
npx eslint --max-warnings=0 'src/app/[locale]/status/page.tsx' tests/status.test.tsx
npx tsc --noEmit
git diff --check
```

- [ ] **Step 11: Commit the behavior and tests**

Return to the repository root before staging:

```bash
cd ..
git add frontend/src/app/[locale]/status/page.tsx frontend/tests/status.test.tsx
git commit -m "fix: clarify status availability"
```

### Task 2: Close Only The Completed Status Findings

**Files:**

- Modify: `frontend/FEATURE_PAGES_ANALYSIS.md`
- Modify: `frontend/docs/implementation-guide.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive: `docs/planning/2026-07-10-status-availability-communication.md`

**Interfaces:**

- Consumes: the completed timestamp and fallback-copy contract
- Produces: canonical behavior documentation and an archived implementation
  record

- [ ] **Step 1: Mark only matching feature-analysis items complete**

Mark `/status` observations 12 and 13 and top improvements 2 and 4 complete.
Describe the public bilingual fallback and the structured timestamp. Leave
status colour, caching, digest navigation, and every other finding unchanged.

- [ ] **Step 2: Update the canonical implementation guide**

In section 8.10, document that `/status`:

- renders the localized “Last checked” value in a `time` element with an ISO
  `dateTime` attribute;
- uses neutral public copy when usage metrics are absent or disabled.

- [ ] **Step 3: Run frontend validation**

From `frontend/`:

```bash
npm test -- tests/status.test.tsx
npm run check
```

Expected: formatting, lint, typecheck, all frontend tests, and production build
pass.

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

Inspect `/status` and `/fr/status` at 320px and a desktop width when the local
runtime is available. Confirm the localized timestamp and public usage fallback
are readable, existing coverage/usage layout is unchanged, and no horizontal
overflow appears. Inspect the rendered DOM to confirm the visible check value
is a `time` element with an ISO `dateTime`; focused tests remain authoritative
for the absent and explicitly disabled usage branches.

- [ ] **Step 6: Archive the plan and update indexes**

Replace this active plan with a 40–80-line implemented summary at
`docs/planning/implemented/2026-07-10-status-availability-communication.md`.
Remove it from the active-plan list and add it to both implemented-plan
indexes. Preserve the design document as the rationale record.

- [ ] **Step 7: Commit the documentation closeout**

```bash
git add docs/planning frontend/FEATURE_PAGES_ANALYSIS.md \
  frontend/docs/implementation-guide.md
git commit -m "docs: close status availability communication"
```

## Final Verification

After both task reviews are clean, rerun the focused status tests, contract
check, frontend parity/build, strict docs checks, pre-push gate, `git
diff --check`, and a clean-worktree check at the exact branch head. Generate a
whole-branch review package for `origin/main..HEAD`, address any finding through
the review workflow, then push and open a ready PR. Wait for all hosted checks
and leave the PR unmerged.
