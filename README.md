# HealthArchive.ca – Frontend (Next.js)

HealthArchive.ca is an independent, non-governmental project to preserve and surface
historical versions of **Canadian public health web content** (e.g., PHAC, Health Canada).

This repository contains the **Next.js frontend** for the public site at:

- https://healtharchive.ca (production, early demo)
- https://healtharchive.vercel.app (Vercel default domain)

> **Status:** Early demo  
> The UI now prefers live backend APIs for search, browse, and snapshot detail
> (configured via `NEXT_PUBLIC_API_BASE_URL`), and gracefully falls back to the
> bundled demo dataset when the API is unreachable.

---

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:**
  - TailwindCSS for layout/spacing
  - Custom `.ha-*` utility classes in `src/app/globals.css` for the design system
- **Package manager:** npm
- **Hosting:** Vercel

### Key UI/UX features

- Sticky, scroll-aware header that gently condenses on scroll and uses a blurred, translucent background so it stays present without obscuring content.
- Accessible light/dark theme toggle:
  - Uses CSS variables and a `data-theme="light" | "dark"` attribute on `<html>`.
  - Respects the user’s OS preference (`prefers-color-scheme`) on first load.
  - Persists the user’s choice in `localStorage` for subsequent visits.
- Shared `.ha-*` design system for cards, buttons, badges, and page shells to keep the site visually consistent.
  - Header/nav: pill-style links with a sliding active indicator and a gradient underline on the brand mark that animates in-line with the metric bars.
  - Homepage surfaces: `ha-home-hero` for card-like sections; `ha-home-hero-plain` to drop the gradient on follow-up sections; `ha-home-band-*` and `ha-home-panel` remain available for muted shells.
  - Metrics: `ha-metric-*` helpers and animated bars used in the “Project snapshot” card.
  - Audience/explainer sections: `ha-audience-*` helpers plus `ha-section-lede` for readable intro copy.
  - CTA glow: `ha-btn-glow` with `HoverGlowLink` / `HoverGlowButton` provides a subtle cursor-follow highlight on primary/secondary actions.
  - Hero before/after phrase includes a `<noscript>` fallback so the intended text remains clear for non-JS crawlers/users.
  - Hero animation orchestration:
    - `TrackChangesPhrase` dispatches `ha-trackchanges-finished` when the “before → after” typing sequence completes.
    - The homepage “Project snapshot” metrics start on that event and then dispatch `ha-project-snapshot-finished` after both metrics complete, which triggers the final “before” removal.

---

## Getting started

### 1. Install dependencies

```bash
npm install
````

### 2. Configure API base URL

The frontend talks to the backend via `NEXT_PUBLIC_API_BASE_URL`. If this is
unset, the client falls back to `http://localhost:8001`, which is convenient
for local development but **not** appropriate for staging/production.

For local development, create a `.env.local` (git-ignored) with:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and set:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
```

On Vercel (staging/production), set `NEXT_PUBLIC_API_BASE_URL` via the Vercel
UI under **Settings → Environment Variables**. Recommended values:

| Environment | Frontend URL                         | Backend URL                        | `NEXT_PUBLIC_API_BASE_URL`           |
|------------|--------------------------------------|------------------------------------|--------------------------------------|
| Local      | `http://localhost:3000`              | `http://127.0.0.1:8001`           | `http://127.0.0.1:8001`             |
| Preview    | `https://healtharchive.vercel.app`   | `https://api-staging.healtharchive.ca` (or prod) | `https://api-staging.healtharchive.ca` |
| Production | `https://healtharchive.ca` / `www`   | `https://api.healtharchive.ca`     | `https://api.healtharchive.ca`      |

> `NEXT_PUBLIC_BACKEND_URL` is still supported for backward-compatibility, but
> `NEXT_PUBLIC_API_BASE_URL` is the preferred and documented way to configure
> the API base.

### 3. Run the dev server

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for production

```bash
npm run build
npm start
```

(In production, Vercel runs the build and serves the app.)

### 5. Lint (recommended)

```bash
npm run lint
```

### 6. Tests (mocked, no backend required)

```bash
npm test
```

Vitest + Testing Library with mocked fetch; no live backend needed.

### CI / deployment notes

