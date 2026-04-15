# Snapshot Page Improvement Plan

**Page:** `src/app/[locale]/snapshot/[id]/page.tsx`
**Date:** 2026-02-24
**Status notes:** `formatDate` dedup and `ha-home-hero` swap are already done.

---

## Phase 1: Copy / Messaging Improvements

### 1.1 Move inline locale strings to a structured copy block

The page scatters 30+ `locale === "fr" ? … : …` ternaries directly in JSX. There is already a `getSnapshotDetailsMetadataCopy` helper for metadata, but nothing equivalent for the page body. Extract all UI strings into a `getSnapshotPageCopy(locale)` function (matching the pattern in `archive/page.tsx`'s `getArchiveCopy`):

```ts
function getSnapshotPageCopy(locale: Locale) {
  const fr = locale === "fr";
  return {
    eyebrow: fr ? "Détails" : "Details",
    intro: fr
      ? "Métadonnées et liens pour une capture archivée."
      : "Metadata and links for an archived snapshot.",
    labelSource: fr ? "Source" : "Source",
    labelDate: fr ? "Date" : "Date",
    labelTimestamp: fr ? "Horodatage" : "Timestamp",
    labelLanguage: fr ? "Langue" : "Language",
    labelOrigUrl: fr ? "URL d'origine" : "Original URL",
    labelReplayUrl: fr ? "URL de relecture" : "Replay URL",
    labelId: "ID",
    labelStatus: fr ? "Statut" : "Status",
    labelType: fr ? "Type" : "Type",
    btnView: fr ? "Voir" : "View",
    btnDiff: fr ? "Voir diff" : "View diff",
    btnRawHtml: fr ? "HTML brut ↗" : "Raw HTML ↗",
    btnApiJson: fr ? "Métadonnées (JSON) ↗" : "Metadata JSON ↗",
    btnCite: fr ? "Citer" : "Cite",
    btnReport: fr ? "Signaler un problème" : "Report issue",
    btnAllSnapshots: fr ? "Toutes les captures" : "All snapshots",
    btnCopyUrl: fr ? "Copier l'URL" : "Copy URL",
    otherTitle: fr ? "Autres captures" : "Other snapshots",
    previewTitle: fr ? "Aperçu de la page archivée" : "Archived page preview",
    noHistory: fr
      ? "L'historique n'est pas disponible pour les captures de démonstration."
      : "History is not available for demo snapshots.",
    noOtherSnaps: fr
      ? "Aucune autre capture n'est disponible pour cette page."
      : "No other snapshots are available for this page.",
    thisCap: fr ? " · (cette capture)" : " · (this snapshot)",
    editionCap: fr ? "Capture d'édition" : "Edition capture",
    edition: fr ? "édition" : "edition",
    unknown: fr ? "Inconnu" : "Unknown",
    unknownSource: fr ? "Source inconnue" : "Unknown source",
    snapshot: fr ? "Capture" : "Snapshot",
  };
}
```

This makes future copy edits and FR/EN sync audits far easier. The JSX then reads `copy.btnView` rather than repeated ternaries.

### 1.2 Improve the page `<PageShell>` intro line

The current intro is:

> "Metadata and links for an archived snapshot."

This is accurate but dry. When the `title` is available (it almost always is for backend snapshots), include it in the intro or supply it as the `eyebrow`:

```tsx
<PageShell
  eyebrow={sourceCode ? sourceName : copy.eyebrow}
  title={title}
  intro={
    captureDate
      ? `${copy.introPrefix} ${formatDate(locale, captureDate)}.`
      : copy.intro
  }
  compact
>
```

Where `introPrefix` is `"Archived snapshot captured on"` / `"Capture archivée le"`. This surfaces the capture date in the `<h1>` region which is more meaningful than the current generic tagline.

### 1.3 Button label: "View diff" is ambiguous

`"View diff"` (line 303) is developer jargon. Rename to a user-oriented label:

- EN: `"Compare to current"` / FR: `"Comparer à aujourd'hui"`

This is consistent with terminology on `/changes` and `/compare-live` and avoids implying a code diff.

### 1.4 "All snapshots" button link text is also ambiguous when no source is set

When `originalUrl` is null, `allSnapshotsHref` falls back to `/archive?view=snapshots&focus=results`. The button still reads "All snapshots" which implies snapshots of this URL, but will actually show all archive snapshots. Guard the button or change its label:

```tsx
{
  originalUrl ? (
    <Link href={allSnapshotsHref} prefetch={false} className="ha-btn-secondary text-xs">
      {copy.btnAllSnapshots}
    </Link>
  ) : (
    <Link href="/archive" prefetch={false} className="ha-btn-secondary text-xs">
      {locale === "fr" ? "Parcourir les archives" : "Browse archive"}
    </Link>
  );
}
```

### 1.5 `getSnapshotDetailsMetadataCopy` should use `getSiteCopy` pattern

The standalone `getSnapshotDetailsMetadataCopy` function at lines 24–37 is fine structurally but is disconnected from `getSiteCopy`. Add a `snapshotDetails` key to `src/lib/siteCopy.ts` if other pages ever need to reference the same metadata copy, keeping the canonical copy logic centralised.

---

## Phase 2: Layout / Structure Refinements

### 2.1 Group the action buttons into primary / secondary tiers

The button strip at lines 290–345 can have up to eight buttons in a single `flex-wrap` row. At 375px wide they wrap into an irregular grid. Separate them into two visually distinct tiers:

```tsx
{/* Primary actions – top row */}
<div className="flex flex-wrap gap-2">
  {viewHref && <a href={viewHref} className="ha-btn-primary text-xs">{copy.btnView}</a>}
  {diffHref && <Link href={diffHref} … className="ha-btn-primary text-xs">{copy.btnDiff}</Link>}
</div>

{/* Secondary actions – second row */}
<div className="flex flex-wrap gap-2 mt-1">
  {rawHtmlUrl && <a href={rawHtmlUrl} … className="ha-btn-secondary text-xs">{copy.btnRawHtml}</a>}
  {apiLink && <a href={apiLink} … className="ha-btn-secondary text-xs">{copy.btnApiJson}</a>}
  <Link href={citeHref} … className="ha-btn-secondary text-xs">{copy.btnCite}</Link>
  <Link href={reportHref} … className="ha-btn-secondary text-xs">{copy.btnReport}</Link>
  <Link href={allSnapshotsHref} … className="ha-btn-secondary text-xs">{copy.btnAllSnapshots}</Link>
  {originalUrl && <CopyButton … className="ha-btn-secondary text-xs">{copy.btnCopyUrl}</CopyButton>}
</div>
```

### 2.2 Metadata `<dl>` label column: fixed width is too narrow on small screens

The `w-28` on `<dt>` elements (line 194) clips "URL d'origine" on very narrow screens (320px). Switch to a percentage or max-content approach:

```tsx
<dl className="space-y-1 text-xs text-[var(--text)] sm:text-sm">
  <div className="flex gap-2">
    <dt className="text-ha-muted w-24 flex-shrink-0 sm:w-28">{copy.labelSource}</dt>
    <dd className="min-w-0 flex-1 break-all">{sourceName}</dd>
  </div>
```

Adding `flex-shrink-0` to `<dt>` and `min-w-0 flex-1 break-all` to all `<dd>` elements ensures long values (URLs, MIME types) wrap correctly without overflowing.

### 2.3 Status code: display as a badge with semantic colour

The raw status code `{snapshotMeta.statusCode}` (line 273) is a bare integer. Apply a colour-coded badge so users immediately understand success vs. error:

```tsx
const statusClass =
  snapshotMeta.statusCode >= 200 && snapshotMeta.statusCode < 300
    ? "ha-badge ha-badge-success"
    : snapshotMeta.statusCode >= 400
      ? "ha-badge ha-badge-error"
      : "ha-badge";

<dd>
  <span className={statusClass}>{snapshotMeta.statusCode}</span>
</dd>;
```

If `ha-badge-success` / `ha-badge-error` do not yet exist in `globals.css`, they would be quick additions alongside the existing `.ha-badge` definition.

### 2.4 Fold the "Other snapshots" section below the preview frame on mobile

On mobile, the "Other snapshots" timeline (section id `other-snapshots`) sits between the metadata card and the iframe. Since the iframe is very tall (`h-[90vh]`), users reach it only after scrolling past potentially long timeline lists. Consider reversing the order on mobile (preview first, timeline second) using CSS order utilities:

```tsx
{/* Wrap both sections in a flex-col container, swap order on mobile */}
<div className="flex flex-col-reverse gap-4 sm:flex-col">
  <section id="other-snapshots" …>…</section>
  {(browseUrl || rawHtmlUrl) && (
    <section …>…</section>
  )}
</div>
```

This lets mobile users see the archived page immediately, with timeline context below.

### 2.5 Timeline list: add a visible "current" badge

The `isCurrent` state appends `" · (this snapshot)"` inline (line 382). On a dense timeline list this is easy to miss. Replace with an `ha-badge` element alongside the date:

```tsx
<p className="font-medium text-[var(--text)]">
  {formatDate(locale, item.captureDate)}
  {isCurrent && (
    <span className="ha-badge ml-2 text-[10px]">
      {locale === "fr" ? "Cette capture" : "Current"}
    </span>
  )}
</p>
```

---

## Phase 3: Interaction / Motion Enhancements

### 3.1 Lazy-load the preview iframe

The `<SnapshotFrame>` at line 434 loads immediately on page mount even when the user never scrolls to the preview section. This costs bandwidth and can delay Time To Interactive. Add an `IntersectionObserver`-based lazy trigger:

```tsx
// In src/components/SnapshotFrame.tsx, add:
// - A "lazy" prop (default true)
// - Render a placeholder div until the element enters viewport
// - On intersection, swap placeholder for the real <iframe>
// This mirrors the lazy-loading pattern already used for source card <img> elements.
```

### 3.2 CopyButton: confirm with a brief success state

The `CopyButton` component (`src/components/archive/CopyButton.tsx`) already exists. Verify it shows a success tick or "Copied!" label after writing to the clipboard. If not, add a `useState` that resets after 2 seconds:

```tsx
// In CopyButton.tsx — example pattern
const [copied, setCopied] = useState(false);
async function handleCopy() {
  await navigator.clipboard.writeText(text);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}
// Button label: copied ? (locale === "fr" ? "Copié ✓" : "Copied ✓") : children
```

### 3.3 Timeline: animate entry of the current snapshot highlight

The `ha-snapshot-current` class applies a background highlight. When the page loads the highlight is static. A brief `animation: pulseOnce 0.5s ease` on `.ha-snapshot-current` would guide the eye to the current item, especially useful on long timelines:

```css
/* In globals.css, extend .ha-snapshot-current */
.ha-snapshot-current {
  animation: ha-snapshot-highlight-in 0.4s ease;
}

@keyframes ha-snapshot-highlight-in {
  from {
    background-color: transparent;
  }
  to {
    background-color: var(--snapshot-current-bg);
  }
}
```

Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .ha-snapshot-current {
    animation: none;
  }
}
```

### 3.4 "View diff" / "Compare" buttons: prefetch on hover

The `/compare-live` and `/compare` routes are not prefetched (both `Link`s have `prefetch={false}`). For users on fast connections, enabling prefetch on hover (Next.js 16 default when `prefetch` is omitted) would make the transition feel instant. Remove the explicit `prefetch={false}` from `diffHref` and `compareHref` links unless there is a known cost reason for suppressing them.

### 3.5 Back navigation: surface a "Back to results" link

When a user arrives at a snapshot from the archive search (via `returnPath`), there is no "Back to results" link. The browser back button works, but an explicit link is more accessible and maintains scroll position context. The `allSnapshotsHref` already points to the URL-filtered archive, so it partially fills this role — but a query-param `returnTo` could be passed from the archive page for a more precise back link.

```tsx
// In archive/page.tsx SearchResultCard, pass returnPath as a snapshot URL query param
const snapshotHref = `/snapshot/${record.id}?returnTo=${encodeURIComponent(replayReturnPath)}`;

