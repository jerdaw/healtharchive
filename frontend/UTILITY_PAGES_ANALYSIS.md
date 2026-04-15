# Utility Pages Analysis

**Date:** 2026-02-24
**Scope:** Six utility/legal pages plus the browse/[id] redirect page.

Pages covered:

- `src/app/[locale]/terms/page.tsx`
- `src/app/[locale]/privacy/page.tsx`
- `src/app/[locale]/governance/page.tsx`
- `src/app/[locale]/report/page.tsx`
- `src/app/[locale]/contact/page.tsx`
- `src/app/[locale]/changelog/page.tsx`
- `src/app/[locale]/browse/[id]/page.tsx` (redirect-only page)

---

## Shared observations

These apply across most or all of the utility pages.

### Structure and layout

**1. `ha-content-section-lead` / `ha-content-section` are in consistent use. ✅**
All pages have migrated away from `ha-home-hero` / `ha-home-hero-plain`. The first substantive block on each page correctly uses `ha-content-section-lead` (stronger shadow, blue-tinted gradient in dark mode) and subsequent blocks use `ha-content-section` (lighter shadow, neutral background). The visual hierarchy is correct.

**2. `PageShell` is used uniformly for the eyebrow / title / intro header band. ✅**
Every page passes `eyebrow`, `title`, and `intro` to `<PageShell>`. This keeps the top-of-page treatment consistent and makes metadata generation straightforward. The metadata functions (`generateMetadata`) reuse the same copy objects, so OG/title tags match the visible page headline.

**3. Locale copy strategy is inconsistent across pages. 🔧**

- Terms, Privacy, and Governance use private `get*Copy(locale)` functions that return a small object for the eyebrow/title/intro, while the body content lives in separate `*EnglishContent` sub-components.
- Report and Contact inline all locale-switched strings directly as ternary expressions throughout the JSX.
- Changelog uses a `get*Copy(locale)` function for the shell but has no body text to switch (body comes from a data file).
  This inconsistency makes it harder to audit or update copy centrally.

**4. Ad-hoc `NextLink` vs `LocalizedLink` usage. 🔧**
Several pages import both `NextLink` (from `next/link`) and `LocalizedLink` (from `@/components/i18n/LocalizedLink`). Internal cross-page links within the body content sometimes use `NextLink` directly, which bypasses locale prefixing. Examples:

- `terms/page.tsx` lines 73, 96, 100 use `NextLink` for `/cite`, `/report`, `/contact`.
- `privacy/page.tsx` lines 82, 94 use `NextLink` for `/report`, `/contact`.
- `governance/page.tsx` lines 228, 232 use `NextLink` for `/report`, `/contact`.
  These links will not carry the `/fr/` prefix when rendered on the French locale.

**5. Hover color for links is hardcoded as `hover:text-blue-700`. 🔧**
All cross-page links use the pattern `className="text-ha-accent font-medium hover:text-blue-700"`. The `text-blue-700` hover state is a raw Tailwind color token rather than a CSS variable, which means it will not respond to the dark mode theme. In dark mode the accent color shifts, but the hover stays a fixed light-mode blue.

**6. No section-level `id` anchors on terms or privacy (unlike governance). 🔧**
Governance correctly applies `id` attributes to each `<h2>` so the French summary can provide section jump links. Terms and Privacy have no `id` attributes on their headings, which makes them harder to deep-link from governance, report, or external references.

**7. Legal pages have no "last reviewed" or effective date. ⚠️**
Terms, Privacy, and Governance have no visible date stamp indicating when the policy was last reviewed or took effect. For legal/policy pages this is a standard expectation for readers and for compliance auditing.

**8. French bilingual pattern is consistent for policy pages but verbose. ✅**
Terms, Privacy, and Governance all follow the same three-part pattern:

1. `EnglishControlsNotice` banner (locale-aware).
2. Optional French summary block (`ha-content-section-lead`) with `lang="fr"` implied.
3. `id="official-english"` bridge section.
4. English body wrapped in `lang="en"` `<div>`.
   This is the correct approach and is consistently applied. The verbosity is acceptable for legal copy.

**9. No skip-to-section navigation on the longest page (governance). 🔧**
Governance has eight named sections (mission, scope, cadence, provenance, change-tracking, corrections, takedown, advisory). The French summary includes an inline anchor list, but English readers have no table of contents or skip links. For a page of this length a lightweight anchor list at the top would improve usability.

**10. `ha-callout` is used only as a footer CTA block on most pages; it is not used for safety notices inline. ✅**
The callout style is reserved for the "Questions or corrections" / "Questions or concerns?" ending block. This is a reasonable pattern. No pages misuse the callout for primary body content where a `ha-content-section` would be more appropriate.

