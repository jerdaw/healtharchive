# Snapshot Metadata Mobile Layout Design

## Context

The snapshot details card renders each metadata row as a flex container. Every
label currently has a fixed `w-28` width, while only selected URL values have
`min-w-0`, flex growth, and defensive wrapping. The documented snapshot-page
improvement plan identifies clipping and overflow at 320–360px, especially for
the French “URL d’origine” label and long metadata values.

This batch addresses only the duplicated responsive metadata-row contract. It
does not change copy, data fetching, action buttons, status presentation,
timeline ordering, iframe behavior, or global design-system CSS.

## Decision

Define two static class constants next to the snapshot metadata copy helper:

```ts
const metadataLabelClassName = "text-ha-muted w-20 shrink-0 sm:w-28";
const metadataValueClassName = "min-w-0 flex-1 break-all";
```

Apply the label constant to every metadata `<dt>` and the value constant to
every corresponding `<dd>`.

At narrow widths, the 80px label column leaves more space for values and may
wrap multi-word labels naturally. From the `sm` breakpoint onward, the current
112px label width is preserved. `shrink-0` makes that responsive width stable,
while `min-w-0 flex-1 break-all` ensures long source names, timestamps, URLs,
identifiers, status values, and MIME types cannot force the card wider than its
container.

Static constants keep Tailwind class discovery straightforward and avoid both
repeated strings and a new component abstraction for simple semantic rows.

## Accessibility And Localization

- Preserve the existing `<dl>/<dt>/<dd>` semantics.
- Change no English or French copy.
- Preserve source order and conditional row rendering.
- Do not truncate values or replace visible content with tooltips.
- Wrapping must work for both unprefixed English and `/fr/...` routes.

## Test Strategy

- Extend the existing backend-backed snapshot test, which renders every
  metadata row.
- Assert every `<dt>` has `w-20`, `shrink-0`, and `sm:w-28`.
- Assert every `<dd>` has `min-w-0`, `flex-1`, and `break-all`.
- Observe the test fail against the current inconsistent classes, then pass
  after applying the constants.
- Run the focused test, frontend `npm run check`, monorepo contract sync and
  frontend CI parity, and diff integrity checks.
- Start the local frontend and inspect English and French snapshot routes at a
  320–360px viewport in the in-app browser. Confirm the card has no horizontal
  overflow and long values wrap within it.

## Alternatives Considered

1. **Shared class constants (selected).** Centralizes the contract with minimal
   structural change and no global side effects.
2. **Repeat utility strings on every row.** Smallest conceptual change, but
   leaves the rows vulnerable to future class drift.
3. **Create a metadata-row component or global `.ha-meta-grid` rule.** More
   reusable, but adds an abstraction or cross-page styling impact that this
   one-route fix does not need.

## Documentation And Completion

Mark sections 2.2 and 4.6 of `frontend/SNAPSHOT_IMPROVEMENT_PLAN.md` as
implemented so the same overflow work is not selected again. Archive the
implementation plan after the focused, full, and visual checks pass.

## Completion Criteria

- Every metadata label and value uses the shared responsive class contract.
- The focused test proves uniform application to all rendered rows.
- English and French 320–360px visual checks show no horizontal overflow.
- Frontend and monorepo validation pass.
- The improvement plan records both duplicate items as complete.
