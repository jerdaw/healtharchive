# Accessibility Statement

**Last reviewed:** July 10, 2026

HealthArchive.ca aims to make its first-party website and archive interface
usable by people with disabilities. The project's target is WCAG 2.1 Level AA.
This is a target, not a claim that every route, state, or preserved page has
been audited or conforms.

## Current evidence

Repository evidence currently confirms:

- locale-derived document language for English and French routes;
- a skip link and shared main landmark;
- current-page state in shared navigation;
- focus-visible styles for common interactive controls;
- reduced-motion handling in global styles and selected animated components;
- 12 focused accessibility tests covering English and French Home, About,
  Methods, Contact, and Researchers renders; 11 include axe scans with no
  detected violations, and one checks heading hierarchy.

Automated checks detect only some accessibility barriers. A passing fixture is
not proof of WCAG conformance or full assistive-technology compatibility. See
the dated [accessibility audit baseline](accessibility-audit-2026-07-10.md) for
the exact scope, evidence, findings, and follow-up.

## Work not yet verified

The project does not currently have recorded, comprehensive evidence for:

- keyboard-only completion of every critical task;
- NVDA, JAWS, VoiceOver, TalkBack, voice-control, or magnifier use;
- 200% zoom/reflow, forced-colour/high-contrast modes, or touch-target sizing;
- contrast across every theme, component state, and responsive viewport;
- dynamic archive/search, browse, snapshot/viewer, change, compare, report,
  and error states;
- disabled-user research or an external expert audit.

These remain validation work. They should not be inferred from the current
automated suite.

## Preserved content limitation

Archived pages are third-party historical documents preserved as published.
They may contain accessibility barriers that HealthArchive did not create and
cannot safely rewrite without changing the record. The first-party viewer
shell, metadata, controls, navigation, and alternative paths to archive
information remain HealthArchive's responsibility.

## Language and content

The interface supports English and French. French content is currently an
automated alpha translation; English governs if the versions differ. This
translation limitation can also affect clarity and assistive-technology
pronunciation.

## Feedback and alternative access

If you encounter an accessibility barrier, email
[accessibility@healtharchive.ca](mailto:accessibility@healtharchive.ca) or use
the general [contact address](mailto:contact@healtharchive.ca). Helpful details
include:

- the page URL;
- the task you were trying to complete;
- what happened and what you expected;
- browser, operating system, and assistive technology, if relevant.

If you need project information in another format, contact the project and
describe the format that would work for you. Requests and reports are reviewed
based on impact and available project capacity; this statement does not promise
a fixed response or remediation time.

## Standards and maintenance

- Primary target: [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/TR/WCAG21/), Level AA.
- Automated guardrails: Next/JSX accessibility linting and focused
  `vitest-axe` render tests.
- Evidence record: [Accessibility Audit Baseline — 2026-07-10](accessibility-audit-2026-07-10.md).

The statement and audit baseline should be reviewed after substantial changes
to navigation, the design system, replay/viewer controls, forms, localization,
or animation behavior.

HealthArchive.ca is an independent project and is not affiliated with a
government agency.
