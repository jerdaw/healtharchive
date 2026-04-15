# Content Pages Improvement Plan

Date: 2026-02-24

Pages in scope:

- `/about` — `src/app/[locale]/about/page.tsx`
- `/methods` — `src/app/[locale]/methods/page.tsx`
- `/researchers` — `src/app/[locale]/researchers/page.tsx`
- `/brief` — `src/app/[locale]/brief/page.tsx`
- `/exports` — `src/app/[locale]/exports/page.tsx`
- `/digest` — `src/app/[locale]/digest/page.tsx`
- `/cite` — `src/app/[locale]/cite/page.tsx`

Each improvement is labelled with a priority:

- **P1** — correctness, accessibility, or design-system consistency issues worth fixing soon
- **P2** — tidiness and maintainability improvements, low risk
- **P3** — nice-to-have or future-state improvements

---

## Shared Improvements (Applicable to All 7 Pages)

### S1 — Extract section copy into objects (P2)

**Problem:** Every page defines a top-level `getCopy(locale)` function for the `PageShell` props but then uses inline `locale === "fr" ? "..." : "..."` ternaries for every section heading, paragraph, and list item. This is hard to audit for translation completeness, verbose to read, and means the French copy has no single place it can be reviewed or edited without touching JSX.

**Improvement:** Extend each page's `getCopy()` function (or rename it `getPageCopy()`) to return a full copy object covering all visible strings, including section headings and body paragraphs.

Example pattern:

```ts
// Before (current)
function getAboutCopy(locale: Locale) {
  if (locale === "fr") {
    return { eyebrow: "À propos du projet", title: "...", intro: "..." };
  }
  return { eyebrow: "About the project", title: "...", intro: "..." };
}

// After
function getAboutCopy(locale: Locale) {
  const fr = locale === "fr";
  return {
    eyebrow: fr ? "À propos du projet" : "About the project",
    title: fr ? "Pourquoi HealthArchive.ca…" : "Why HealthArchive.ca exists",
    intro: fr ? "Ce projet est né…" : "This project grew out of…",
    motivation: {
      heading: "Motivation", // same in both locales — plain string, no ternary
      lede: fr ? "Les cliniciens…" : "Clinicians, public health…",
      body: fr ? "HealthArchive.ca vise…" : "HealthArchive.ca is an attempt…",
    },
    // … etc.
  };
}
```

Then JSX becomes:

```tsx
<h2 className="ha-section-heading">{copy.motivation.heading}</h2>
<p className="ha-section-subtitle ha-section-lede leading-relaxed">{copy.motivation.lede}</p>
```

This pattern reduces JSX noise, isolates all copy in one place per page, and makes it straightforward to compare EN and FR strings.

---

### S2 — Wrap prose sections in `ha-prose` (P2)

**Problem:** Each prose section manages its own paragraph spacing and typography via a brittle two-class pattern: the first paragraph gets `ha-section-subtitle ha-section-lede leading-relaxed`, subsequent paragraphs get `text-ha-muted text-sm leading-relaxed sm:text-base`. Adding or removing a paragraph breaks the intended visual treatment.

**Improvement:** Where a section contains a heading followed by two or more paragraphs (without lists or callouts), wrap the prose content in `<div className="ha-prose">` and drop the per-paragraph class variation. `ha-prose` in `globals.css` already handles `p + p` margin, line-height (1.75), and heading spacing automatically.

Note: `ha-prose` does not apply the "lede" (larger first-paragraph) treatment. The first `ha-section-subtitle ha-section-lede` paragraph in each section can remain explicit if the visual distinction between lede and body text is desired. The secondary paragraphs are the best candidates for the `ha-prose` wrapper.

Example:

```tsx
<section className="ha-content-section space-y-5">
  <h2 className="ha-section-heading">{copy.independence.heading}</h2>
  <p className="ha-section-subtitle ha-section-lede leading-relaxed">{copy.independence.lede}</p>
  <div className="ha-prose text-sm text-ha-muted sm:text-base">
    <p>{copy.independence.body1}</p>
    <p>{copy.independence.body2}</p>
  </div>
</section>
```

