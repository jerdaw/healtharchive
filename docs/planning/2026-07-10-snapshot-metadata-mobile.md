# Snapshot Metadata Mobile Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent snapshot metadata labels and values from clipping or overflowing at 320–360px while preserving the existing semantic markup and desktop layout.

**Architecture:** Define one static Tailwind class constant for metadata labels and one for values, then apply them to every `<dt>/<dd>` pair. The route, copy, data flow, and global CSS remain unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4, Vitest, Testing Library.

## Global Constraints

- Preserve `<dl>/<dt>/<dd>` semantics and row order.
- Change no English or French copy.
- Use `w-20 shrink-0 sm:w-28` for every metadata label.
- Use `min-w-0 flex-1 break-all` for every metadata value.
- Do not introduce a component or global CSS rule for this one-route fix.
- Do not change data fetching, links, action buttons, timeline, iframe, or security behavior.

---

### Task 1: Enforce One Responsive Metadata Row Contract

**Files:**
- Modify: `frontend/tests/snapshotDetails.test.tsx`
- Modify: `frontend/src/app/[locale]/snapshot/[id]/page.tsx`

**Interfaces:**
- Consumes: the existing backend-backed snapshot fixture with all metadata fields
- Produces: uniform responsive classes on every rendered metadata term/value pair

- [ ] **Step 1: Write the failing class-contract assertions**

In the existing “renders a details page with View + prefilling links” test,
capture the render container:

```tsx
const { container } = render(ui);
```

Then add:

```tsx
const metadataTerms = Array.from(container.querySelectorAll("dl dt"));
const metadataValues = Array.from(container.querySelectorAll("dl dd"));

expect(metadataTerms).toHaveLength(9);
expect(metadataValues).toHaveLength(9);
for (const term of metadataTerms) {
  expect(term).toHaveClass("w-20", "shrink-0", "sm:w-28");
}
for (const value of metadataValues) {
  expect(value).toHaveClass("min-w-0", "flex-1", "break-all");
}
```

- [ ] **Step 2: Prove the focused test fails**

Run from `frontend/`:

```bash
npm test -- tests/snapshotDetails.test.tsx
```

Expected: FAIL because existing terms have only `w-28`, and several values
lack flex and wrapping utilities.

- [ ] **Step 3: Add shared class constants and apply them uniformly**

Add near the snapshot metadata copy helper:

```tsx
const metadataLabelClassName = "text-ha-muted w-20 shrink-0 sm:w-28";
const metadataValueClassName = "min-w-0 flex-1 break-all";
```

Replace every metadata `<dt>` class with:

```tsx
<dt className={metadataLabelClassName}>...</dt>
```

Replace every metadata `<dd>` class, including values that already have
partial wrapping utilities, with:

```tsx
<dd className={metadataValueClassName}>...</dd>
```

- [ ] **Step 4: Prove the focused test passes**

Run the Step 2 command.

Expected: both snapshot-details tests pass.

- [ ] **Step 5: Run focused static checks**

```bash
npx prettier --check 'src/app/[locale]/snapshot/[id]/page.tsx' tests/snapshotDetails.test.tsx
npx eslint --max-warnings=0 'src/app/[locale]/snapshot/[id]/page.tsx' tests/snapshotDetails.test.tsx
npx tsc --noEmit
```

Expected: every command exits 0.

- [ ] **Step 6: Commit the responsive layout**

```bash
git add frontend/src/app/[locale]/snapshot/[id]/page.tsx frontend/tests/snapshotDetails.test.tsx
git commit -m "fix: prevent snapshot metadata overflow"
```

### Task 2: Close The Plan Items And Validate The UI

**Files:**
- Modify: `frontend/SNAPSHOT_IMPROVEMENT_PLAN.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive: `docs/planning/2026-07-10-snapshot-metadata-mobile.md`

**Interfaces:**
- Consumes: completed responsive class contract
- Produces: explicit completion markers for snapshot plan sections 2.2 and 4.6

- [ ] **Step 1: Mark both duplicate improvement items complete**

Add a status note at the top of `frontend/SNAPSHOT_IMPROVEMENT_PLAN.md` and
mark headings 2.2 and 4.6 as implemented on 2026-07-10. Keep their rationale as
historical context so future maintainers understand the responsive contract.

- [ ] **Step 2: Run frontend validation**

From `frontend/`:

```bash
npm test -- tests/snapshotDetails.test.tsx
npm run check
```

Expected: formatting, lint, typecheck, all frontend tests, and production build pass.

- [ ] **Step 3: Run monorepo frontend parity**

From the repository root:

```bash
make contract-sync
make frontend-ci
make docs-coverage-strict
make docs-build-strict
git diff --check
```

Expected: generated API types remain synchronized, the public documentation
passes both strict gates, and every command exits 0.

- [ ] **Step 4: Perform narrow-screen English/French browser QA**

Start the local frontend on an unused loopback port and inspect:

```text
/snapshot/phac-2025-02-15-covid-epi
/fr/snapshot/phac-2023-10-01-flu-recs-fr
```

At 320px and 360px viewport widths, confirm:

- the metadata card has no horizontal overflow;
- “URL d’origine” remains readable;
- long original URLs wrap inside the value column;
- English and French pages retain the same semantic row layout.

- [ ] **Step 5: Archive the plan and update indexes**

Move this plan to
`docs/planning/implemented/2026-07-10-snapshot-metadata-mobile.md`, compress it
to the implemented-plan summary format, remove it from active plans, and add it
to both implemented-plan indexes.

- [ ] **Step 6: Commit the closeout**

```bash
git add frontend/SNAPSHOT_IMPROVEMENT_PLAN.md docs/planning/README.md \
  docs/planning/implemented/README.md \
  docs/planning/2026-07-10-snapshot-metadata-mobile.md \
  docs/planning/implemented/2026-07-10-snapshot-metadata-mobile.md
git commit -m "docs: close snapshot metadata mobile follow-up"
```

- [ ] **Step 7: Re-run committed-tree validation**

Repeat Steps 2 and 3, confirm the browser routes still pass Step 4, and run:

```bash
git status --short --branch
```

Expected: the branch is clean and every validation remains green.
