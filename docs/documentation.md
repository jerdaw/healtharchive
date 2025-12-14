## 1. High-level project summary

**Project name:** HealthArchive.ca frontend
**Goal:** Public-facing web UI for an independent archive of Canadian public health websites.

Core ideas:

-   Preserve **snapshots** of Canadian public health pages (e.g., PHAC, Health Canada).
-   Allow users to:

    -   Browse/search snapshots by **keywords**, **source**, and **topic**.
    -   Open a **snapshot viewer** that:

        -   Shows clear metadata: source, capture date, topics, original URL.
        -   Embeds the captured page (demo: static HTML in `/public/demo-archive`).

-   Be **explicitly non-governmental** and **non-authoritative**:

    -   Repeated disclaimers.
    -   Clear separation between current guidance (official websites) vs archival record.

You’re joining after:

-   The project has been fully migrated from a static HTML/CSS site to a **Next.js 16 App Router** app.
-   A small demo dataset is wired through:

    -   A search UI (`/archive`) and browse-by-source UI (`/archive/browse-by-source`).
    -   A snapshot viewer route (`/snapshot/[id]`).

-   Deployment is live on **Vercel**, with **Namecheap DNS** pointing at Vercel.

---

## 2. Tech stack & versions

-   **Framework:** Next.js 16.x (App Router)
-   **Language:** TypeScript
-   **Styling:**

    -   TailwindCSS is installed and available.
    -   But primary design is expressed via **hand-written CSS utility classes** with `.ha-*` prefixes in `src/app/globals.css`.
    -   Tailwind is used selectively for layout/spacing/typography (e.g., `flex`, `grid`, `text-sm`).

-   **Package manager:** npm
-   **Build tooling:** PostCSS + Tailwind, Next’s Turbopack dev server.

Key commands:

```bash
# Dev
npm run dev

# Build
npm run build

# Production start (typically handled by Vercel)
npm start

# Lint (ESLint)
npm run lint

# Tests (Vitest + RTL, mocked fetch)
npm test
```

### Environment variables

-   `NEXT_PUBLIC_API_BASE_URL` – base URL for the backend API (e.g., `http://localhost:8001` for local dev, `https://api.healtharchive.ca` for Preview/Production). If unset, the API client falls back to `http://localhost:8001`.
-   `NEXT_PUBLIC_SHOW_API_HEALTH_BANNER` – when set to `true`, shows a small banner in the UI if `/api/health` fails (dev/Preview helper).
-   `NEXT_PUBLIC_LOG_API_HEALTH_FAILURE` – when set to `true`, logs a console warning if `/api/health` fails (dev/Preview helper).
-   `NEXT_PUBLIC_SHOW_API_BASE_HINT` – when set to `true` in development, logs the effective API base URL to the browser console via `ApiHealthBanner` (dev-only helper; silenced in tests and production). This should remain disabled in production and CI to avoid noisy logs.
-   Topics and sources are built from backend data when available. Topics are
    exposed by the backend as `{slug, label}` pairs; demo/fallback data
    internally slugifies labels to mimic the same contract so the UI can always
    use `slug` for queries and `label` for display.

### Frontend ↔ backend integration

-   API client lives at `src/lib/api.ts` and calls **public** backend endpoints:
    -   `GET /api/search` (search with `q`, `source`, `topic`, `page`, `pageSize`)
    -   `GET /api/sources` (per-source summaries)
    -   `GET /api/topics` (canonical topic list used for filters, when available)
    -   `GET /api/snapshot/{id}` (snapshot detail)
    -   `GET /api/snapshots/raw/{id}` (raw HTML for the viewer)
    -   `GET /api/health` (health check)
-   The frontend does **not** call admin or observability endpoints such as
    `/api/admin/**` or `/metrics`; those are reserved for backend operators and
    monitoring systems.
-   Pages:
    -   `/archive`: prefers backend search results with pagination; falls back to the demo dataset with a fallback notice.
    -   `/archive/browse-by-source`: prefers backend source summaries; falls back to demo summaries with a notice.
    -   `/snapshot/[id]`: prefers backend snapshot detail/raw URL; falls back to the demo record/static snapshot if missing. The viewer shows a loading overlay and a friendly error if the iframe fails to load.
-   Fallback behavior keeps the UI usable when the backend is unreachable or not configured.

### Security & browser hardening

-   Responses from the frontend are served with conservative security headers
    configured via `next.config.ts`:
    -   `Referrer-Policy: strict-origin-when-cross-origin`
    -   `X-Content-Type-Options: nosniff`
    -   `X-Frame-Options: SAMEORIGIN`
    -   `Permissions-Policy: geolocation=(), microphone=(), camera=()`