---

### S3 — Replace repeated link class with a shared constant or utility class (P1)

**Problem:** `className="text-ha-accent font-medium hover:text-blue-700"` appears on virtually every `<a>` and `<Link>` element across all 7 pages. `hover:text-blue-700` is a raw Tailwind color value that bypasses the CSS variable token system (`--accent`). If the accent color changes, this hover state will not update automatically.

**Improvement option A (preferred):** Add a `.ha-link` utility class to `globals.css`:

```css
.ha-link {
  color: var(--accent);
  font-weight: 500;
}
.ha-link:hover {
  color: var(--accent-hover); /* add --accent-hover token or use color-mix */
}
```

Then use `className="ha-link"` at all call sites.

**Improvement option B:** At minimum, define a `const linkCls = "text-ha-accent font-medium hover:text-blue-700"` at module scope in each page file (or in a shared `src/lib/styles.ts`) and spread it into className. This eliminates the repetition without requiring a CSS change.

Option A is preferred because it keeps color tokens in CSS variables rather than Tailwind classes.

---

### S4 — Replace `ha-home-panel` on inner-page code/data blocks (P2)

**Problem:** `ha-card ha-home-panel` is used across `/researchers`, `/exports`, and `/cite` to style inline code blocks, citation templates, and data manifest links. `ha-home-panel` is a homepage surface class with a box shadow and border designed for homepage panels. While it renders acceptably on inner pages, it is semantically wrong.

**Improvement:** Add a `.ha-card-inset` class to `globals.css` for use on inner-page data/code display blocks. This can reuse the same border and background from `ha-card` but with tighter padding appropriate for code-like content, and without the large box shadow of `ha-home-panel`.

```css
.ha-card-inset {
  border-radius: 0.65rem;
  border: 1px solid var(--border);
  background-color: var(--card-bg);
  padding: 0.875rem 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  line-height: 1.6;
}
```

Replace `ha-card ha-home-panel` with `ha-card-inset` on citation template blocks, export manifest URL displays, and similar elements.

---

### S5 — Standardize section spacing (P2)

**Problem:** Most sections use `space-y-5`, but final sections (especially callout-only sections) use `space-y-4`. The inconsistency is minor but noticeable in a multi-section layout.

**Improvement:** Settle on a single spacing token for all `ha-content-section` and `ha-content-section-lead` sections: `space-y-5`. The `ha-callout` itself has internal padding in `globals.css`, so callout-only sections can use the same `space-y-5` without visual over-spacing.

---

### S6 — Audit `ha-home-panel` → `ha-card-inset` and remove stray `ha-home-*` classes from inner pages (P2)

Related to S4. Do a project-wide pass with:

```
grep -rn "ha-home-panel" src/app/\[locale\]/
```

Any `ha-home-panel` usage on non-homepage routes should be evaluated and migrated to the new `ha-card-inset` class (see S4) or a plain `ha-card`.

---

## Per-Page Specific Improvements

### `/about`

**A1 — Remove redundant locale ternary on "Motivation" heading (P2)**

Line 47:

```tsx
// Before
<h2 className="ha-section-heading">{locale === "fr" ? "Motivation" : "Motivation"}</h2>

// After
<h2 className="ha-section-heading">Motivation</h2>
```

The word "Motivation" is identical in English and French. The ternary serves no purpose.

---

**A2 — Use `getSiteCopy` for the disclaimer paragraph (P2)**

The "Project status" section ends with forward-looking caveats. `/brief`, `/digest`, and `/cite` all use `siteCopy.whatThisSiteIs.forCurrent` for the canonical "for current guidance, visit..." disclaimer. `/about` re-authors this text inline. Import `getSiteCopy` and use the shared string to keep the disclaimer consistent across pages.

---

**A3 — Add a `ha-callout` to the "Project status" section (P2)**

