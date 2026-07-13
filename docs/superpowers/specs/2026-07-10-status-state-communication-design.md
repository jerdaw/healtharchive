# Status Availability Communication Design

**Date:** 2026-07-10

## Context

The frontend feature-page analysis identifies two closely related clarity and
accessibility gaps on `/status` that do not require a product decision:

- the displayed check time is plain text rather than a structured timestamp;
- the disabled/unavailable usage message tells public visitors to enable a
  backend setting they cannot control.

The page already localizes its display time and handles unavailable usage data.
The gaps can therefore be closed without changing API calls, service-state
semantics, caching, navigation, or page structure.

## Goal

Make the reporting timestamp machine-readable and keep unavailable-usage copy
appropriate for a public status page in English and French.

## Non-goals

- Changing the health, archive-statistics, sources, or usage APIs.
- Adding uptime history, live refresh, client state, or an ISR policy.
- Changing coverage cards, metrics, navigation, or calls to action.
- Colour-coding the service-state tag. The current “Operational” label can
  coexist with failed coverage or usage requests, so stronger visual semantics
  require a separate decision about whether the badge represents health API
  status or the whole page.
- Changing the separate `/impact` usage fallback in this batch.

## Approaches Considered

### 1. Cohesive availability-communication batch (selected)

Emit a machine-readable check time and replace the operator-facing usage
fallback with public copy.

Both changes improve how the page communicates data availability. They are
route-local, testable, and do not require a product or API decision.

### 2. Copy-only change

Changing only one string or element would leave the other unambiguous finding
open even though both share the same focused route and test surface.

### 3. Implement every `/status` recommendation

This would mix availability semantics with unresolved badge scope, caching
policy, navigation, and coverage-card design. Those concerns have different
tradeoffs and are intentionally left for separate decisions.

## Timestamp Contract

Create one `Date` instance for the render. Use it both for the existing
localized display string and for an ISO-8601 value on
`<time dateTime="...">`. The surrounding “Last checked” / “Dernière
vérification” label remains unchanged.

## Public Usage Fallback

When usage metrics are absent or disabled, render neutral public copy:

- English: `Usage data is not available for this reporting period.`
- French: `Les données d’utilisation ne sont pas disponibles pour cette
  période de rapport.`

The existing privacy explanation about aggregated counts and no personal
identifiers remains below the callout.

## Test Strategy

Focused route tests will prove:

- a successful render includes a parseable ISO `dateTime` whose instant matches
  the localized visible timestamp;
- English and French usage fallbacks use public copy and contain no instruction
  to enable backend configuration.

The branch will also run frontend formatting, linting, type checking, the full
test suite, production build, strict docs checks, and the repository pre-push
gate. Browser inspection will cover English and French at narrow and desktop
widths if the local runtime is available.

## Documentation Closeout

After implementation, mark only `/status` observations 12 and 13 and top
improvements 2 and 4 complete in `frontend/FEATURE_PAGES_ANALYSIS.md`. Keep the
status-colour finding open with no claim that its semantics were resolved.
Update the frontend implementation guide and archive the implementation plan so
the same work is not selected again.

## Risk And Rollback

The primary risks are a timestamp whose display and machine values refer to
different instants or public copy that still exposes an operator action.
Focused tests cover both boundaries. Rollback is limited to the status route,
focused tests, and documentation.