-   A `Content-Security-Policy-Report-Only` header is also set to help tune a
    CSP without breaking users. The policy:
    -   Restricts scripts and styles to `self` (with inline styles allowed).
    -   Restricts `connect-src` and `frame-src` to the frontend itself plus
        `https://api.healtharchive.ca`.
    -   Limits `frame-ancestors` to `self`, `base-uri` to `self`, and `form-action`
        to `self`.
-   The snapshot viewer (`SnapshotFrame`) loads archived HTML in an `<iframe>`
    with a `sandbox="allow-same-origin allow-scripts"` attribute to constrain
    what captured content can do in the browser. Raw snapshot URLs are served
    from the backend API origin, and CSP further limits where frames can be
    embedded from.

### QA checklist (quick smoke)

-   `/archive`: search with and without filters; verify pagination/Next/Prev/First/Last and page-size selector; see fallback notice if API is down.
-   `/archive/browse-by-source`: cards load with counts/topics; fallback notice if API is down.
-   `/snapshot/[id]`: loads metadata and iframe; iframe shows loading overlay, then content; error overlay when iframe fails; notFound on missing ID.
-   Dev-only debug: when iframe fails, “Open raw snapshot” and optional “View metadata JSON” links remain available.

### CI expectations

-   GitHub Actions (`frontend-ci.yml`) runs on pushes to `main` and on pull requests:

    -   `npm ci`
    -   `npm run lint`
    -   `npm test`

-   Tests mock network calls and do not require a live backend.
-   In CI, diagnostics env vars (`NEXT_PUBLIC_SHOW_API_HEALTH_BANNER`,
    `NEXT_PUBLIC_LOG_API_HEALTH_FAILURE`, `NEXT_PUBLIC_SHOW_API_BASE_HINT`) are
    disabled to keep output quiet and deterministic.

### Deployment env expectations (Vercel Preview/Production)

-   `NEXT_PUBLIC_API_BASE_URL` must point at the backend for the environment.

    Suggested values:

    -   **Local dev:** `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001`
    -   **Preview:** `NEXT_PUBLIC_API_BASE_URL=https://api.healtharchive.ca`
    -   **Production:** `NEXT_PUBLIC_API_BASE_URL=https://api.healtharchive.ca`

-   Optional diagnostics (usually enabled in dev/Preview, disabled in production/CI):

    -   `NEXT_PUBLIC_SHOW_API_HEALTH_BANNER=true` to surface a UI banner on health failures.
    -   `NEXT_PUBLIC_LOG_API_HEALTH_FAILURE=true` to log health failures to the console.
    -   `NEXT_PUBLIC_SHOW_API_BASE_HINT=true` to log the effective API base URL once in the browser console (via `ApiHealthBanner`).

-   Tests mock fetch; no live backend needed. If health diagnostics are disabled, a console info may appear in dev but is silenced in test runs.

---

## 3. Git & branch history

**Repo:** `github.com/jerdaw/healtharchive-frontend`

Branches:

-   `main`

    -   **Current production** branch.
    -   Contains the **Next.js app** plus a markdown `README-static-legacy.md` describing the old static site.

-   `next`

    -   Was used as the working branch for the Next.js migration.
    -   Has now been **fast-forward merged into `main`**.

-   `static-legacy`

    -   Frozen snapshot of the original static site (HTML/CSS/JS).
    -   Kept for reference only.

Migration steps already done:

-   Old assets (`index.html`, `browse.html`, `search.html`, old `styles.css`, etc.) have been deleted or moved.
-   Demo HTML pages moved from `demo-archive/**` → `public/demo-archive/**`.
-   Old `README.md` renamed to `README-static-legacy.md`.
-   New `README.md` is the Next.js-focused one.

---

## 4. Current repo structure (high-level)

From the repo root:

```text
.
├── README.md                  # Next.js app README (current)
├── README-static-legacy.md    # Old static site README (historic)
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.mjs
├── postcss.config.mjs
├── eslint.config.mjs
├── next-env.d.ts
├── public/
│   ├── healtharchive-logo.webp    # Primary logo used in header
│   ├── demo-archive/
│   │   ├── hc/
│   │   │   ├── 2022-09-30-water-quality.html
│   │   │   ├── 2023-04-20-naloxone.html
│   │   │   ├── 2024-03-05-food-recalls.html
│   │   │   └── 2024-11-01-covid-vaccines.html
│   │   └── phac/
│   │       ├── 2022-12-01-hiv-surveillance.html
│   │       ├── 2023-06-15-climate-health.html
│   │       ├── 2023-10-01-flu-recs-en.html
│   │       ├── 2023-10-01-flu-recs-fr.html
│   │       ├── 2024-07-10-mpox-update.html
│   │       └── 2025-02-15-covid-epi.html
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── window.svg
│   ├── vercel.svg
│   └── styles.css                 # Basic CSS used by the stock Next starter (not heavily used)
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── favicon.ico
    │   ├── page.tsx
    │   ├── archive/
    │   │   ├── page.tsx
    │   │   └── browse-by-source/
    │   │       └── page.tsx
    │   ├── methods/
    │   │   └── page.tsx
    │   ├── researchers/
    │   │   └── page.tsx
    │   ├── about/
    │   │   └── page.tsx
    │   ├── contact/
    │   │   └── page.tsx
    │   └── snapshot/
    │       └── [id]/
    │           └── page.tsx
    ├── components/
    │   └── layout/
    │       ├── Header.tsx
    │       ├── Footer.tsx
    │       └── PageShell.tsx
    ├── data/
    │   └── demo-records.ts
    └── assets/
        ├── healtharchive-favicon.ico
        ├── healtharchive-logo.webp
        └── healtharchive-logo.xcf
```

