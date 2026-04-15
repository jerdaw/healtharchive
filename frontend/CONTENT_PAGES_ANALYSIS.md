# Content Pages Analysis

Date: 2026-02-24

Pages covered:

- `/about` — `src/app/[locale]/about/page.tsx`
- `/methods` — `src/app/[locale]/methods/page.tsx`
- `/researchers` — `src/app/[locale]/researchers/page.tsx`
- `/brief` — `src/app/[locale]/brief/page.tsx`
- `/exports` — `src/app/[locale]/exports/page.tsx`
- `/digest` — `src/app/[locale]/digest/page.tsx`
- `/cite` — `src/app/[locale]/cite/page.tsx`

---

## Shared Observations (Patterns Across All 7 Pages)

### Structure and Layout

1. ✅ All 7 pages use `<PageShell eyebrow title intro>` as the outer wrapper, giving consistent page-level heading, eyebrow label, and intro paragraph treatment.

2. ✅ `ha-home-hero` has been fully replaced with `ha-content-section` / `ha-content-section-lead` across all pages. The first section in each page uses `ha-content-section-lead` (which carries a subtle top-left gradient accent), and every subsequent section uses `ha-content-section`. This matches the design system intent for inner pages.

3. 🔧 All 7 pages carry inline `locale === "fr" ? ... : ...` ternaries directly in JSX for every piece of visible text. There is no intermediate copy object created per section — only the top-level `getCopy()` function is factored out. This makes per-section content hard to scan, test, or hand to a translator.

4. 🔧 Prose paragraphs consistently use a mix of `ha-section-subtitle ha-section-lede` (for the first/lead paragraph in a section) and `text-ha-muted text-sm leading-relaxed sm:text-base` (for subsequent paragraphs). This two-class combination on body text duplicates what `.ha-prose` is designed to handle and makes section prose fragile to maintain.

5. ✅ `ha-section-heading` is correctly applied to every `<h2>` inside section wrappers. `ha-callout-title` is correctly applied to `<h3>` inside `ha-callout` blocks. Heading hierarchy is consistent across all pages.

6. ✅ `ha-callout` is used consistently across pages for important notices (limitations, download links, contact info). `ha-callout-title` is used for the callout heading in each case.

7. 🔧 Link styling is repeated verbatim — `className="text-ha-accent font-medium hover:text-blue-700"` — on virtually every `<a>` and `<Link>` element across all 7 pages. There is no shared `linkCls` constant or utility class for this pattern. `hover:text-blue-700` in particular is a raw Tailwind color that bypasses the design-token system.

8. ✅ `buildPageMetadata(locale, "/route", title, intro)` is used consistently in `generateMetadata` across all pages, wiring canonical URLs and description meta tags correctly.

9. ✅ `resolveLocale(params)` is called consistently at the top of every page component and its metadata function. The `params?: Promise<{ locale?: string }>` signature (optional param, optional locale) is uniform.

10. 🔧 `ha-home-panel` is still used as a secondary class on `ha-card` elements (e.g., code/citation blocks in `/researchers`, `/exports`, `/cite`) — `className="ha-card ha-home-panel ..."`. `ha-home-panel` is semantically a home-page surface; a more neutral `ha-card-inset` or `ha-card-code` variant would be more appropriate for inner content pages.

---

## Per-Page Notes

### `/about` — `src/app/[locale]/about/page.tsx`

1. ✅ Three sections are well-structured and map clearly to logical concerns: Motivation, Independence/non-partisanship, Project status.
2. ✅ No external API calls, no dynamic data — pure static content. Fast and simple.
3. 🔧 The `h2` for "Motivation" uses a redundant ternary that resolves to the same string in both locales: `{locale === "fr" ? "Motivation" : "Motivation"}`. This should be a plain string literal.
4. 🔧 Each section has two paragraphs: the first uses `ha-section-subtitle ha-section-lede`, the second uses `text-ha-muted text-sm leading-relaxed sm:text-base`. This paragraph-class alternation is implicit and easily broken if a paragraph is added. Wrapping sections in `ha-prose` would make this automatic.
5. ✅ No imports beyond the standard set (PageShell, Locale, buildPageMetadata, resolveLocale). Minimal and correct.
6. 🔧 No `getSiteCopy()` usage — the mission/disclaimer text is re-authored inline. `/brief`, `/digest`, and `/cite` use `getSiteCopy` for the same disclaimer content. `/about` should be consistent.
7. ✅ No stray `lang="en"` attributes needed; all copy is inline bilingual.
8. ⚠️ No `ha-callout` for the "Project status" section even though it contains forward-looking caveats ("may change as the archive matures") that read as disclaimer content. A callout block would be semantically appropriate and visually consistent with how `/methods` handles limitations.
9. 🔧 All copy is inline — no copy object is extracted for the section-level strings. Difficult to audit or update French without touching JSX.
10. ✅ `params` prop is typed with `= {}` default on the page component, consistent with the project convention.

