# Frontend Error Boundaries Implementation Plan

**Status:** Ready to implement

**Goal:** Add tested locale-segment and global recovery boundaries that remain
safe, accessible, bilingual, and free of internal error detail.

**Design:** `../superpowers/specs/2026-07-10-frontend-error-boundaries-design.md`

## Task 1: Add failing boundary tests

**File:** `frontend/tests/errorBoundaries.test.tsx`

1. Mock `next/navigation` locale params.
2. Assert English/French segment copy, localized home paths, and retry action.
3. Assert invalid/missing locale safely falls back to English.
4. Assert global wrapper structure and bilingual content.
5. Assert neither boundary emits sentinel message/digest detail.
6. Add axe checks for the segment and content-only global surface.
7. Run the focused test and record the expected missing-module failure.

## Task 2: Add shared recovery copy

**File:** `frontend/src/lib/errorRecovery.ts`

Define typed localized copy and a `getErrorRecoveryCopy(locale)` helper using
the existing `Localized`/`pickLocalized` pattern. Include archive limitations
and non-official framing without duplicating operational detail.

## Task 3: Implement both App Router boundaries

**Files:**

- Create: `frontend/src/app/[locale]/error.tsx`
- Create: `frontend/src/app/global-error.tsx`

Implement the segment boundary with `PageShell` and localized recovery actions.
Implement the self-contained global wrapper/content with inline resilient
styles and bilingual blocks. Never render/log the error object. Run focused
tests to green.

## Task 4: Close documentation and roadmap truth

**Files:**

- Modify: `frontend/docs/implementation-guide.md`
- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/README.md`
- Archive this plan under `docs/planning/implemented/`

Document boundary placement, responsibilities, recovery/no-leak behavior, and
testing. Remove completed roadmap item #24 without changing unrelated backlog.

## Task 5: Verify, review, and publish

1. Install isolated dependencies with `npm ci` in the worktree frontend.
2. Run focused Vitest and accessibility tests.
3. Run `npm run check` for format, lint, typecheck, full tests, and build.
4. Run strict backend docs checks for the roadmap/index/guide bridge.
5. Run base-to-head whitespace and public-boundary scans.
6. Review the complete diff for detail leakage, hydration/layout dependencies,
   localization drift, and accessible recovery behavior.
7. Record exact evidence, commit, push, open/read back the PR, and report hosted
   checks without deploying.

## Completion Record

Pending implementation.