---

## 5. Styling & design system

### 5.1 Tailwind setup

`tailwind.config.mjs`:

-   `content` points to `./src/app/**/*.{js,ts,jsx,tsx,mdx}` and `./src/components/**/*.{js,ts,jsx,tsx,mdx}`.
-   Custom theme includes:

    -   `container` config (centered, padded, max width ~1120px at 2xl).
    -   Extended `colors`:

        -   `ha-bg`, `ha-card`, `ha-border`, `ha-accent`, `ha-accent-soft`, `ha-muted`, `ha-danger`.

    -   Custom `boxShadow` (`ha-soft`) and `borderRadius.2xl`.

Tailwind is mainly used for:

-   Layout: `flex`, `grid`, `gap-*`, `px-*`, `py-*`, `max-w-*`.
-   Typography: `text-sm`, `text-xs`, `font-semibold`.
-   Utilities: `border`, `rounded-full`, `shadow-sm`, etc.

### 5.2 Global CSS & `.ha-*` classes

`src/app/globals.css`:

-   Imports Tailwind via `@import "tailwindcss";`.
-   Defines design tokens as CSS variables on `:root` (light theme) and overrides them under `html[data-theme="dark"]`:

    -   Core tokens: `--page-bg`, `--card-bg`, `--surface-bg`, `--surface-bg-soft`, `--border`, `--text`, `--muted`.
    -   Brand tokens: `--accent`, `--accent-hover`, `--brand`, `--brand-subtle`.
    -   Callout tokens: `--callout-bg`, `--callout-border`.
    -   Typography: `--font-sans`.

-   Base reset & `body` styling (background, font family).
-   Global link styles.

Then defines a small **design system** with `.ha-*` classes:

-   Layout & typography:

    -   `.ha-main`, `.ha-page-title`, `.ha-hero`, `.ha-hero-inner`, etc.

-   Buttons:

    -   `.ha-button-primary`, `.ha-button-secondary` (older classes).
    -   **In newer components** we use `.ha-btn-primary`, `.ha-btn-secondary`, `.ha-badge`, `.ha-callout`, `.ha-eyebrow`, `.ha-grid-2`, `.ha-grid-3`, `.ha-section-heading`, `.ha-section-subtitle`.
    -   These classes are referenced in JSX, so any new components should either:

        -   Reuse these, or
        -   Extend the design system in `globals.css`.

-   Cards:

    -   `.ha-card`, `.ha-card-title`, `.ha-card-meta`, `.ha-card-body`.

-   Tags/chips:

    -   `.ha-tag` and `.ha-badge` for visual chips.

-   Footer:

    -   `.ha-footer`, `.ha-footer-inner`, `.ha-footer-disclaimer`, `.ha-footer-meta`.

-   Responsive tweaks for small viewports, especially header, nav, and hero.

### 5.3 Color modes & theme toggle

Color theming is handled via CSS variables and a `data-theme` attribute on `<html>`:

-   Light theme (default) is defined on `:root`.
-   Dark theme overrides live under `html[data-theme="dark"]` and are derived from a Dark Reader–style palette (soft near-black backgrounds, high-contrast text, tuned accents).
-   The theme switch:

    -   On first load, an inline script in `layout.tsx`:

        -   Reads `localStorage["ha-theme"]` (if present).
        -   Falls back to `window.matchMedia("(prefers-color-scheme: dark)")`.
        -   Sets `document.documentElement.dataset.theme = "light" | "dark"` **before** React hydrates to avoid mismatches.

    -   The header theme toggle updates:

        -   `document.documentElement.dataset.theme`.
        -   `localStorage["ha-theme"]`.

-   Most components consume theme-aware tokens via `.ha-*` classes rather than hard-coded colors, so light/dark adjustments flow through the entire UI.

There are also Tailwind overrides scoped under `html[data-theme="dark"]` (e.g., `.bg-white`, `.border-slate-200`, `.text-slate-*`) so existing Tailwind utility classes remain readable in dark mode.

Accessibility-related helpers:

-   Global `a:focus-visible` outline using the brand color.
-   `.ha-btn-primary` / `.ha-btn-secondary` include `:focus-visible` outlines.
-   `.ha-card` transitions are disabled under `prefers-reduced-motion: reduce`.

### 5.4 Header, nav, and homepage surface helpers

-   Header/nav:
    -   `.ha-nav-link` pills with `.ha-nav-link--active` and a sliding `.ha-nav-active-indicator` that positions under the current/hovered link (animations disabled under `prefers-reduced-motion`).
    -   Brand underline on `.ha-header-title::after` uses a gradient, rounded bar that scales in on hover; ties visually to the metric bars.
    -   Mobile panel closes when tapping/clicking outside the open menu.
    -   Theme toggle: desktop stays in the top bar; mobile/tablet toggle lives in the mobile menu under an “Appearance” label.
-   Homepage surfaces and typography:
    -   `.ha-home-hero` for the main card/band surface; `.ha-home-hero-plain` to drop the gradient on follow-up sections; `.ha-home-band-muted`, `.ha-home-band-shell`, `.ha-home-panel` remain as variants but the homepage uses `ha-home-hero` for consistency.
    -   `.ha-metric-*` helpers for the mini dashboard (“Project snapshot”), including animated bar fills.
    -   `.ha-audience-*` helpers for audience cards and icons; `.ha-section-lede` for higher-contrast intro copy in sections like “Who is this for?” and the explainer band.
    -   CTA glow: `.ha-btn-glow` plus `HoverGlowLink` / `HoverGlowButton` for a subtle cursor-follow highlight on primary/secondary actions.
    -   Animated hero phrase (`TrackChangesPhrase`) includes a `<noscript>` fallback so the final “after” wording is present for non-JS crawlers/users.
        -   Dispatches `ha-trackchanges-finished` when the typing sequence completes.
        -   The “Project snapshot” metrics start on `ha-trackchanges-finished` and dispatch `ha-project-snapshot-finished` after all metric animations complete (used to trigger the final “before” fade-out).

**Important:** There was previously a Tailwind class usage like `bg-ha-bg` that broke Tailwind validation. That’s been removed; we now use pure CSS classes for colors (`ha-*`) instead of Tailwind’s `bg-*` custom colors in `globals.css`.

---

## 6. Core layout components

### 6.1 Root layout: `src/app/layout.tsx`

Responsibility:

-   Global `<html>` and `<body>`.
-   Apply base typography via `className="antialiased"`.
-   Render persistent **Header** and **Footer** around the route content.

Structure:

```tsx
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased">
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-slate-900 focus:shadow-lg"
                >
                    Skip to main content
                </a>
                <Header />
                <main
                    id="main-content"
                    className="pt-20 pb-10 sm:pt-24 sm:pb-12"
                >
                    {children}
                </main>
                <Footer />
            </body>
        </html>
    );
}
```

### 6.2 `<Header />`: `src/components/layout/Header.tsx`

-   `"use client"` component, uses:

    -   `usePathname()` from `next/navigation` to highlight the active nav item.
    -   A **mobile menu** toggled by local `useState`.

Key features:

-   Logo block with:

    -   `next/image`-rendered logo (`/public/healtharchive-logo.webp`).
    -   Project title “HealthArchive.ca” in a brand blue (`#11588f`), which gently scales down as the header condenses on scroll.
    -   Subtitle “Independent archive of Canadian public health information”.

-   “Early demo” pill next to logo on desktop.
-   Desktop nav: `Home`, `Browse`, `Methods`, `Researchers`, `About`, `Contact`.

    -   Active link styling vs inactive (blue background for active).
    -   `aria-current="page"` set on the active link.
    -   `aria-label="Primary"` on the `<nav>` for semantic clarity.

-   Mobile nav:

    -   Compact button that toggles between hamburger and X icon.
    -   `aria-expanded`, `aria-controls`, and `aria-label` updated based on open state.
    -   When open, a vertical nav list, using the same active styling and closing the menu on click.

-   Theme toggle:

    -   Small, icon-only slider control (sun/moon) in the header.
    -   Tapping/clicking toggles between light and dark themes and persists the choice in `localStorage`.

-   Scroll-aware behavior:

    -   Header is fixed to the top of the viewport.
    -   As the user scrolls down, a `--ha-header-shrink` CSS variable (0 → 1) drives:

        -   Reduced vertical padding on the header shell.
        -   A smaller logo and title.
        -   The subtitle smoothly fading out and collapsing so the compact header takes up less vertical space.

    -   The header background uses a translucent token (`--surface-bg-soft`) plus `backdrop-filter: blur(...)` so page content behind the header is subtly blurred while still visible.

### 6.3 `<Footer />`: `src/components/layout/Footer.tsx`

