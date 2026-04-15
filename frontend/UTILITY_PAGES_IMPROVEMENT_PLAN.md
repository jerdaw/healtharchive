# Utility Pages Improvement Plan

**Date:** 2026-02-24
**Based on:** `UTILITY_PAGES_ANALYSIS.md` (same date)
**Scope:** Six utility/legal pages plus the browse/[id] redirect page.

This document describes concrete improvements, grouped first by shared cross-page work and then by page. Items are ordered from highest to lowest impact.

---

## Shared / cross-page improvements

### S1. Replace `NextLink` with `LocalizedLink` for all internal body links

**Affected pages:** Terms (3 links), Privacy (2 links), Governance (2 links in callout)
**Files:** `src/app/[locale]/terms/page.tsx`, `src/app/[locale]/privacy/page.tsx`, `src/app/[locale]/governance/page.tsx`

All internal navigation links inside the `*EnglishContent` sub-components use `NextLink` from `next/link`, which produces bare paths like `/report` and `/contact`. On the French locale these render as `/report` rather than `/fr/report`, breaking locale navigation.

The fix is mechanical: replace `NextLink` with `LocalizedLink` (already imported as `Link` in each file) for every internal cross-page link in the body content. Keep `NextLink` only if it is genuinely unused (it can then be removed from the import).

```tsx
// Before
import NextLink from "next/link";
// ...
<NextLink href="/report" className="text-ha-accent font-medium hover:text-blue-700">
  Report an issue
</NextLink>

// After (LocalizedLink already imported as Link)
<Link href="/report" className="text-ha-accent font-medium hover:text-blue-700">
  Report an issue
</Link>
```

After fixing, remove the `import NextLink from "next/link"` line from any file that no longer uses it.

---

### S2. Fix hover color to use a CSS variable rather than `hover:text-blue-700`

**Affected pages:** All six utility pages
**Files:** All `page.tsx` files listed in scope

Every link in the utility pages uses `className="text-ha-accent font-medium hover:text-blue-700"`. In dark mode, `text-blue-700` is a fixed light-mode blue that conflicts with the dark-mode accent color. Replace the hover class with a semantic utility.

Option A (preferred): define a `.hover-ha-accent` utility in `globals.css`:

```css
.hover-ha-accent:hover {
  color: var(--accent-hover, var(--accent));
}
```

Option B: use Tailwind's arbitrary value `hover:text-[var(--accent)]` which is already supported in the Tailwind config if CSS variables are registered:

```tsx
className = "text-ha-accent font-medium hover:text-[var(--accent-hover)]";
```

Apply consistently to every link in the six pages. The change is purely cosmetic in light mode but fixes the dark-mode hover regression.

---

### S3. Centralize shared email address and common constants

**Affected pages:** Report, Contact
**New or modified file:** `src/lib/siteConstants.ts` (create) or extend `src/lib/siteCopy.ts`

`contact@healtharchive.ca` is hardcoded as a literal string in at least two separate page files. If the address changes, every instance must be found and updated.

Move it to a shared constants module:

```ts
// src/lib/siteConstants.ts
export const CONTACT_EMAIL = "contact@healtharchive.ca";
export const GITHUB_FRONTEND = "https://github.com/jerdaw/healtharchive-frontend";
export const GITHUB_BACKEND = "https://github.com/jerdaw/healtharchive-backend";
export const GITHUB_DATASETS_RELEASES = "https://github.com/jerdaw/healtharchive-datasets/releases";
```

Import and reference these constants in Report, Contact, and Changelog instead of bare string literals.

---

### S4. Replace `LocalizedLink` with plain `<a>` for external GitHub URLs

**Affected pages:** Contact, Changelog
**Files:** `src/app/[locale]/contact/page.tsx`, `src/app/[locale]/changelog/page.tsx`

`LocalizedLink` is designed for internal Next.js routes. Wrapping external `https://github.com/...` URLs in it is semantically wrong and may cause unexpected locale-prefix behavior if the implementation checks the `href`.

Replace with:

```tsx
<a
  href={GITHUB_FRONTEND}
  target="_blank"
  rel="noopener noreferrer"
  className="font-medium text-ha-accent hover:text-blue-700"
>
  github.com/jerdaw/healtharchive-frontend
</a>
```