---

## Per-page notes

### Terms of use (`terms/page.tsx`)

**1. Five sections are well-scoped and clearly titled. ✅**
Acceptable use, No medical advice, Citation and attribution, Availability, and a callout CTA. The scope is appropriate for a project at this stage.

**2. "Citation and attribution" section references `/cite` but that route may not exist. ⚠️**
Line 73 links to `/cite` with `NextLink`. There is no `src/app/[locale]/cite/page.tsx` visible in the project structure. If `/cite` is a planned but unbuilt page, this is a broken link that will 404. The link should either point to an existing anchor on the methods page or be wrapped in a conditional.

**3. `siteCopyEn` is passed to `TermsEnglishContent` but only `copy.whatThisSiteIs.is` and `.isNot` are consumed. 🔧**
The component receives the full `SiteCopy` object but ignores `limitations` and `forCurrent`. The French summary (locale === "fr" block) uses all four properties. The English content body is therefore slightly thinner than the French summary, which is an inversion of what is expected.

**4. The "Availability" section is short enough that it could merge with "Acceptable use". 🔧**
A single paragraph saying "provided on an as-is basis" is thin as a standalone section. It could become a bullet under Acceptable use or be combined with a limitations callout.

**5. `NextLink` used for all three internal links in the body. 🔧**
See shared observation #4. The `/cite`, `/report`, and `/contact` links in the English content component will not locale-prefix on French locale.

**6. No effective date on the page. ⚠️**
See shared observation #7.

**7. The French summary renders `siteCopy.whatThisSiteIs.forCurrent` with a trailing period appended inline. 🔧**
Line 137: `{siteCopy.whatThisSiteIs.forCurrent}.` — if the `forCurrent` string already ends with a period in `siteCopy.ts`, this will double-punctuate.

### Privacy (`privacy/page.tsx`)

**1. Clear and accurate minimal-collection posture is well communicated. ✅**
"What we collect" and "What we do not collect" are appropriately separated. The four bullet items in the collect section are specific and honest (server logs, aggregate counts, report submissions, theme preference).

**2. `getSiteCopy` is not imported or used, even though the French summary and English body could pull from siteCopy for the "what we do not collect" bullets. 🔧**
Unlike Terms and Governance, Privacy does not import `getSiteCopy`. The French summary duplicates bullet text that could be centralized in `siteCopy.ts`.

**3. The "Contact" section is two sentences and a link — too thin as a standalone section. 🔧**
"If you have privacy questions, contact the project team." plus a link does not warrant its own `ha-content-section`. It would fit better as a closing callout (matching the Terms page pattern) or as an addition to the "Issue report submissions" section.

**4. `NextLink` used for `/report` and `/contact` links in the body. 🔧**
See shared observation #4. Both are in `PrivacyEnglishContent` and will not locale-prefix.

**5. No effective date on the page. ⚠️**
See shared observation #7.

**6. No mention of cookies, localStorage beyond theme preference, or third-party CDN assets. 🔧**
The theme preference is correctly mentioned. However, if any third-party fonts, CDN scripts, or analytics are loaded conditionally (even in development), these should be disclosed or explicitly excluded. The current text says "no advertising trackers or third-party analytics by default" — the qualifier "by default" warrants a short clarification.

**7. French and English bullet structures are slightly asymmetric. 🔧**
The French summary has five bullets (four collect items collapsed + one "we do not collect" item merged). The English content has a separate "What we do not collect" section with three items. A reader comparing both gets different groupings.

### Governance (`governance/page.tsx`)

**1. Most comprehensive and well-structured of all utility pages. ✅**
Eight named sections with `id` anchors, consistent use of `ha-section-subtitle ha-section-lede` for opening paragraph under each heading, and a rich French summary that links directly to each anchor. This is a model the other legal pages could follow.

**2. `ha-section-subtitle ha-section-lede` class combination used only on governance. 🔧**
This double-class pattern appears on the lede paragraph under each section heading in governance. Terms and Privacy use `text-ha-muted text-sm leading-relaxed sm:text-base` throughout without differentiating an opening lede from body text. Governance is more visually hierarchical; the other pages should align.

**3. `siteCopy.mission.line1` and `siteCopy.whatThisSiteIs.*` are pulled from `getSiteCopy`. ✅**
Governance correctly avoids duplicating mission/disclaimer copy and pulls it from the canonical `siteCopy.ts`. This is the intended pattern and should be followed on Terms as well (Terms already does this for the bullet list, but could do it for the opening paragraph too).

**4. "Advisory circle" section is appropriately hedged as future intent. ✅**
"Seeking a small advisory circle (2–4 people)" is honest about the current state. The section does not overclaim existing governance structure.