-   Single component at the bottom of every page.
-   Provides:

    -   Long disclaimer about independence and non-affiliation with government.
    -   Dynamic year.
    -   Statement: “Not an official government website.”
    -   Extra note about early demo phase.

### 6.4 `<PageShell />`: `src/components/layout/PageShell.tsx`

-   Shared wrapper for inner pages (everything except the home page).
-   Props:

    -   `title: string`
    -   `intro?: string`
    -   `eyebrow?: string`
    -   `children: ReactNode`

-   Responsibilities:

    -   Provide consistent **page header** layout (eyebrow, title, intro).
    -   Wrap content in a `.ha-container` and apply standard spacing.

Usage pattern:

```tsx
<PageShell
    eyebrow="Methods & coverage"
    title="How HealthArchive.ca is being built"
    intro="This page outlines..."
>
    {/* Page body sections here */}
</PageShell>
```

---

## 7. Data model & demo dataset

### 7.1 DemoRecord type

`src/data/demo-records.ts` defines:

```ts
export type DemoRecord = {
    id: string; // slug used in /snapshot/[id]
    title: string;
    sourceCode: "phac" | "hc";
    sourceName: string;
    language: string;
    topics: string[];
    captureDate: string; // YYYY-MM-DD
    originalUrl: string;
    snapshotPath: string; // path under /public
    snippet: string;
};
```

Key fields:

-   `id`: unique ID of snapshot, used in URL path `/snapshot/[id]`.
-   `snapshotPath`: relative path to static HTML in `/public/demo-archive/...`.
-   `topics`: an array of topic tags used for filtering and badges.

### 7.2 Demo data records

`demoRecords` array includes sample records from:

-   `phac` (Public Health Agency of Canada)

    -   COVID epi update
    -   NACI influenza recommendations (EN/FR)
    -   Mpox update
    -   HIV surveillance
    -   Climate change & health

-   `hc` (Health Canada)

    -   COVID-19 vaccines (industry/vaccine page)
    -   Naloxone info
    -   Food recall warnings
    -   Drinking water quality guidelines

Each record’s `snapshotPath` is a valid file in `public/demo-archive/**`.

### 7.3 Topic handling (backend + frontend)

Topics are handled consistently across the backend, frontend, and demo data:

-   **Canonical shape from the backend**:

    -   All public APIs that expose topics (`/api/sources`, `/api/search`, `/api/snapshot/{id}`) return topics as:

        ```ts
        type TopicRef = {
            slug: string; // machine-readable identifier (used in URLs / query params)
            label: string; // human-readable label shown in the UI
        };
        ```

    -   The `topic` query parameter for `/api/search` is always the **topic slug**
        (`?topic=covid-19`).

-   **Frontend usage**:

    -   Dropdowns and filters use `value = slug` and display `label`.
    -   Topic badges in `/archive` and `/snapshot/[id]` show `label`.
    -   Links or filters that refer to a topic use the slug in the URL
        (`?topic=<slug>`).

-   **Demo / fallback behavior**:

    -   In demo mode, topics on `DemoRecord` are simple strings (labels).
    -   A shared `slugifyTopic(label)` helper in `src/data/demo-records.ts`
        converts labels into slugs using the same rules as the backend
        (lowercase, non-alphanumerics → `-`, trimmed).
    -   `searchDemoRecords`:

        -   Treats `topic` primarily as a slug.
        -   For each record, slugifies each label and matches when
            `slugifyTopic(label) === topic` (or `label === topic` for
            backward-compat).

This ensures that the UI behaves the same way whether it is backed by the live
API or the bundled demo dataset: URLs use slugs, and the user sees readable
labels.

### 7.4 Helper functions

All in `src/data/demo-records.ts`:

1. **`searchDemoRecords(params: SearchParams): DemoRecord[]`**

    ```ts
    export type SearchParams = {
        q?: string;
        source?: string;
        topic?: string;
    };
    ```

    Logic:

    - `source`: if provided, filters `record.sourceCode === source`.
    - `topic`: if provided, treats it primarily as a **topic slug**:

        - For each record, slugifies each topic label using the same rules as the backend (lowercase, non-alphanumerics → `-`, trimmed).
        - A record matches if **any** of its topic slugs equals `topic` **or** any raw topic label equals `topic` (for backward-compat).

    - `q`: if not provided, returns all records passing above filters.
    - If `q` provided:

        - Normalize to lowercase.
        - Build a haystack string from:

            - `title`, `snippet`, `sourceName`, `topics.join(" ")`, `language`.

        - Check if haystack contains normalized `q`.

2. **`getSourcesSummary(): SourceSummary[]`**

    ```ts
    export type SourceSummary = {
        sourceCode: string;
        sourceName: string;
        recordCount: number;
        firstCapture: string;
        lastCapture: string;
        topics: string[];
        latestRecordId: string | null;
    };
    ```

    - Aggregates `demoRecords` grouped by `sourceCode`.
    - Tracks first/last capture, total records, unique topics, and the ID of the latest record.
    - Returns array sorted by `sourceName`.