// In snapshot/page.tsx, read searchParams for returnTo and render:
{
  returnTo && (
    <Link href={returnTo} className="text-xs font-medium text-ha-accent">
      ← {locale === "fr" ? "Retour aux résultats" : "Back to results"}
    </Link>
  );
}
```

---

## Phase 4: Styling / Responsive Polish

### 4.1 Metadata card and "Other snapshots" card: share consistent padding tokens

Both sections use `p-4 sm:p-5` (lines 193, 349). This is already consistent, but since both are `ha-card ha-home-panel`, consider adding a modifier class like `ha-card-inset` to `globals.css` that bakes in the `p-4 sm:p-5` default — removing inline padding from both call sites:

```css
/* In globals.css */
.ha-card-inset {
  padding: var(--spacing-4); /* 1rem */
}
@media (min-width: 640px) {
  .ha-card-inset {
    padding: var(--spacing-5); /* 1.25rem */
  }
}
```

This prevents accidental divergence if padding tokens are tuned later.

### 4.2 IFrame height: reduce on tall-but-not-full-screen devices

The `h-[90vh]` (line 437) is generous but on a 768px tall device the iframe pushes all content far off screen. Consider capping it at a sensible content height:

```tsx
iframeClassName = "h-[min(90vh,800px)] w-full border-0 sm:h-[min(96vh,900px)]";
```

This ensures the iframe feels immersive but does not dominate on ultrawide portrait displays.

### 4.3 Disclaimer text: apply `ha-warning` token consistently

The disclaimer paragraph at lines 283–288 uses `text-ha-warning` — correct. Verify that `text-ha-warning` in `globals.css` resolves to the same CSS variable as `.ha-callout-warning` uses, so both the inline warning and any box-style warnings share the same colour token. If they differ, unify to a single `--color-warning` variable.

### 4.4 Timeline item buttons: use consistent `ha-btn-secondary` sizing

The `View`, `Details`, and `Compare` buttons in the timeline (lines 395–414) use `ha-btn-secondary text-xs` — consistent with the metadata card action buttons. Double-check that `ha-btn-secondary` in `globals.css` does not have a hardcoded `font-size` that conflicts with `text-xs` on its own, as this can cause double-application on some browser/Tailwind combinations. If so, create a `ha-btn-xs` modifier or rely solely on `ha-btn-secondary` with the size built in.

### 4.5 Dark-mode: URL links in the metadata DL

The `<a>` elements for `originalUrl` and `browseUrl` (lines 234–260) use `text-ha-accent hover:text-ha-accent`. In dark mode, confirm that `--accent` has sufficient contrast against `--card-bg`. The `hover:` class also re-applies the same color, so hover state is invisible. Change hover to a slightly lighter/underlined variant:

```tsx
className = "text-ha-accent font-medium underline-offset-2 hover:underline";
```

This gives a clear hover affordance in both light and dark themes without requiring a second colour token.

### 4.6 Mobile: reduce the `w-28` DL label and allow wrapping on very narrow screens

On screens narrower than 360px (older Android phones), `w-28` (112px) plus a long `<dd>` value can overflow the card. Add `overflow-wrap: anywhere` via Tailwind's `break-all` to all `<dd>` elements and reduce the label column to `w-24` on `xs`:

```tsx
<dt className="text-ha-muted w-20 flex-shrink-0 sm:w-28">{copy.labelOrigUrl}</dt>
<dd className="min-w-0 flex-1 break-all">{…}</dd>
```

Only the URL rows currently have `break-all`; apply it globally to the `<dd>` elements for defensive rendering on all field values.