**5. `NextLink` used for `/report` and `/contact` in the final callout. 🔧**
See shared observation #4. At lines 228 and 232 `NextLink` bypasses locale prefix.

**6. The final callout section wraps `<div className="ha-callout">` inside `<section className="ha-content-section space-y-4">`. 🔧**
This double-wrapping adds an extra card background behind the callout. Terms does the same. The callout already has its own border/background. If the section wrapper has its own background, the visual nesting may look like a card inside a card. Governance and Terms should use a plain `<div>` wrapper or remove the section wrapper for the callout footer.

**7. The change-tracking section at lines 132–151 references "edition-aware" feeds but does not link to `/changes` or `/digest`. 🔧**
A reader landing on Governance to understand the project would benefit from a direct link to `/changes` when change tracking is mentioned.

**8. `siteCopyEn` is fetched but `siteCopy` (locale-variant) is only used in the French summary. ✅**
The pattern is correct: English body always uses `siteCopyEn`, French summary uses `siteCopy` (French). No cross-contamination.

### Report (`report/page.tsx`)

**1. Inline ternary locale switching throughout the page body. 🔧**
Unlike Terms/Privacy/Governance which extract a `get*Copy` function, Report inlines all locale strings as ternary expressions directly in JSX (`locale === "fr" ? "..." : "..."`). This makes the file harder to read and makes future copy changes require editing JSX rather than a plain object.

**2. `searchParams` query parameters (`snapshot`, `url`, `page`) are handled cleanly. ✅**
Lines 55–58 safely coerce the `snapshot` param to a finite number and trim the URL strings. The `ReportIssueForm` receives typed pre-fill values.

**3. The "What happens next" section is helpful contextual framing before the form. ✅**
Placing the response-time expectations (48-hour urgency, general review) above the form rather than below it sets correct expectations before the user invests time in the form.

**4. The `mailto:` link in the body is hardcoded as a raw `<a>` tag rather than extracted to a constant. 🔧**
`contact@healtharchive.ca` appears as a literal string at line 79. If the email address changes, all pages must be found and updated manually. It should live in a shared constants file or in `siteCopy.ts`.

**5. `ReportIssueForm` is a client component and the import is from `@/components/report/ReportIssueForm`. ✅**
The server page correctly passes pre-fill props from URL params and delegates interactivity to the client component. This is the right server/client split.

**6. The closing callout links to `/governance` using `LocalizedLink`. ✅**
Unlike the English-content sub-components in Terms and Governance, Report's callout correctly uses `LocalizedLink` (`Link`) for the `/governance` link, which will properly prefix `/fr/` in French.

**7. No `EnglishControlsNotice` on the Report page. 🔧**
Terms, Privacy, and Governance all render `<EnglishControlsNotice locale={locale} />` at the top of the page. Report does not. Since Report has bilingual content (inline ternaries rather than English-only body), the notice is technically less necessary, but the absence creates inconsistency. If Report is considered bilingual-complete (unlike the English-only legal pages), this difference should be documented as intentional.

**8. `searchParams` is typed but the default value omits it in the function signature. ⚠️**
The function signature includes `searchParams: Promise<ReportSearchParams>` without a default (`= {}`). Other pages use `= {}` as the default. This means calling `ReportPage` without `searchParams` in tests will throw. (The missing default is likely not a test-day problem since it is always server-rendered, but it is an inconsistency.)

### Contact (`contact/page.tsx`)

**1. Two-card grid layout using `ha-grid-2` and `ha-card ha-home-panel`. ✅**
The Email and GitHub cards are laid out in a responsive two-column grid. The `ha-home-panel` class is appropriate here since the contact page has a more "home-like" panel style than a legal page.

**2. Card headings use `text-sm font-semibold text-slate-900` directly instead of a `.ha-*` class. 🔧**
The `<h2>` elements inside the cards (lines 57, 93) apply raw Tailwind color utilities. `text-slate-900` is hardcoded and will not adapt correctly in dark mode. These should use `text-ha-body` or the equivalent CSS variable.

**3. The GitHub link uses `LocalizedLink` but points to an absolute external URL. 🔧**
`LocalizedLink` is designed for internal routes. Wrapping an external `https://github.com/...` URL in `LocalizedLink` is harmless but semantically incorrect. External links should use a plain `<a>` tag with `target="_blank" rel="noopener noreferrer"`.

**4. The contact page is entirely bilingual via inline ternaries, with no `EnglishControlsNotice`. ✅**
This is intentional: Contact is a functional page, not a legal/policy page, so full bilingual rendering without the "English controls" notice is appropriate.