---

### `/methods` — `src/app/[locale]/methods/page.tsx`

1. ✅ Five sections present a logical progression: scope → capture → storage/replay → change tracking → limitations callout.
2. ✅ `ha-callout` is correctly used for the "Limitations and interpretation" section, with `<strong>` bolded terms inside list items. This is the best-practice pattern for disclaimer content on the site.
3. 🔧 The "Scope" section contains a paragraph that embeds a `<span className="font-medium">` around "Jan 01 (UTC)" / "1er janvier (UTC)". This is done inside a locale ternary that returns a JSX fragment (`<>...</>`), making it one of the few places where JSX is returned from a ternary rather than a plain string. The pattern is fine but inconsistent with the string-only ternaries elsewhere on this page.
4. 🔧 Two `<ul>` lists and one `<ol>` list share identical Tailwind classes: `text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base`. This should be extracted into a shared utility or `ha-prose` wrapper.
5. ✅ The `ha-callout` limitations block uses `text-xs leading-relaxed sm:text-sm` for list items, which is intentionally smaller than the body text — consistent with how callouts are styled elsewhere.
6. 🔧 The "Change tracking" section (section 4) has a `<ul>` but no lead `ha-section-subtitle ha-section-lede` paragraph introducing it — the `ha-section-subtitle ha-section-lede` paragraph is the only intro before the list, which is correct, but the list items use `text-ha-muted` while the intro uses `ha-section-subtitle ha-section-lede`. A section closer to the `/about` pattern would be more consistent.
7. ✅ `space-y-5` on each section is consistent throughout.
8. ⚠️ The "Storage & replay" section mentions `pywb` by name. This is an implementation detail that could become outdated if the replay stack changes. It should either be abstracted ("a standards-based replay engine") or noted as subject to change.
9. 🔧 Sections 3 and 4 (`ha-content-section`) use `space-y-5`, but section 5 (the callout section) uses `space-y-4`. Minor inconsistency — all non-lead sections should use the same spacing.
10. ✅ No external imports or API calls. Entirely static content.

---

### `/researchers` — `src/app/[locale]/researchers/page.tsx`

1. ✅ The page is the most content-rich of the seven, covering use cases, archive features, exports/access, and citation — appropriate depth for a researcher-facing page.
2. 🔧 `getApiBaseUrl()` is called at the server component level to construct `exportsManifestUrl`. This embeds the server-side API base URL directly into a public `<a href>`. If the API base URL is an internal/private address in some environments, this could expose it. It should use the public-facing URL or a relative proxy path instead.
3. ✅ `LocalizedLink` is correctly used for internal navigation and `<a>` is used for external links (GitHub, API manifest). The distinction is properly maintained.
4. 🔧 `ha-card ha-home-panel` is used for the export manifest URL display block and the citation template blocks. As noted in shared observations, `ha-home-panel` is a homepage surface class being repurposed for inner-page code/data blocks.
5. ✅ The citation template section includes two pre-filled example blocks with `lang="en"` attribute, which is correct since the citation format itself is English even on the French locale.
6. 🔧 The `h3` for "Request checklist" (`locale === "fr" ? "Liste de vérification pour une demande" : "Request checklist"`) uses a plain `<h3 className="text-sm font-semibold text-slate-900">` rather than a design-system class. `text-slate-900` is a raw Tailwind color bypassing the token system; it should use `text-ha-base` or `ha-callout-title` if inside a callout.
7. 🔧 A blank line is missing between the `generateMetadata` export and the `export default async function ResearchersPage` declaration (line 37-38). Minor style inconsistency with the other pages.
8. ✅ Four research use cases are clearly labeled with `<strong>` terms, making them scannable. Consistent with the `/brief` intended-audiences pattern.
9. ⚠️ The page describes "quarterly metadata-only dataset releases" in two separate places (the "Research access & exports" section and later in the "Citing" section). This duplication could become stale if the release cadence changes.
10. 🔧 The contact paragraph at the end of "Research access & exports" uses an inline JSX ternary returning a JSX fragment with a `<Link>` embedded. The French fragment is grammatically correct but the EN/FR sentence structures differ enough that a copy object would make translation audits easier.

---

### `/brief` — `src/app/[locale]/brief/page.tsx`