This also gives external link semantics (opens in new tab, no referrer leak) which is better UX for links leaving the site.

---

### S5. Add a "last reviewed" date to all three policy pages

**Affected pages:** Terms, Privacy, Governance
**Files:** `src/app/[locale]/terms/page.tsx`, `src/app/[locale]/privacy/page.tsx`, `src/app/[locale]/governance/page.tsx`

Legal/policy pages should carry an effective or last-reviewed date so readers know how current the policy is. Add a small metadata line below the `EnglishControlsNotice` on each policy page:

```tsx
<p className="text-xs text-ha-muted">
  {locale === "fr" ? "Dernière révision : " : "Last reviewed: "}
  <time dateTime="2026-01-01">January 2026</time>
</p>
```

The date can initially be hardcoded as a constant (or pulled from the `get*Copy` return object so it can be updated alongside the copy). For French pages, the date appears in the French summary as well since it applies to the policy content.

---

### S6. Consolidate locale copy into `get*Copy` objects (remove inline ternaries from JSX body)

**Affected pages:** Report, Contact
**Files:** `src/app/[locale]/report/page.tsx`, `src/app/[locale]/contact/page.tsx`

Report and Contact both inline locale-switched strings as JSX ternary expressions throughout the render. This makes the files harder to read and harder to update. The pattern used by Terms/Privacy/Governance — a `get*Copy(locale)` function returning a typed object — is easier to reason about.

Refactor:

```ts
// report/page.tsx
function getReportCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: "Signalement",
      title: "Signaler un problème",
      intro: "...",
      whatHappensNextHeading: "Étapes suivantes",
      whatHappensNextBody: "Les signalements sont examinés...",
      contactPrefix: "Vous pouvez aussi nous joindre directement à",
      lookingForPoliciesHeading: "Vous cherchez les politiques ?",
      lookingForPoliciesBody: "Consultez la page Gouvernance...",
      lookingForPoliciesLink: "Lire la gouvernance et les politiques",
    };
  }
  return {
    eyebrow: "Report",
    title: "Report an issue",
    intro: "...",
    whatHappensNextHeading: "What happens next",
    whatHappensNextBody: "Reports are reviewed by the project maintainers...",
    contactPrefix: "You can also reach us directly at",
    lookingForPoliciesHeading: "Looking for policies?",
    lookingForPoliciesBody:
      "See the governance page for scope, corrections, and takedown policies.",
    lookingForPoliciesLink: "Read governance & policies",
  };
}
```

Then reference `copy.whatHappensNextHeading` etc. in the JSX, eliminating all ternaries from the render body.

---

### S7. Fix `text-slate-900` hardcoded color in card/entry headings

**Affected pages:** Contact, Changelog
**Files:** `src/app/[locale]/contact/page.tsx`, `src/app/[locale]/changelog/page.tsx`

`text-slate-900` does not adapt to dark mode. Card and entry headings inside these pages should use the CSS-variable-backed utility `text-ha-body` (or the equivalent from `globals.css`).

If `text-ha-body` does not yet exist as a utility class, add it:

```css
/* globals.css */
.text-ha-body {
  color: var(--text-primary, #0f172a);
}
```

Then replace all occurrences of `text-slate-900` in card/entry heading elements with `text-ha-body`.

---

### S8. Wrap the callout-footer sections in a plain `<div>` rather than `<section className="ha-content-section">`

**Affected pages:** Terms, Governance
**Files:** `src/app/[locale]/terms/page.tsx`, `src/app/[locale]/governance/page.tsx`

Both pages wrap their final `<div className="ha-callout">` inside `<section className="ha-content-section space-y-4">`. This creates a card-inside-a-card visual: the section has its own border and background, and the callout inside it also has a border and background.

The fix is to unwrap the callout from the outer section element, or change the outer wrapper to a plain `<div>` with only the spacing class:

```tsx
// Before
<section className="ha-content-section space-y-4">
  <div className="ha-callout">...</div>
</section>

// After
<div className="mt-2">
  <div className="ha-callout">...</div>
</div>
```