3. **`getAllTopics(): string[]`**

    - Collects all topics from all records into a Set, returns sorted alphabetically.

4. **`getRecordById(id: string)`**

    - Finds a single record by `id` or returns `undefined`.

---

## 8. Routes & pages

### 8.1 Home page `/` – `src/app/page.tsx`

-   Uses `demoRecords` to compute:

    -   `recordCount = demoRecords.length`
    -   `sourceCount = unique sourceName count`

-   Content:

    1. **Hero section:**

        - H1: “See what Canadian public health websites used to say…”
        - Paragraph describing project.
        - “Early development” pill.
        - Buttons:

            - `Browse demo archive` → `/archive`
            - `Methods & scope` → `/methods`

    2. **Side card: “Project snapshot”**

        - Displays sample record and source counts.
        - Summaries for focus and intended users.

    3. **“Who is this for?” section**

        - Three cards for:

            - Clinicians & public health practitioners
            - Researchers & data journalists
            - Members of the public

    4. **“What is HealthArchive.ca?” section**

        - Explains independence and non-governmental status.
        - Simple link to `/methods`.

    5. **Callout: “What this demo is (and isn’t)”**

        - Bullet list clarifying demo scope and limitations.

### 8.2 Archive search `/archive` – `src/app/archive/page.tsx`

-   Async server component using App Router pattern where `searchParams` is a **Promise**:

    ```ts
    type ArchiveSearchParams = { q?: string; source?: string; topic?: string; };

    export default async function ArchivePage({ searchParams }: { searchParams: Promise<ArchiveSearchParams>; }) {
      const params = await searchParams;
      const q = params.q?.trim() ?? "";
      const source = params.source?.trim() ?? "";
      const topic = params.topic?.trim() ?? "";

      const allTopics = getAllTopics();
      const results = searchDemoRecords({ q, source, topic });
      ...
    }
    ```

-   Uses `<PageShell>` with:

    -   Eyebrow: “Archive explorer (demo)”
    -   Title: “Browse & search demo snapshots”
    -   Intro explaining it’s a prototype.

-   Layout:

    -   `grid` with two columns on large screens:

        1. Left: **Filters panel** (inside `.ha-card`).
        2. Right: **Search box + results list**.

#### Filters panel

-   Filter form (`method="get"`) with controls:

    -   Keywords (`input name="q"`).
    -   Source (`select name="source"` with values `""`, `"phac"`, `"hc"`).
    -   Topic (`select name="topic"` built from `getAllTopics()`).

-   “Apply filters” button (`type="submit"`).

-   “Clear” link resets to `/archive`.

#### Search box & results

-   Top card shows:

    -   “Search results” header.
    -   Summary text: “X demo snapshot(s) matching “q””.

-   Secondary search form that:

    -   Reuses `q` but preserves `source` and `topic` via hidden inputs.
    -   Allows user to quickly adjust keywords without re-choosing filters.

-   Results list:

    -   If empty: show explanatory message.
    -   Else: for each `record`:

        -   Article with `.ha-card ha-card-elevated`:

            -   Title (link to `/snapshot/${record.id}`).
            -   Meta line: `sourceName · captured {formatted date} · language`.
            -   “View snapshot” button linking to same snapshot.
            -   Snippet paragraph.
            -   Original URL line.
            -   Topic badges (`record.topics`).

### 8.3 Browse by source `/archive/browse-by-source` – `src/app/archive/browse-by-source/page.tsx`

-   Server component using `getSourcesSummary()`.

-   `<PageShell>` with:

    -   Eyebrow: “Archive explorer (demo)”
    -   Title: “Browse demo records by source”

-   Displays a `.ha-grid-2` of cards, one per source:

    -   Card shows:

        -   `sourceName`
        -   “N demo snapshots captured between [first] and [last]”.
        -   Top ~6 topics as badges + “+N more” if more topics exist.
        -   Buttons:

            -   “Browse records” → `/archive?source=${sourceCode}`
            -   “View latest snapshot →” → `/snapshot/${latestRecordId}` (if exists).

### 8.4 Methods `/methods` – `src/app/methods/page.tsx`

-   Explains:

    -   Scope of the archive (early phase).
    -   Capture methods (conceptual pipeline).
    -   Storage & replay strategy (WARC, pywb, etc.).
    -   Limitations and interpretation in a callout.

All text is stable, but can be refined later.

### 8.5 Researchers `/researchers` – `src/app/researchers/page.tsx`

-   Sections:

    -   Use cases:

        -   Policy/guideline history, reproducibility, media studies, audit/accountability.

    -   Working with demo archive:

        -   Small curated dataset + search interface + snapshot stubs.

    -   Citation guidance:

        -   Provides a suggested citation format.

    -   Planned future capabilities (callout):

        -   Version history, diff views, machine-readable exports, APIs.