1. ✅ `getSiteCopy(locale)` is used correctly for `siteCopy.mission.line1` and `siteCopy.whatThisSiteIs.forCurrent`, making those shared disclaimer strings canonical.
2. ✅ The page has the most sections (6) of any static content page, covering "At a glance", "What it does", "What it is not", "Intended audiences", "Key links", "Safety posture", and "Contact". This breadth is appropriate for a partner-facing one-pager.
3. 🔧 The "Key links" section contains 8 `<li>` items mixing `<a href="https://www.healtharchive.ca/">` (absolute external) with `<Link href="/archive">` (internal). The absolute link to the home URL should be a `<Link href="/">` since it is an internal route.
4. ✅ The `/governance` and `/report` links in the "Key links" and "Contact" sections are present even though those routes do not appear to be implemented yet. This is acceptable if they are planned, but it may produce 404s in production if the routes are absent.
5. 🔧 The "Safety posture" `<ul>` item that renders `{siteCopy.whatThisSiteIs.forCurrent}.` appends a period outside the string. If `siteCopy.whatThisSiteIs.forCurrent` already ends with a period, this double-periods the sentence. The period should be inside the `siteCopy` string or removed from the JSX.
6. 🔧 The "At a glance" download callout uses `<a href="/partner-kit/healtharchive-brief.md">` (plain `<a>`, not `<Link>`). Since these are static file paths served from `public/`, this is technically correct, but should be noted as intentional (static asset, not a Next.js route).
7. ✅ The `params` type uses `Promise<{ locale?: string }>` (optional `locale`) which is correct for the shared locale resolver.
8. ⚠️ The "Key links" section links to `/impact` ("Monthly impact report") and `/status` ("Status and metrics"). These routes exist but are not among the 7 content pages being analyzed. Any renames of those routes would break the brief without a corresponding update here.
9. 🔧 Section spacing is consistent (`space-y-5`) except the final contact callout section which uses `space-y-4`. Same minor inconsistency noted on `/methods`.
10. ✅ This is the only page that explicitly includes a `<Link href="/report">` for issue reporting, which is a useful affordance for the partner audience.

---

### `/exports` — `src/app/[locale]/exports/page.tsx`

1. ✅ `DatasetJsonLd` is imported and rendered outside `<PageShell>` (wrapped in a fragment `<>...</>`), providing schema.org `Dataset` structured data for SEO. This is the only page with explicit JSON-LD injection.
2. 🔧 `getApiBaseUrl()` is used to construct `manifestUrl` for the export manifest link, with the same concern as on `/researchers` — the API base URL could be a private internal address. The manifest link is rendered as a bare `<a href={manifestUrl}>{manifestUrl}</a>` which also displays the raw URL as link text. If the URL is long or environment-specific, this is fragile.
3. ✅ The "Snapshots export (fields)" and "Changes export (fields)" sections provide a data dictionary inline. The field names are in `<strong>` and descriptions use a colon separator. Consistent formatting across both lists.
4. 🔧 `ha-card ha-home-panel` is used for the manifest URL display block, same concern as `/researchers`.
5. 🔧 The "Download / print" callout inside the first section (`ha-content-section-lead`) is a second `ha-callout` immediately following the first (Dataset releases callout). Two adjacent callouts with no prose between them creates a visual stacking that can appear repetitive.
6. ✅ The "Limitations" section correctly surfaces coverage and replay fidelity caveats as a `<ul>` rather than a callout, which is a lighter treatment appropriate for a data dictionary page.
7. ⚠️ The changes export field list mixes English and French in a partially inconsistent way for the `change_type`, `summary`, and `change ratio` item (line 197): `{locale === "fr" ? " ratio de changement." : " ratio."}` is appended to a hardcoded English snippet `change`. The item text is never fully bilingual, leaving a hybrid sentence in the French render.
8. 🔧 The page-level `intro` in `getExportsCopy` for French says "Les exports n'incluent pas l'HTML brut ni le corps complet des diffs." — this is a repeat of the same sentence in the `PageShell` intro and again referenced in the Limitations section. The information is correct but the repetition adds length without adding clarity.
9. ✅ The page component `params` type uses `Promise<{ locale?: string }>` (locale optional) matching the pattern.
10. 🔧 The "Limitations" section lacks a `ha-callout` wrapper even though it contains caveats that carry the same weight as the limitations callout on `/methods`. Treating limitations consistently across pages (always in a callout, or never) would be more coherent.

---

### `/digest` — `src/app/[locale]/digest/page.tsx`