The second paragraph of the "Project status" section ("As the project matures, the methods, governance, and sustainability plans will be documented in more detail…") is a forward-looking caveat with the same function as the limitations callout on `/methods`. Wrapping it in a `ha-callout` would visually and semantically align it with how caveats are treated across the site.

---

### `/methods`

**M1 — Replace the JSX-fragment ternary with a copy-object approach for the capture cadence paragraph (P2)**

Lines 80–96 use a JSX fragment ternary to embed a `<span>` around the date text. After implementing shared improvement S1, this can be expressed as:

```tsx
<p className="text-sm leading-relaxed text-ha-muted sm:text-base">
  {copy.scope.cadencePre} <span className="font-medium">{copy.scope.cadenceDate}</span>
  {copy.scope.cadencePost}
</p>
```

Where `cadencePre`, `cadenceDate`, and `cadencePost` are locale-aware strings in the copy object. This eliminates the JSX fragment from a ternary, making the structure uniform with all other paragraphs.

---

**M2 — Abstract or qualify the `pywb` mention (P3)**

The "Storage & replay" section names `pywb` as the replay engine. If the replay stack changes, this will silently become inaccurate. Either:

- Replace with "a standards-based web archive replay engine (such as pywb)".
- Add a note that the specific implementation may vary.

---

**M3 — Normalize section spacing from `space-y-4` to `space-y-5` on the limitations section (P2)**

Line 198: `<section className="ha-content-section space-y-4">`. Change to `space-y-5` for consistency.

---

### `/researchers`

**R1 — Replace `getApiBaseUrl()` with a public-facing URL for the export manifest link (P1)**

`getApiBaseUrl()` returns `NEXT_PUBLIC_API_BASE_URL` or falls back to `http://localhost:8001`. In some environments this could be a private address. The export manifest link is user-facing and should use a canonical public URL. Consider routing the manifest through a Next.js API route (`/api/exports-manifest`) that proxies the backend, or hardcode the public API base from `SITE_BASE_URL` / a public-only env var.

---

**R2 — Fix `<h3>` styling for "Request checklist" heading (P1)**

Line 210:

```tsx
// Before
<h3 className="text-sm font-semibold text-slate-900">
  {locale === "fr" ? "Liste de vérification pour une demande" : "Request checklist"}
</h3>

// After
<h3 className="ha-callout-title">
  {locale === "fr" ? "Liste de vérification pour une demande" : "Request checklist"}
</h3>
```

The `text-slate-900` class bypasses the CSS variable token system and will not update with dark mode or theme changes. `ha-callout-title` is the correct class for section sub-headings that are not inside a `ha-callout` block, or the heading can be promoted into a `ha-callout` wrapping the full checklist.

---

**R3 — Add a blank line between `generateMetadata` and page component (P3)**

Line 37 ends with `}` closing `generateMetadata`, and line 38 immediately begins `export default async function ResearchersPage`. Add a blank line for consistency with all other pages.

---

**R4 — Deduplicate "quarterly dataset releases" description (P2)**

The "Research access & exports" section and the "Citing HealthArchive.ca" section both describe quarterly metadata releases. Consolidate to a single reference with a cross-link: mention it once in "Research access & exports" and link to `/exports` from the citation section rather than repeating the releases description.

---

### `/brief`

**B1 — Change absolute home URL to `<Link href="/">` (P2)**

Line 182–186:

```tsx
// Before
<a className="text-ha-accent font-medium hover:text-blue-700" href="https://www.healtharchive.ca/">
  https://www.healtharchive.ca/
</a>

// After
<Link className="text-ha-accent font-medium hover:text-blue-700" href="/">
  https://www.healtharchive.ca/
</Link>
```

The site's own home page should use `LocalizedLink` (imported as `Link` in this file) rather than a raw `<a>` with a hardcoded absolute URL, so locale-prefixed routing is preserved and link prefetching works.

---

**B2 — Fix potential double-period from `siteCopy.whatThisSiteIs.forCurrent` (P1)**

Line 251:

```tsx
<li>{siteCopy.whatThisSiteIs.forCurrent}.</li>
```