### 8.6 About `/about` – `src/app/about/page.tsx`

-   Explains motivations, independence/non-partisanship, and current project status.

### 8.7 Contact `/contact` – `src/app/contact/page.tsx`

-   Two cards:

    -   Email: `contact@healtharchive.ca` (forwarding to the maintainer).
    -   GitHub: `https://github.com/jerdaw/healtharchive-frontend`.

### 8.8 Snapshot viewer `/snapshot/[id]` – `src/app/snapshot/[id]/page.tsx`

-   Async server component with `params` as **Promise** (Next 16 dynamic API).

    ```ts
    export default async function SnapshotPage({
        params,
    }: {
        params: Promise<{ id: string }>;
    }) {
        const { id } = await params;
        const record = getRecordById(id);

        if (!record) {
            return notFound();
        }

        // Render PageShell + metadata + iframe
    }
    ```

-   Uses `<PageShell>` with:

    -   Eyebrow: “Archived snapshot (demo)”
    -   Title: `record.title`
    -   Intro: Explains this is a demo view.

-   Layout: `.ha-grid-2`:

    1. Left column:

        - **Metadata card**:

            - Capture date.
            - Explanation that it’s a static demo snapshot.
            - Details: Source, capture date, language, original URL.
            - Topics as badges.
            - Buttons:

                - Back to `/archive`.
                - “Open raw snapshot” (link to `record.snapshotPath`, opens in new tab).

        - **Important note callout**:

            - Emphasizes archival, outdated nature; not current guidance.

    2. Right column:

        - **Viewer card** with:

            - Header: “Archived content · served from {snapshotPath} for this demo.”
            - `<iframe src={record.snapshotPath} ...>` to render static HTML.

-   **Important**: `snapshotPath` is relative to `/public`, but used as absolute path in `href`/`src` (e.g., `/demo-archive/hc/2024-11-01-covid-vaccines.html`).

---

## 9. Deployment & DNS

### 9.1 Vercel project

-   Project: `healtharchive` on Vercel.
-   Connected to GitHub repo: `jerdaw/healtharchive-frontend`.
-   Production branch: `main`.
-   Build settings:

    -   Root Directory: repo root.
    -   Framework Preset: Next.js.
    -   Build Command: `npm run build` (default).
    -   Install Command: `npm install` (default).
    -   Output Directory: `.next` (handled automatically by Vercel).

### 9.2 Domains (Vercel side)

-   `healtharchive.vercel.app` – Vercel default URL (valid, production).
-   `healtharchive.ca` – apex domain (Configured via A record).
-   `www.healtharchive.ca` – CNAME to Vercel DNS host.

Vercel expects:

-   `A @ 216.198.79.1` (apex).
-   `CNAME www → ba6b8a306401d981.vercel-dns-017.com.` (or similar `vercel-dns-*` host).

### 9.3 Namecheap DNS configuration

Under **Advanced DNS** for `healtharchive.ca`:

Host Records:

-   `A @ 216.198.79.1`
    → Points apex to Vercel.

-   `CNAME www ba6b8a306401d981.vercel-dns-017.com.`
    → Points `www` subdomain to Vercel.

-   TXT SPF record for email (unchanged).

Old GitHub Pages `A @ 185.199.*` records have been **removed**.

---

## 10. Phase summary (what’s done vs future)

We followed an 8-phase plan. Status:

-   **Phase 0 – Repo & environment**

    -   ✅ Branch strategy: `main` (prod), `static-legacy` (old site), `next` (development, now merged).
    -   ✅ Node + npm + TS + Tailwind set up.

-   **Phase 1 – Scaffold Next.js app**

    -   ✅ Next.js 16 App Router app created.
    -   ✅ Typescript and Tailwind integrated.
    -   ✅ Basic dev server works.

-   **Phase 2 – Global layout & navigation shell**

    -   ✅ `<Header>`, `<Footer>`, `<PageShell>` created.
    -   ✅ Navigation items finalized.
    -   ✅ Disclaimer in Footer.

-   **Phase 3 – Page skeletons & content migration**

    -   ✅ Routes `/`, `/archive`, `/archive/browse-by-source`, `/methods`, `/researchers`, `/about`, `/contact` created.
    -   ✅ Original single-page content split and restructured into these routes.

-   **Phase 4 – Data model & demo API**

    -   Partially integrated directly into server components instead of separate `/api` routes.
    -   ✅ `DemoRecord` type, demo data, and helper functions created in `src/data/demo-records.ts`.
    -   ⏳ Could still add `/api/search` and `/api/sources` for client-side data fetching if desired.