- A GitHub Actions workflow (`.github/workflows/frontend-ci.yml`) runs on pushes
  to `main` and on pull requests:

  - Installs dependencies via `npm ci`.
  - Runs `npm run lint`.
  - Runs `npm test` (Vitest + Testing Library with mocked fetch; no live backend
    required).
   - Runs a lightweight dependency security audit:

     ```bash
     npm audit --audit-level=high
     ```

- Ensure `NEXT_PUBLIC_API_BASE_URL` is set per environment (Vercel/staging/prod).
- Optional diagnostics envs (`NEXT_PUBLIC_SHOW_API_HEALTH_BANNER`,
  `NEXT_PUBLIC_LOG_API_HEALTH_FAILURE`, `NEXT_PUBLIC_SHOW_API_BASE_HINT`) are
  normally disabled in CI and production to keep logs quiet.

---

## Backend integration overview

- Data sources:
  - Live APIs (preferred): `/api/search`, `/api/sources`, `/api/snapshot/{id}`, `/api/snapshots/raw/{id}`, `/api/health`.
  - Demo fallback: bundled sample records under `src/data/demo-records.ts` and static snapshots under `public/demo-archive/**` when the API is unavailable.
- API client: `src/lib/api.ts` (uses `NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:8001`).
- Pages:
  - `/archive`: uses backend search with pagination and page-size selection; falls back to demo data and shows a fallback notice.
  - `/archive/browse-by-source`: uses backend source summaries; falls back to demo summaries with a notice.
  - `/snapshot/[id]`: fetches backend snapshot detail/raw URL first; falls back to demo record/static snapshot if needed. The viewer shows a loading overlay and a friendly error state if the iframe fails.
- Health diagnostics (optional): set `NEXT_PUBLIC_SHOW_API_HEALTH_BANNER=true` to surface a small banner when the backend health check fails (useful in dev/staging).
  - If the health banner is off, you can still log failures by setting `NEXT_PUBLIC_LOG_API_HEALTH_FAILURE=true` (dev-only).
- Topics/sources: topic dropdown and source options come from the backend when
  available. Topics use backend‑provided `{slug, label}` pairs (slug in query
  params, label in the UI); demo mode slugifies labels internally to mimic the
  same contract.

### Pre-release smoke (recommended)

- Search (`/archive`): keywords + source/topic filters, pagination (First/Prev/Next/Last), page-size selector.
- Browse by source (`/archive/browse-by-source`): cards load with counts/topics.
- Snapshot (`/snapshot/[id]`): metadata present; iframe loads or shows error overlay with raw/API links; missing ID returns notFound.
- Topics/sources: topic dropdown and source options come from the backend when
  available, with topics using `{slug, label}` from the API. In demo mode,
  labels are slugified client‑side so the UI can keep using topic slugs in
  URLs.

This runs the Next.js/ESLint config for the app.

---

## Project structure (high-level)

```text
.
├── README.md
├── docs/
│   └── documentation.md       # Deep-dive architecture, design, and project state
├── package.json
├── next.config.ts
├── tailwind.config.mjs
├── postcss.config.mjs
├── tsconfig.json
├── public/
│   ├── healtharchive-logo.webp  # Primary logo used in header/hero
│   └── demo-archive/            # Static HTML stubs used by the snapshot viewer
└── src/
    ├── app/                   # Next.js App Router routes
    │   ├── favicon.ico        # Favicon wired via Next metadata
    │   ├── page.tsx           # Home
    │   ├── archive/           # Search & browse
    │   ├── methods/           # Methods & scope
    │   ├── researchers/       # For researchers
    │   ├── about/             # About the project
    │   ├── contact/           # Contact info
    │   └── snapshot/[id]/     # Snapshot viewer
    ├── components/
    │   └── layout/            # Header, Footer, PageShell
    └── data/
        └── demo-records.ts    # Demo dataset + search helpers
```

---

## Deployment

Production is managed via Vercel:

* GitHub repo: [https://github.com/jerdaw/healtharchive-frontend](https://github.com/jerdaw/healtharchive-frontend)
* Production branch: `main`
* Domains:

  * `healtharchive.ca` (apex, A record → Vercel IP)
  * `www.healtharchive.ca` (CNAME → Vercel DNS host)
  * `healtharchive.vercel.app` (default Vercel URL)

Any push to `main` triggers a new Vercel deployment.

---

## Further documentation

* **Architecture & project state:**
  See [`docs/documentation.md`](docs/documentation.md) for a detailed overview
  of the data model, routes, design system, accessibility primitives, and
  planned future phases.