If `siteCopy.whatThisSiteIs.forCurrent` already ends with a period (check `src/lib/siteCopy.ts`), this renders a double period. Remove the trailing `.` from the JSX if the string already terminates with punctuation, or ensure the copy string does not end with a period and always add it at the call site. Be consistent across `/brief`, `/digest`, and `/cite` which all use this string.

---

**B3 — Document that `/governance` and `/report` are planned but not yet live (P3)**

The "Key links" and "Contact" sections link to `/governance` and `/report`. If these routes are not yet implemented, users will encounter 404s. Add a `/* TODO: add route */` comment in the file, and consider conditionally rendering these links only when the routes exist, or flagging them with a "coming soon" visual treatment.

---

### `/exports`

**E1 — Fix the hybrid-language `change_type` list item (P1)**

Lines 196–199 in the changes export fields list produce a partially bilingual sentence in French:

```tsx
<strong>change_type</strong>, <strong>summary</strong>, section/line counts, and change
{locale === "fr" ? " ratio de changement." : " ratio."}
```

The phrase "section/line counts, and change" is never translated. For the French locale this renders as: "change_type, summary, section/line counts, and change ratio de changement." which mixes English and French mid-sentence. The full item text should be extracted into the copy object with a complete French translation.

---

**E2 — Consolidate adjacent callouts in the first section (P2)**

The first section (`ha-content-section-lead`) contains two consecutive `ha-callout` blocks (Dataset releases, then Download/print) with no prose between them. This creates a stacked-callout visual effect that is heavier than needed. Options:

- Combine into a single callout with two sub-items under one title.
- Move the "Download / print" callout to a dedicated final section of the page (consistent with how `/brief` and `/cite` handle it).

---

**E3 — Replace the bare API URL display with a more robust pattern (P2)**

Lines 64–71: The export manifest URL is displayed as both the `href` and the link text:

```tsx
<a className="font-medium text-ha-accent hover:text-blue-700" href={manifestUrl}>
  {manifestUrl}
</a>
```

If `manifestUrl` is long or environment-specific, this renders poorly. Consider displaying a fixed, human-readable label ("Export manifest API") as the link text and using `manifestUrl` only as the `href`. This is also more resilient to environment-specific URL differences.

---

**E4 — Add a `ha-callout` wrapper to the Limitations section (P2)**

The `/methods` page wraps its limitations in a `ha-callout`. The `/exports` Limitations section is a plain `<ul>` without callout styling. For visual and semantic consistency across the site, limitations/caveats should receive consistent treatment. Wrap the Limitations list in a `ha-callout` with title "Limitations" matching the `/methods` pattern.

---

### `/digest`

**D1 — Fix the trailing-period join with `siteCopy.whatThisSiteIs.forCurrent` (P1)**

Same concern as B2 (`/brief`). In the lead callout (lines 65–67):

```tsx
{locale === "fr"
  ? "Le bulletin liste… "
  : "The digest lists… "}
{siteCopy.whatThisSiteIs.forCurrent}.
```

The inline string ends with a space, then `siteCopy.whatThisSiteIs.forCurrent` is rendered, then a period is appended. If the copy string already ends in a period, this double-periods. Audit the copy string and remove the trailing period from JSX consistently across all three pages (`/brief`, `/digest`, `/cite`) that use this pattern.

---

**D2 — Promote the "What the digest is" heading to `ha-section-heading` (P2)**

Line 59: The lead section callout uses `ha-callout-title` for an `<h2>`. On every other page, section-level `<h2>` headings use `ha-section-heading`. The `ha-callout-title` styling (0.95rem, 600 weight) is smaller than `ha-section-heading`. Options:

- Move the `h2` outside the callout (before the `ha-callout` div) using `ha-section-heading`, and keep the body text inside the callout as descriptive content.
- Accept the current pattern as intentional (the entire lead section is a callout), but document it as an exception.

The first option is recommended for consistency.

---

**D3 — Add a visual separator or label between the global RSS card and the per-source grid (P2)**