-   **Phase 5 – Archive UI**

    -   ✅ `/archive` implemented with server-side filtering via URL `searchParams`.
    -   ✅ Filters panel + search box + results list.
    -   ✅ `/archive/browse-by-source` implemented using `getSourcesSummary`.

-   **Phase 6 – Snapshot demo pages**

    -   ✅ `/snapshot/[id]` route implemented with metadata and iframe viewer.
    -   ✅ Static snapshot HTML files wired via `snapshotPath` and stored in `public/demo-archive/**`.

-   **Phase 7 – Design system & polish**

    -   ✅ Basic design system (.ha-\* classes) in `globals.css`.
    -   ✅ Layout reasonably modern and coherent.
    -   ⏳ Further polish (e.g., more advanced responsive tweaks, accessibility audit) still possible.

-   **Phase 8 – Deployment & DNS**

    -   ✅ Next.js app deployed to Vercel.
    -   ✅ GitHub integration configured.
    -   ✅ `healtharchive.ca` and `www.healtharchive.ca` pointed to Vercel.

---

## 11. Known patterns & gotchas for future work

-   **Next 16 dynamic APIs:**

    -   `searchParams` and `params` are **Promises** and must be `await`ed in server components:

        -   We already fixed:

            -   `ArchivePage({ searchParams }: { searchParams: Promise<ArchiveSearchParams> })`.
            -   `SnapshotPage({ params }: { params: Promise<{ id: string }> })`.

-   **Styling mix:**

    -   There’s a hybrid of Tailwind utilities and `.ha-*` CSS classes.
    -   When adding new UI elements:

        -   Prefer using existing `.ha-*` primitives for visual consistency.
        -   Use Tailwind mostly for layout/spacing tweaks.

-   **Backend integration + demo fallback:**

    -   The UI prefers live backend APIs (`/api/search`, `/api/sources`,
        `/api/topics`, `/api/snapshot/{id}`, `/api/snapshots/raw/{id}`) via
        `NEXT_PUBLIC_API_BASE_URL`, and falls back to the static `demoRecords`
        dataset when the API is unreachable.
    -   There are no Next.js API routes in this repo; all calls go directly to the
        external backend (or local dev backend) using `src/lib/api.ts`.

-   **Accessibility primitives:**

    -   Skip link to `#main-content` before the header.
    -   Main content wrapped in a `<main id="main-content">` landmark.
    -   `aria-current="page"` for active nav links, and labeled primary nav.
    -   Focus-visible outlines on buttons, links, and nav items using the brand color.
    -   `prefers-reduced-motion` respected for card transitions.

---

## 12. Suggested future directions (for the next LLM)

If you’re continuing dev, some clear next steps could be:

1. **Introduce real API routes**:

    - `/api/search` and `/api/sources` reusing the logic in `demo-records.ts`.
    - Convert `/archive` UI into a `"use client"` component that fetches from these APIs (to support filtering without full SSR reloads).

2. **Version history & timeline UI**:

    - Extend `DemoRecord` with `urlGroup` or similar.
    - Add a “View timeline” link on snapshot cards to show capture history for a given URL.

3. **Improved topic handling**:

    - Add grouping or hierarchy for topics (e.g., Infectious diseases → Respiratory → COVID-19).

4. **Accessibility audit**:

    - A first pass has been completed (skip link, nav landmarks, focus-visible styles, and basic ARIA).
    - Future work could include automated testing (e.g., axe), screen reader testing across platforms, and deeper contrast audits.

5. **Analytics / logging** (if desired):

    - E.g., simple pageview tracking or logging to a privacy-respecting service.

---

## 13. Command to print the key project files (code/docs only)

The goal is to dump only the core files someone would read to understand the project (no deps or build output). From the repo root:

```bash
# From /path/to/healtharchive-frontend
files=(
  "README.md"
  "docs/documentation.md"
  "package.json"
  "tsconfig.json"
  "next.config.ts"
  "tailwind.config.mjs"
  "postcss.config.mjs"
  "src/app/globals.css"
  "src/app/layout.tsx"
  "src/app/page.tsx"
  "src/app/archive/page.tsx"
  "src/app/archive/browse-by-source/page.tsx"
  "src/app/methods/page.tsx"
  "src/app/researchers/page.tsx"
  "src/app/about/page.tsx"
  "src/app/contact/page.tsx"
  "src/app/snapshot/[id]/page.tsx"
  "src/components/layout/Header.tsx"
  "src/components/layout/Footer.tsx"
  "src/components/layout/PageShell.tsx"
  "src/data/demo-records.ts"
)

for f in "${files[@]}"; do
  if [ -f "$f" ]; then
    echo "=== $f ==="
    cat "$f"
    echo
  fi
done
```

This is intentionally hardcoded to avoid pulling in `node_modules`, `.next`, or other generated content. Add/remove paths in the `files` array as needed if you introduce new core source files.
