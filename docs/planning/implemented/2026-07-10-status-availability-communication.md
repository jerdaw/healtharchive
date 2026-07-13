# Status Availability Communication — Implemented Summary

**Date:** 2026-07-10
**Status:** Implemented

## Goal

Improve how `/status` communicates its check time and unavailable usage data
without changing service-state semantics, API behavior, caching, or page
structure.

## Delivered

- The route creates one render-time `Date` and uses it for both the visible,
  localized check time and its ISO-8601 machine value.
- The localized value is rendered in a `<time>` element whose `dateTime`
  attribute represents the same instant.
- The usage-unavailable callout now uses neutral public copy rather than asking
  visitors to enable backend configuration.
- The public fallback is localized in English and French.
- The existing privacy explanation remains below the fallback.
- The existing four API requests, `Promise.allSettled` behavior, service-state
  derivation, label, and `ha-tag` styling are unchanged.

## Tests

Focused status-route tests cover:

- an exact ISO `dateTime` and localized visible value from a frozen clock;
- the English fallback when usage retrieval fails;
- the French fallback when usage reporting is explicitly disabled;
- absence of the former operator-facing instructions in both locales.

## Validation

The implementation and documentation closeout were checked with:

- the focused status test suite;
- frontend formatting, linting, type checking, full tests, and production
  build;
- frontend/backend contract synchronization checks;
- strict documentation coverage and build checks;
- the repository pre-push parity gate;
- Git whitespace and scope checks.

Localized runtime inspection remains part of the branch-level final
verification when a local browser runtime is available; the focused tests are
authoritative for absent and explicitly disabled usage branches.

## Deliberately Unchanged

- Status-label colour and the meaning of “Operational” during partial endpoint
  failures remain open for a separate product decision.
- No ISR window, live refresh, uptime history, digest navigation, coverage-card
  redesign, or API change was added.
- The separate `/impact` fallback was not changed.

## References

- Design rationale:
  `docs/superpowers/specs/2026-07-10-status-state-communication-design.md`
- Canonical route behavior: `frontend/docs/implementation-guide.md`
- Remaining frontend findings: `frontend/FEATURE_PAGES_ANALYSIS.md`

Detailed implementation steps remain available in Git history.