The "RSS feeds" section renders one standalone `ha-card` (global feed) above a `ha-grid-2` grid of per-source cards. There is no visual separator or sub-heading distinguishing them. A small sub-heading or divider would make the structure clearer:

```tsx
<h3 className="text-xs font-semibold uppercase tracking-wide text-ha-muted">
  {locale === "fr" ? "Par source" : "By source"}
</h3>
```

---

**D4 — Update or remove "Next steps" section when email digests launch (P3)**

The "Next steps" section states that email digests are intentionally deferred. This section should be removed or replaced with an opt-in form when email digests become available. Add a `/* TODO: remove when email digests launch */` comment as a reminder.

---

### `/cite`

**C1 — Move the prefill callout inside a `ha-content-section` wrapper (P1)**

Lines 147–184: The conditionally rendered prefill callout uses `<section className="ha-callout">` directly — i.e., the `<section>` itself gets the callout class, rather than the standard pattern of `<section className="ha-content-section">` containing a `<div className="ha-callout">`. This means the prefill section has different padding and margin behavior than every other section on the page. Fix:

```tsx
{
  (citationText || prefillError) && (
    <section className="ha-content-section space-y-5">
      <div className="ha-callout">
        <h2 className="ha-callout-title">
          {locale === "fr" ? "Citation suggérée" : "Suggested citation"}
        </h2>
        {/* ... */}
      </div>
    </section>
  );
}
```

---

**C2 — Compute `accessedDate` on the client, not the server (P1)**

Line 117: `const accessedDate = new Date().toISOString().slice(0, 10);` is evaluated at server render time (or at build/revalidation time in static/ISR modes). For a citation page, the "accessed date" is semantically the date the user visited — which should be today's date from the user's perspective, not the server's render time.

Options:

- Render the `accessedDate` field as an editable `<input type="date">` pre-populated with today's date on the client (using a `defaultValue` from a `useEffect` or a Client Component boundary).
- Add a note near the prefilled citation: "Accessed date is approximate — please verify before citing."
- Accept the current behavior and document it as a known limitation.

The client-input approach is recommended because it accurately reflects the citation requirement.

---

**C3 — Tighten the "Important note" section to avoid disclaiming twice (P2)**

Lines 190–197: The "Important note" section has two paragraphs:

1. "These citations refer to archived content — not current guidance or medical advice." (`ha-section-subtitle ha-section-lede`)
2. `siteCopy.whatThisSiteIs.forCurrent` (`text-ha-muted text-sm`).

These two sentences cover the same disclaimer point. Consider merging them or using only `siteCopy.whatThisSiteIs.forCurrent` for the canonical wording, dropping the custom first paragraph.

---

**C4 — Centralize snapshot URL construction (P2)**

Line 119:

```ts
const localePrefix = locale === "fr" ? "/fr" : "";
const snapshotUrl = `${SITE_BASE_URL}${localePrefix}/snapshot/${detail.id}`;
```

This constructs a locale-prefixed absolute URL manually. If the locale routing logic changes (e.g., if English gains a `/en/` prefix), this will silently produce wrong URLs. Consider adding a `buildSnapshotUrl(locale, id)` utility in `src/lib/metadata.ts` or `src/lib/i18n.ts` that centralizes snapshot URL construction using the same locale logic as the `LocalizedLink` component.

---

## Implementation Order Recommendation

The following ordering minimizes risk and delivers the highest-value improvements first:

1. **P1 fixes first (S3 partial, R1, R2, E1, D1, B2, C1, C2):** These address correctness, token system violations, and user-facing issues.
2. **S1 (copy extraction):** Do one page as a proof-of-concept (suggest `/about` as the simplest), confirm the pattern, then roll out to all 7 pages. This is the highest-leverage maintainability improvement.
3. **S4 + E4 (ha-card-inset class, callout normalization):** Add the CSS class first, then update all call sites together.
4. **Remaining P2 improvements:** Can be batched by page in any order.
5. **P3 improvements:** Address as part of future content updates when the corresponding features (email digests, `/governance`, `/report` routes) launch.
