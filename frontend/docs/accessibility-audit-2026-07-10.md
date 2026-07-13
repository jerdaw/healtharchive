# Accessibility Audit Baseline — 2026-07-10

## Status and conclusion

This is an **internal repository-evidence baseline**, not an external audit or
a declaration of WCAG conformance. HealthArchive targets WCAG 2.1 Level AA.

The current focused automated suite passed 12 tests. Eleven axe scans reported
no detected violations in the rendered fixtures they cover, and one additional
test checked heading hierarchy. Source review also confirmed several
accessibility primitives. The evidence does **not** cover every route, state,
browser, device, input method, or assistive technology, so it cannot establish
full conformance.

The most immediate finding was documentation overstatement: the earlier public
statement described broad manual and compatibility testing that had no recorded
evidence in the repository. That statement was corrected in the same change as
this baseline.

## Scope

Included:

- first-party Next.js frontend code and public frontend documentation;
- current English and French render fixtures in the focused axe suite;
- source review of document language, landmarks, active navigation, focus
  styling, and selected reduced-motion handling;
- the accessibility boundary between the HealthArchive viewer shell and
  preserved third-party content.

Not included:

- a live production-site crawl or browser automation;
- full keyboard-only task completion;
- NVDA, JAWS, VoiceOver, TalkBack, voice-control, or magnifier testing;
- 200% zoom/reflow, forced-colour, high-contrast, or touch-target measurement;
- dynamic and live-data states for archive, browse, snapshot, change, compare,
  report, and error flows;
- preserved third-party pages rendered inside replay frames;
- legal compliance review, disabled-user research, or an external expert
  audit.

## Evidence collected

### Automated render checks

Command run from `frontend/`:

```bash
npm test -- --run tests/a11y/home.a11y.test.tsx tests/a11y/static-pages.a11y.test.tsx
```

Result on 2026-07-10: **2 test files passed; 12 tests passed** (11 axe scans
and one heading-hierarchy test).

| Surface     | Languages       | Evidence                                                                           |
| ----------- | --------------- | ---------------------------------------------------------------------------------- |
| Home        | English, French | Rendered fixture passed `vitest-axe`                                               |
| About       | English, French | Rendered fixture passed `vitest-axe`; English heading levels are checked for jumps |
| Methods     | English, French | Rendered fixture passed `vitest-axe`                                               |
| Contact     | English, French | Rendered fixture passed `vitest-axe`; mail links are checked for accessible text   |
| Researchers | English, French | Rendered fixture passed `vitest-axe`                                               |

These are component/server-render fixtures in jsdom. A passing result means axe
found no violation it can detect in that fixture. It does not prove that a full
route, interaction, stylesheet state, or assistive-technology workflow is
accessible.

### Source review

| Area                | Repository evidence                                                                                                                 | Assessment                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Document language   | `frontend/src/app/[locale]/layout.tsx` derives the root `lang` value from the supported locale                                      | Present in source                                                |
| Bypass block        | The locale layout places a “skip to main content” link before the header and targets `#main-content`                                | Present in source                                                |
| Landmarks           | The shared layout uses a `main` landmark; shared navigation uses labelled navigation patterns                                       | Present in source                                                |
| Current navigation  | `frontend/src/components/layout/Header.tsx` sets `aria-current="page"` for active links                                             | Present in source                                                |
| Focus indication    | `frontend/src/app/globals.css` defines focus-visible styles for links, navigation, buttons, selects, icon buttons, and FAQ controls | Present in source; visual completeness still needs manual review |
| Reduced motion      | Global CSS and selected animation/autoscroll components check `prefers-reduced-motion`                                              | Present in reviewed paths; not an exhaustive animation inventory |
| Static a11y linting | The Next ESLint stack includes `eslint-plugin-jsx-a11y` and the frontend lint gate runs with zero warnings                          | Automated static guard, not runtime proof                        |

## Findings

### A11Y-DOC-001 — Public statement exceeded recorded evidence

**Priority:** High documentation correctness

The previous statement said that all interactive elements were keyboard
accessible, contrast and 200% resizing met requirements, touch targets met
minimums, major pages were covered by automation, and multiple screen readers
were part of current testing. The repository did not contain dated results for
those claims.

**Disposition:** Resolved in this batch. The statement now distinguishes
verified repository evidence from manual and external work that remains open.

### A11Y-COV-001 — Automated route coverage is narrow

**Priority:** Medium

The focused axe suite covers five page types in English and French. It does not
currently exercise the high-traffic archive/search flow, browse-by-source,
snapshot metadata/viewer, changes, compare, report form, or all failure states.

**Disposition:** Open follow-up. Add deterministic mocked render coverage in
small route-focused batches; do not imply that automated expansion replaces
manual validation.

### A11Y-MAN-001 — Manual assistive-technology evidence is absent

**Priority:** Medium

No dated repository artifact demonstrates full keyboard task completion,
screen-reader interoperability, zoom/reflow, forced-colour/high-contrast, touch
target, voice-control, or magnification testing.

**Disposition:** Human/device-dependent follow-up. Record browser, operating
system, assistive technology, route/task, outcome, and unresolved barrier when
those checks are performed.

### A11Y-ARCHIVE-001 — Preserved pages have an inherited accessibility limit

**Priority:** Accepted product boundary with ongoing shell responsibility

Replay intentionally preserves third-party pages, including their original
accessibility defects. HealthArchive cannot truthfully claim those documents
conform. The first-party banner, metadata, controls, navigation, and alternative
ways to reach archive metadata remain HealthArchive's responsibility.

**Disposition:** Keep the limitation prominent and include the viewer shell in
future manual and automated coverage.

## WCAG principle summary

| Principle      | Current evidence                                                                             | Remaining evidence gap                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Perceivable    | Locale language metadata and axe-tested fixture semantics                                    | Theme/state contrast, zoom/reflow, image alternatives across all routes, high-contrast/forced-colour review |
| Operable       | Skip link, main landmark, current-page state, focus styles, selected reduced-motion handling | Full keyboard tasks, focus order/visibility in every state, touch targets, timing and motion inventory      |
| Understandable | Bilingual route structure and labelled shared navigation in reviewed code                    | Form/error comprehension, automated French-quality limitations, cognitive/usability research                |
| Robust         | Semantic shared-shell patterns, static a11y linting, and focused axe checks                  | Real browser/accessibility-tree inspection and screen-reader interoperability                               |

## Prioritized follow-up

1. Run and record keyboard-only critical tasks for home, archive/search,
   browse-by-source, snapshot/viewer, report, and locale switching.
2. Run a bounded screen-reader matrix on at least one Windows/browser pairing
   and one Apple/browser pairing, then record exact results.
3. Expand mocked axe coverage to archive/search, browse, snapshot, report, and
   recovery states in reviewable batches.
4. Measure contrast across light/dark interactive states and test 200% reflow,
   forced colours, and touch targets at representative viewports.
5. Seek disabled-user or external expert review when scope and resources are
   available; keep it distinct from this internal baseline.

## Audit maintenance

Repeat or supersede this baseline after substantial navigation, design-system,
viewer-shell, form, localization, or animation changes. New records should keep
automated results, source observations, manual evidence, and unverified scope
clearly separated.