This matches the simpler pattern used on Governance's advisory section, which does not double-wrap the callout.

---

## Per-page specific improvements

### Terms of use

**T1. Verify or remove the `/cite` link**
The "Citation and attribution" section links to `/cite` (line 73 in `terms/page.tsx`). If that route does not exist, replace the link with a reference to `/methods` or `/researchers`, or add a `#citation` anchor to one of those pages. A broken link on the Terms page is a trust issue.

**T2. Use all four `siteCopyEn.whatThisSiteIs` properties in `TermsEnglishContent`**
Currently only `.is` and `.isNot` are used in the bullet list. Add `.limitations` and `.forCurrent` as additional bullets to make the English content as complete as the French summary, and to keep both in sync with the single source of truth in `siteCopy.ts`.

```tsx
<ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ha-muted sm:text-base">
  <li>{copy.whatThisSiteIs.is}</li>
  <li>{copy.whatThisSiteIs.isNot}</li>
  <li>{copy.whatThisSiteIs.limitations}</li>
  <li>{copy.whatThisSiteIs.forCurrent}.</li>
  <li>For up-to-date recommendations, always consult the official source website.</li>
</ul>
```

**T3. Check for double period on `forCurrent` in French summary**
Line 137 appends a literal `.` after `{siteCopy.whatThisSiteIs.forCurrent}`. If the `forCurrent` string in `siteCopy.ts` already ends with a period, remove the appended one. Audit `siteCopy.ts` and standardize whether `forCurrent` ends with punctuation.

**T4. Consider merging "Availability" into "Acceptable use"**
The Availability section is one sentence. It could become the final bullet of the Acceptable use list or a note at the end of that section, reducing the total number of sections from five to four and making each section more substantive.

---

### Privacy

**P1. Import and use `getSiteCopy` for the English body bullets**
Privacy does not use `getSiteCopy` at all. The "What we do not collect" bullets ("No user accounts," "No advertising trackers," "No patient or personal health information") are ad-hoc strings that could be derived from or aligned with `siteCopy.whatThisSiteIs`. At minimum, the three bullets should be extracted to the `getPrivacyCopy` return object so they can be updated centrally.

**P2. Promote the "Contact" section to a closing callout**
The standalone "Contact" section (a heading plus one sentence plus one link) is too thin to justify its own `ha-content-section`. Convert it to an `ha-callout` appended to the "Issue report submissions" section, matching the closing-callout pattern used in Terms and Governance:

```tsx
<section className="ha-content-section space-y-4">
  <h2 className="ha-section-heading">Issue report submissions</h2>
  <p>...</p>
  <div className="ha-callout">
    <h3 className="ha-callout-title">Privacy questions?</h3>
    <p className="mt-2 text-xs leading-relaxed sm:text-sm">
      If you have questions about data practices, contact the project team.
    </p>
    <p className="mt-3 text-xs leading-relaxed sm:text-sm">
      <Link href="/contact" ...>Contact HealthArchive</Link>.
    </p>
  </div>
</section>
```

**P3. Clarify the "by default" qualifier on third-party analytics**
The current text: "No advertising trackers or third-party analytics by default." Add a parenthetical or footnote sentence clarifying what "by default" means (e.g., "The site does not load any third-party analytics or tracking scripts. This may change in future if non-identifying aggregate analytics are introduced, at which point this policy will be updated.").

**P4. Align French and English bullet groupings**
The French summary merges "what we collect" and "what we do not collect" into one bullet list. Rewrite the French summary to mirror the two-section English structure so the reader can more easily compare the two.

---

### Governance

**G1. Add an English table of contents at the top**
Eight sections is enough to warrant a lightweight anchor list for English readers. Place it in the first `ha-content-section-lead` block, after the mission statement, or as a small `ha-callout` before the first section:

```tsx
<div className="ha-callout mb-0">
  <h3 className="ha-callout-title">On this page</h3>
  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed sm:text-sm">
    <li>
      <a href="#mission">Mission &amp; audience</a>
    </li>
    <li>
      <a href="#scope">Scope &amp; inclusion criteria</a>
    </li>
    <li>
      <a href="#cadence">Capture cadence</a>
    </li>
    <li>
      <a href="#provenance">Provenance commitments</a>
    </li>
    <li>
      <a href="#change-tracking">Change tracking</a>
    </li>
    <li>
      <a href="#corrections">Corrections policy</a>
    </li>
    <li>
      <a href="#takedown">Takedown / opt-out</a>
    </li>
    <li>
      <a href="#advisory">Advisory circle</a>
    </li>
  </ul>
</div>
```

**G2. Add links to `/changes` and `/digest` from the change-tracking section**
The change-tracking section explains the policy but does not direct readers to the live feature. Add a brief cross-link:

```tsx
<p className="text-sm leading-relaxed text-ha-muted sm:text-base">
  Browse the change feed at{" "}
  <Link href="/changes" className="font-medium text-ha-accent hover:text-blue-700">
    /changes
  </Link>{" "}
  or subscribe via the{" "}
  <Link href="/digest" className="font-medium text-ha-accent hover:text-blue-700">
    digest
  </Link>
  .
</p>
```

**G3. Apply `ha-section-subtitle ha-section-lede` opening paragraph style to Terms and Privacy**
Governance uses `ha-section-subtitle ha-section-lede` for the first paragraph under each `<h2>`. Terms and Privacy use `text-ha-muted text-sm leading-relaxed sm:text-base` uniformly. If `ha-section-lede` produces a visually distinct opening sentence (larger text, different weight), apply it consistently to Terms and Privacy section openers for visual parity.

---

### Report

**R1. Add `EnglishControlsNotice` (or document its intentional absence)**
Terms, Privacy, and Governance all render `<EnglishControlsNotice locale={locale} />`. Report does not. If Report is considered fully bilingual (inline ternaries cover both languages), add a code comment at the top of the component explaining that `EnglishControlsNotice` is intentionally omitted because the page content is fully bilingual. If it is not fully bilingual in practice, add the notice.

**R2. Fix the `searchParams` missing default**
The function signature:

```tsx
export default async function ReportPage({
  params,
  searchParams,
}: {
  params?: Promise<{ locale: string }>;
  searchParams: Promise<ReportSearchParams>;
});
```

does not have a default value (`= {}`). Add `= {}` to the destructuring to match the pattern used on other pages, which prevents errors if the component is called without `searchParams` in a test environment.

**R3. Refactor inline ternaries to a `getReportCopy` object**
See shared improvement S6. This is the highest-priority readability improvement for this file.

---

### Contact

**C1. Fix card heading dark-mode color**
The `<h2>` elements inside the Email and GitHub cards use `text-slate-900` (hardcoded). Replace with `text-ha-body` or the CSS variable equivalent. See shared improvement S7.

**C2. Replace `LocalizedLink` with `<a>` for external GitHub link**
See shared improvement S4. The GitHub URL in the card body should use `<a target="_blank" rel="noopener noreferrer">`.

**C3. Add a mention of the report form as a third contact option**
The page currently presents Email and GitHub. Users who want to flag an issue but do not want to use either can feel stuck. Add a short note (not a third card) below the grid:

```tsx
<p className="mt-4 text-sm leading-relaxed text-ha-muted">
  {locale === "fr"
    ? "Pour signaler un problème technique ou une demande de retrait, utilisez le "
    : "To report a technical issue or takedown request, use the "}
  <Link href="/report" className="font-medium text-ha-accent">
    {locale === "fr" ? "formulaire de signalement" : "issue report form"}
  </Link>
  .
</p>
```

**C4. Refactor inline ternaries to a `getContactCopy` object**
See shared improvement S6. Contact is shorter than Report so this is a lighter lift, but the principle is the same.

---

### Changelog

**CL1. Add a section heading above the entry list**
The entry list has no `<h2>` label. Add one before the list to provide a screen-reader landmark:

```tsx
<section className="space-y-6">
  <h2 className="ha-section-heading">Entries</h2>
  {changelogEntries.map((entry) => (...))}
</section>
```

Or rename the section heading to something more descriptive like "Update history" or "All entries".

**CL2. Wrap the entry list section in `ha-content-section-lead`**
Currently the entry list sits in a plain `<section className="space-y-6">` with no card background. This makes the changelog look visually flat compared to every other utility page. Wrapping it in `ha-content-section-lead` gives it the consistent bordered card treatment:

```tsx
<section className="ha-content-section-lead space-y-6">
  {changelogEntries.map((entry) => (...))}
</section>
```

Note: if individual `ha-card` entries are nested inside `ha-content-section-lead`, this creates a light card-in-card nesting. Evaluate visually whether to keep the per-entry `ha-card` style or replace it with a simpler divider-based list inside the section card.

**CL3. Fix entry title dark-mode color**
Line 54: `<span className="font-medium text-slate-900">`. Replace with `text-ha-body` or the CSS variable equivalent. See shared improvement S7.

**CL4. Replace `LocalizedLink` with `<a>` for all three GitHub links in the callout**
See shared improvement S4. All three repository links in the closing callout are external and should use `<a target="_blank" rel="noopener noreferrer">` with constants from S3.

---

### Browse/[id] redirect

**BR1. Simplify the three-way `redirect` into a single exit point**
The current control flow calls `redirect(detailsTarget)` in three separate places. Restructure so that the only redirect calls are one conditional (`redirect(snapshot.browseUrl)`) and one unconditional fallback at the end:

```tsx
const numericId = Number(id);
if (!Number.isNaN(numericId)) {
  try {
    const snapshot = await fetchSnapshotDetail(numericId);
    if (snapshot.browseUrl) {
      redirect(snapshot.browseUrl);
    }
  } catch {
    // Log in dev mode only.
    if (process.env.NODE_ENV === "development") {
      console.warn(`[browse/${id}] fetchSnapshotDetail failed; falling back to detail page`);
    }
  }
}
// All paths (non-numeric ID, demo record, API failure) fall through here.
redirect(detailsTarget);
```

**BR2. Add a dev-mode log inside the empty catch block**
An empty `catch` block swallows all API errors silently. Add a conditional dev-mode log so that problems during local development are visible in the console without affecting production:

```tsx
} catch (err) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[browse/${id}] API fetch failed:`, err);
  }
}
```

**BR3. Clean up the double `Promise.resolve` in `resolveLocale` call**
Line 47: `resolveLocale(Promise.resolve(routeParams))`. The `routeParams` is already resolved at that point (it came from `await params`). Store the locale derivation at the top of the function alongside the `id` extraction:

```tsx
const routeParams = await params;
const { id } = routeParams;
const locale = await resolveLocale(Promise.resolve({ locale: routeParams.locale }));
```

Or if `resolveLocale` can accept a plain object, pass it directly. Either way, the double-wrap is worth removing for clarity.

---

## Priority order summary

| Priority | Item                                                       | Pages                      |
| -------- | ---------------------------------------------------------- | -------------------------- |
| 1        | S1 — Fix `NextLink` → `LocalizedLink` for internal links   | Terms, Privacy, Governance |
| 2        | S4 — Fix `LocalizedLink` → `<a>` for external GitHub links | Contact, Changelog         |
| 3        | S2 — Fix `hover:text-blue-700` to CSS variable             | All six pages              |
| 4        | S6 — Consolidate locale copy into `get*Copy` objects       | Report, Contact            |
| 5        | S3 — Centralize email and GitHub URL constants             | Report, Contact, Changelog |
| 6        | S5 — Add last-reviewed date to policy pages                | Terms, Privacy, Governance |
| 7        | T1 — Verify or fix `/cite` link                            | Terms                      |
| 8        | T2 — Use all four `siteCopyEn.whatThisSiteIs` bullets      | Terms                      |
| 9        | P2 — Promote Contact section to closing callout            | Privacy                    |
| 10       | G1 — English table of contents                             | Governance                 |
| 11       | S8 — Unwrap callout from `ha-content-section`              | Terms, Governance          |
| 12       | S7 — Fix `text-slate-900` dark-mode color                  | Contact, Changelog         |
| 13       | CL1/CL2 — Changelog heading and section wrapper            | Changelog                  |
| 14       | R1 — Document/add `EnglishControlsNotice` on Report        | Report                     |
| 15       | BR1/BR2 — Simplify browse redirect logic                   | Browse/[id]                |
