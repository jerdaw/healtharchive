# Accessibility Audit Baseline Design

**Status:** Approved by standing autonomous-work authorization

**Date:** 2026-07-10

## Problem

Roadmap item #23 asks for a formal accessibility audit document. The current
public accessibility statement names a WCAG 2.1 AA target, but it also presents
manual screen-reader, contrast, resize, touch-target, and broad route coverage
as if those checks have been completed. Repository evidence currently supports
only a narrower automated axe scope plus source-level accessibility primitives.
Without a dated audit baseline, readers cannot distinguish verified evidence,
source-review observations, known limitations, and still-unperformed manual or
external validation.

## Goals

1. Publish a dated, evidence-backed internal accessibility audit baseline.
2. Separate automated evidence, source review, and unverified manual checks.
3. Reconcile the public accessibility statement so it makes no unsupported
   conformance or testing claims.
4. Preserve the WCAG 2.1 Level AA target without claiming conformance.
5. Keep canonical frontend docs reachable through the tracked docs-portal
   symlink bridge.
6. Add a regression test for that accessibility-document bridge.
7. Remove completed roadmap item #23 while leaving external expert review and
   assistive-technology testing explicitly open.

## Non-Goals

- Claim WCAG conformance or legal compliance.
- Substitute automated axe checks for manual accessibility evaluation.
- Claim testing with NVDA, JAWS, VoiceOver, TalkBack, voice control, screen
  magnification, forced-colour modes, or real users.
- Audit preserved third-party pages inside replay iframes.
- Promise a response or remediation time not backed by an operating policy.
- Change UI behavior or add a broad new accessibility test suite in this docs
  baseline batch.

## Evidence Model

The audit uses three evidence classes:

1. **Automated:** current Vitest/vitest-axe results for English and French home,
   About, Methods, Contact, and Researchers renders, plus the Contact link and
   About heading-hierarchy assertions.
2. **Source review:** locale-derived document language, skip link and main
   landmark, active-navigation state, visible-focus styling, and selected
   reduced-motion guards.
3. **Not yet verified:** end-to-end keyboard behavior, screen-reader
   interoperability, 200% zoom/reflow, contrast across themes and states,
   forced colours, touch targets, dynamic/live-data routes, and user testing.

Passing automated checks means no axe-detectable violation was found in the
tested render fixture. It does not prove WCAG conformance or that an entire
route works with assistive technology.

## Audit Document

Create `frontend/docs/accessibility-audit-2026-07-10.md`; the tracked
`docs/frontend -> ../frontend/docs` symlink exposes the same file in the docs
portal. Include:

- scope, target, date, and evidence sources;
- tested-route matrix with language and method;
- WCAG-principle summary with evidence strength;
- findings and same-batch documentation remediation;
- explicit limitations and prioritized follow-up;
- a conclusion that does not overstate conformance.

## Accessibility Statement

Replace the current broad claims with a shorter public statement that:

- names WCAG 2.1 AA as the target;
- links the dated internal audit;
- lists only evidence-supported implementation features;
- lists automation scope accurately;
- identifies unverified manual/external work;
- explains archived-content limitations;
- provides the existing public feedback channels without a fixed response-time
  promise.

Modify the canonical frontend statement; the docs-portal symlink exposes the
same content.

## Drift Prevention

Add a focused backend test that requires the statement and dated audit to exist
through both `frontend/docs/` and `docs/frontend/` and resolve to identical
bytes. This protects the canonical source and docs-portal bridge contract.

## Navigation And Related Docs

Add the statement and audit to the frontend reference navigation and both
frontend docs indexes. Update the implementation guide's stale “future axe
testing” wording to link the baseline and describe the real remaining manual
scope.

## Validation

- Record the focused current a11y suite result.
- Run the new mirror test red before adding the audit, then green afterward.
- Run strict docs coverage/build and active-doc/public LLM-surface tests.
- Run relevant frontend formatting/lint only if frontend source changes; this
  batch changes frontend Markdown, not application code.
- Run commit file-quality/private-key and secret checks.

## Delivery

Use a stacked branch based on the architecture-diagrams branch from PR #134 so
the planning indexes remain conflict-free. Open a PR against that branch. No deployment,
live-site probe, external expert claim, or application behavior change is part
of the batch.