**5. No `ha-content-section` wrapper on the grid section — just `ha-content-section-lead`. ✅**
A single section block is appropriate for a page with only two cards. The lack of additional section blocks is fine given the page's purpose.

**6. SVG icons in the card headers are not from a shared icon system. 🔧**
Lines 52–54 and 86–90 contain raw inline SVG path data. These icons appear only on this page. If an icon component system is introduced, these should be migrated. For now they are low risk.

**7. The email address `contact@healtharchive.ca` appears again as a hardcoded literal. 🔧**
See Report page observation #4. The same issue applies here.

**8. No fallback if a user does not have a GitHub account. 🔧**
The page presents only two contact options: email and GitHub. A user who does not want to use either is directed implicitly to the report form (linked inside the email card), but this could be stated more clearly.

### Changelog (`changelog/page.tsx`)

**1. Data-driven rendering via `changelogEntriesByLocale[locale]`. ✅**
The page itself contains no hardcoded changelog content. All entries are sourced from `src/content/changelog`. This is the correct pattern: copy changes require only editing the data file, not the page component.

**2. The outer list of entries lacks a wrapping `ha-content-section` or `ha-content-section-lead`. 🔧**
Line 49: `<section className="space-y-6">`. Unlike every other utility page, the main content block does not use `ha-content-section` or `ha-content-section-lead`. The entries render as `ha-card` elements inside a plain section. This means the first section does not get the visual distinction (border, background, shadow) that the other pages use for their lead block.

**3. Changelog entries use `ha-card` with `ha-tag` for the date. ✅**
Each entry renders the date in an `ha-tag` pill and the title as `font-medium text-slate-900`. The tag/pill treatment is appropriate and visually distinct.

**4. Entry titles use `text-slate-900` hardcoded, which will not adapt in dark mode. 🔧**
Line 54: `<span className="font-medium text-slate-900">`. Same issue as Contact card headings. Should use a CSS variable or `ha-*` class.

**5. The closing callout links to three GitHub repositories via `LocalizedLink`. 🔧**
All three links (frontend repo, backend repo, dataset releases) are external GitHub URLs wrapped in `LocalizedLink`. Same issue as Contact observation #3: use plain `<a target="_blank" rel="noopener noreferrer">` for external URLs.

**6. No heading above the changelog entries list. 🔧**
The page jumps straight from `<PageShell>` to the entry list with no `<h2>` heading above the list. The entries are self-labeled by date and title, but for screen-reader navigation an `<h2>` ("Entries" or "Update history") would provide a section landmark.

**7. French localization of the changelog entries depends on the data file providing FR entries. ✅**
The page does not attempt to translate entries in JSX; it trusts `changelogEntriesByLocale` to provide locale-appropriate content. This is the right separation of concerns.

### Browse/[id] redirect (`browse/[id]/page.tsx`)

**1. Pure redirect page — no rendered UI. ✅**
The page never returns JSX to the client. It either redirects to the live `browseUrl` returned by the API, falls back to the snapshot detail page, or falls back to the detail page for demo records. There is no UI to analyze for styling consistency.

**2. `robots: { index: false, follow: false }` is correctly applied in metadata. ✅**
Because this is a redirect page with no canonical content of its own, excluding it from search indexing is correct.

**3. Error handling uses a silent catch-all. 🔧**
Lines 58–60: the `fetchSnapshotDetail` call is wrapped in `try/catch` with an empty catch block (`// Fall through to the details page.`). Silent error swallowing hides potential network failures, timeout errors, or unexpected non-404 API errors. At minimum a dev-mode log would improve debuggability.

**4. Three separate `redirect(detailsTarget)` calls where one would suffice. 🔧**
Lines 60, 66, and 70 all call `redirect(detailsTarget)`. The numeric-ID path already redirects at line 60 after the try/catch falls through. The demo path at line 65–68 also redirects. Line 70 is a final fallback. The logic could be simplified to a single exit-point redirect after the conditional blocks.

**5. `resolveLocale` is called by passing `Promise.resolve(routeParams)` — slightly unusual. 🔧**
Line 47: `resolveLocale(Promise.resolve(routeParams))` wraps an already-resolved object in `Promise.resolve`. This works because `resolveLocale` accepts a `Promise<{ locale?: string }>`, but it is an awkward double-wrapping compared to how other pages call it. The page could store `locale` before the numeric-ID block and reuse it cleanly.

**6. No loading or error UI for when the API call is slow or fails. ✅ (by design)**
Because `redirect()` is called unconditionally at the end of every code path, the page will never hang waiting for UI to render. The API fetch is fire-and-redirect. This is appropriate for a redirect-only route.