1. ✅ This is the only page among the seven that makes a live API call (`fetchSources` / `fetchSourcesLocalized`) to populate per-source RSS feed links. The call is wrapped in `Promise.allSettled` with a graceful fallback to `null`, which is correct.
2. ✅ The fallback path (when `sources` is null or empty) renders a `ha-callout` with a message explaining feeds will appear once the backend is available. Graceful degradation is handled.
3. 🔧 `getSiteCopy(locale)` is imported and used for `siteCopy.whatThisSiteIs.forCurrent` in the callout, which is correct — but the callout text before it uses an inline ternary to prepend locale-specific prose. The join between the inline ternary and the `siteCopy` string may not produce grammatically clean sentences in French if `siteCopy.whatThisSiteIs.forCurrent` uses a trailing period.
4. ✅ The first section uses `ha-content-section-lead` and renders a `ha-callout` directly inside it (rather than as the section content itself). This is a valid layout — the callout is the primary content of that lead section.
5. 🔧 The lead section's `<h2>` is inside the `ha-callout` as `ha-callout-title`, rather than outside as a `ha-section-heading`. This diverges from the pattern on every other page where `h2` is a direct child of the section using `ha-section-heading`. Within the callout semantics this is acceptable but it means the `h2` receives `ha-callout-title` styling (0.95rem, font-weight 600) rather than the larger `ha-section-heading` treatment.
6. 🔧 The "RSS feeds" section uses `ha-card` (without `ha-home-panel`) for the global RSS feed card and also for per-source cards inside `ha-grid-2`. The global RSS card and the per-source cards have the same class, which is correct and consistent. However the global RSS card sits outside the grid while per-source cards are inside — the visual hierarchy may be unclear without a label distinguishing them.
7. ✅ Per-source RSS URLs are constructed dynamically using `encodeURIComponent(source.sourceCode)`, which is correct.
8. ✅ `ha-btn-secondary text-xs` is correctly used for the "View changes feed" CTA button at the bottom. This is the only page among the seven with a primary action button, which is appropriate for a digest/feed discovery page.
9. ⚠️ The page has a "Next steps" section explaining that email digests are deferred. This forward-looking content is accurate as of 2026-02-24, but will need to be updated or removed when email digests are launched.
10. 🔧 `fetchSources` and `fetchSourcesLocalized` are both imported but only one is called depending on locale. The unused import branch at runtime is fine, but both functions appear in the import statement together. This is a minor style concern — no functional impact.

---

### `/cite` — `src/app/[locale]/cite/page.tsx`

1. ✅ This is the most functionally complex of the seven pages. It accepts `searchParams` (`snapshot` and `url` query parameters), resolves a snapshot ID, fetches snapshot detail from the API, and renders a pre-filled citation. The server-side prefill logic is well-encapsulated in `buildPrefilledCitation`.
2. ✅ `formatUtcTimestamp` and `stripUrlFragment` are small, pure utility functions defined at module scope. They are correctly not exported (page-private helpers).
3. ✅ `buildPrefilledCitation` returns locale-aware citation text in EN or FR format. The French format uses French guillemets (`«»`) and appropriate French bibliographic conventions, which is a nice detail.
4. ✅ The prefill flow has three states: no params (show generic template only), params provided but no snapshot found (show error message in callout), params provided and snapshot resolved (show prefilled citation with Copy button and "Open snapshot" link). All three states are handled.
5. 🔧 `getSiteCopy(locale)` is imported and used for `siteCopy.whatThisSiteIs.forCurrent` in the "Important note" section — consistent with `/brief` and `/digest`. However the `important note` section also includes a second paragraph (`ha-section-subtitle ha-section-lede`) above the `siteCopy` line that partially duplicates the same disclaimer. The duplication is mild but could be tightened.
6. 🔧 The prefilled citation callout section (`ha-callout`) is outside `<PageShell>`'s slot structure — it renders before the `ha-content-section-lead` block and is conditionally shown. The callout does not use `ha-content-section` or `ha-content-section-lead` as a wrapper, unlike all other sections on this page. The `section` element wrapping the prefill callout has `className="ha-callout"` rather than `className="ha-content-section ... "` containing a `<div className="ha-callout">`. This inconsistency means the prefill section has different padding/margin behavior from the rest of the page.
7. 🔧 `ha-card ha-home-panel` is used for citation template display blocks (lines 243, 251, 285) — the same `ha-home-panel` concern shared across pages. The citation text block at line 178 also uses `ha-card ha-home-panel` with `break-words whitespace-pre-wrap`.
8. ⚠️ `new Date().toISOString().slice(0, 10)` is called directly inside the server component to produce `accessedDate`. In Next.js with static or ISR rendering, this date will be fixed at build/revalidation time, not at the user's actual access time. For a citation page where the "accessed date" should reflect when the user visited, this is a semantic concern. It should either be computed on the client or documented as an approximation.
9. ✅ `CopyButton` is correctly used for the copy-to-clipboard action on the prefilled citation. The button passes both `text` (the citation string) and `label` (for `aria-label`) correctly.
10. 🔧 The page imports `fetchSnapshotDetail` and `searchSnapshots` from `@/lib/api` but also `SITE_BASE_URL` from `@/lib/metadata`. Mixing imports from `api` and `metadata` for what is essentially URL construction could be centralized. The `SITE_BASE_URL` usage is correct but the mixing of concerns is a minor tidiness issue.
