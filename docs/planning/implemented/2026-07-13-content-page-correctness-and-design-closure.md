# Content-page correctness and design-system closure

**Status:** Implemented 2026-07-13

## Goal

Close the remaining high-confidence correctness, localization, semantic, and
design-system issues documented for the seven public content routes without
turning the batch into a broad copy rewrite or making new editorial decisions.

## Scope

- Fix the mixed English/French export-field description and add bilingual
  regression coverage for the affected content.
- Replace hard-coded internal URL construction with existing locale-aware
  helpers, including the project-home link and snapshot citation URL.
- Normalize the conditional citation callout to the standard content-section
  structure and replace the remaining raw heading color token.
- Add a token-based inner-page inset-card style and migrate code, URL, citation,
  and data blocks away from the homepage-only panel style across all seven
  routes.
- Normalize documented section spacing and add clear human-readable labels for
  the export manifest and per-source RSS group.
- Add or extend English/French rendering tests for every changed behavior.
- Replace the stale root-level content-page improvement plan with an archived
  outcome record that distinguishes completed, obsolete, deferred, and
  decision-dependent suggestions.

## Boundaries

- Do not perform the proposed 194-string copy-object rewrite solely to remove
  JSX ternaries; that broad P3 churn does not improve current user behavior.
- Do not change the documented public API environment contract or hard-code a
  production API origin.
- Do not alter punctuation that is already correct, add speculative callouts,
  or redesign citation-date interaction without a maintainer UX decision.
- Preserve English/French parity, English-governs policy, metadata behavior,
  and the public/private documentation boundary.

## Validation

- Run focused bilingual component/page tests while iterating.
- Run frontend formatting, lint, typecheck, unit tests, production build, and
  bilingual internal-link crawl.
- Run strict documentation checks and the local pre-push parity gate before
  pushing.
- Perform an independent final diff review before committing.

## Outcome

- Public export-field copy is fully bilingual, and manifest/RSS links now have
  stable human-readable labels.
- Content routes use locale-aware navigation and citation URL helpers instead
  of route-specific absolute/prefix construction.
- Citation and research guidance follow the shared semantic section and token
  contracts.
- Applicable data/citation blocks across the seven audited content routes use
  a quiet `ha-card-inset` surface, and all seven have a test-enforced section-
  spacing contract; homepage-only panels are no longer reused there.
- Focused bilingual/accessibility coverage and a static design-contract test
  prevent regressions.
- The stale content-page proposal was audited and archived with explicit
  dispositions so completed or invalid suggestions are not selected again.
