# HealthArchive.ca – Frontend (Next.js)

HealthArchive.ca is an independent, non-governmental project to preserve and surface
historical versions of **Canadian public health web content** (e.g., PHAC, Health Canada).

This repository contains the **Next.js frontend** for the public site at:

- https://healtharchive.ca (production)
- https://healtharchive.vercel.app (Vercel default domain)

> **Status:** Production (active)
> The UI now prefers live backend APIs for search, browse, and snapshot detail
> (configured via `NEXT_PUBLIC_API_BASE_URL`), and gracefully falls back to the
> bundled offline sample dataset when the API is unreachable.

Public-facing narrative and workflow disclaimers (used across Home/Archive/Snapshot/Browse)
are centralized in `src/lib/siteCopy.ts`.

- Backend API + ops docs: https://github.com/jerdaw/healtharchive-backend
- **Unified Documentation Site**: Documentation for both repositories is now hosted in the [backend repository](https://github.com/jerdaw/healtharchive-backend). Run `make docs-serve` in the backend root to view the searchable UI.

---

## Localization (EN/FR)

- English is the default (canonical URLs are unprefixed, e.g. `/archive`).
- French lives under `/fr/...` and is explicitly labeled as an **alpha, automated translation**.
- If there is any inconsistency, the **English version governs**.
- Archived snapshots are never translated (they remain as-captured).

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
    - The homepage “Project snapshot” metrics start on that event and then dispatch `ha-project-snapshot-finished` after all metric animations complete, which triggers the final “before” removal.
- Public reporting surfaces:
  - `/status` shares coverage, freshness, and operational status.
  - `/impact` provides a lightweight monthly impact report (fed by `/api/usage`).
- Partner and citation surfaces:
  - `/brief` provides a one-page, partner-friendly project summary.
  - `/cite` provides pragmatic citation guidance for snapshots and compare views.
- Research exports:
  - `/exports` provides the public data dictionary and export manifest link.
- Change tracking surfaces:
  - `/changes` for edition-aware change feeds.
  - `/compare` for side-by-side diff views.
  - `/digest` for RSS links and digest context.

---

## Getting started

### 1. Install dependencies

```bash
npm ci
```

Node.js **20.19+** is required (enforced via `package.json` `engines` and CI).

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

On Vercel (Preview/Production), set `NEXT_PUBLIC_API_BASE_URL` via the Vercel
UI under **Settings → Environment Variables**. Recommended values:

| Environment | Frontend URL                       | Backend URL                    | `NEXT_PUBLIC_API_BASE_URL`     |
| ----------- | ---------------------------------- | ------------------------------ | ------------------------------ |
| Local       | `http://localhost:3000`            | `http://127.0.0.1:8001`        | `http://127.0.0.1:8001`        |
| Preview     | `https://healtharchive.vercel.app` | `https://api.healtharchive.ca` | `https://api.healtharchive.ca` |
| Production  | `https://healtharchive.ca` / `www` | `https://api.healtharchive.ca` | `https://api.healtharchive.ca` |

> Expected limitation (by design): branch preview URLs like
> `https://healtharchive-git-...vercel.app` may fall back to offline sample mode until we
> decide to loosen the backend CORS allowlist.

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

### 5. Run checks (recommended)

```bash
npm run check
```

This runs formatting checks, lint, typecheck, tests (mocked; no backend required), and a build.

### 6. Set up Git hooks

After cloning, enable Git hooks:

```bash
bash scripts/setup-hooks.sh
```

> [!NOTE]
> Git hooks are managed by [pre-commit](https://pre-commit.com) and enforce code quality checks before commits. Requires pre-commit to be installed (`pipx install pre-commit` or `mise use -g pre-commit`).

---

## Contact

- `contact@healtharchive.ca`

### CI / deployment notes

- A GitHub Actions workflow (`.github/workflows/frontend-ci.yml`) runs on pushes
  to `main` and on pull requests:
  - Installs dependencies via `npm ci`.
  - Runs pre-commit checks on PR diffs (whitespace/EOF, YAML validation, detecting private keys).
  - Runs `npm run check`.
  - Runs a lightweight dependency security audit:

    ```bash
    npm audit --audit-level=high
    ```

- Ensure `NEXT_PUBLIC_API_BASE_URL` is set per environment (Vercel Preview/Production).
- Optional diagnostics envs (`NEXT_PUBLIC_SHOW_API_HEALTH_BANNER`,
  `NEXT_PUBLIC_LOG_API_HEALTH_FAILURE`, `NEXT_PUBLIC_SHOW_API_BASE_HINT`) are
  normally disabled in CI and production to keep logs quiet.

---

## Backend integration overview

- Data sources:
  - Live APIs (preferred): `/api/search`, `/api/sources`, `/api/snapshot/{id}`, `/api/snapshots/raw/{id}`, `/api/stats`, `/api/health`.
  - Offline fallback: bundled sample records under `src/data/demo-records.ts` and static snapshots under `public/demo-archive/**` when the API is unavailable.
- API client: `src/lib/api.ts` (uses `NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:8001`).
- Production backend: single Hetzner VPS (Nuremberg) running Postgres + API + worker + Caddy; SSH is Tailscale-only; public ports are 80/443 only. Full runbook lives in `healtharchive-backend/docs/deployment/production-single-vps.md`.
- Issue intake: `/report` posts to the same-origin API route `src/app/api/report/route.ts`, which forwards to the backend `/api/reports` endpoint.
- Pages:
  - `/archive`: uses backend search with pagination and page-size selection; falls back to an offline sample dataset and shows a fallback notice.
  - `/archive/browse-by-source`: uses backend source summaries; falls back to offline sample summaries with a notice.
  - `/snapshot/[id]`: fetches backend snapshot detail first; prefers a replay `browseUrl` when configured (full-fidelity CSS/JS/images) and falls back to raw HTML (`/api/snapshots/raw/{id}`) or offline sample HTML when needed.
  - Policy pages: `/governance`, `/terms`, `/privacy`, `/changelog`, `/report`.
  - Service reporting: `/status` (metrics) and `/impact` (monthly report).
  - Partner/citation: `/brief` (one-page brief) and `/cite` (citation handout).
  - Research exports: `/exports` (data dictionary + export manifest).
  - Change tracking: `/changes`, `/compare`, `/digest`.
  - `/browse/[id]`: full-screen “browse archived site” mode with a persistent HealthArchive banner/controls above the replay iframe.
- Health diagnostics (optional): set `NEXT_PUBLIC_SHOW_API_HEALTH_BANNER=true` to surface a small banner when the backend health check fails (useful in dev/staging).
  - If the health banner is off, you can still log failures by setting `NEXT_PUBLIC_LOG_API_HEALTH_FAILURE=true` (dev-only).

### Pre-release smoke (recommended)

- Search (`/archive`): keywords + source filter, pagination (First/Prev/Next/Last), page-size selector.
- Browse by source (`/archive/browse-by-source`): cards load with record counts.
- Snapshot (`/snapshot/[id]`): metadata present; iframe loads or shows error overlay with raw/API links; missing ID returns notFound.
- Browse full-screen (`/browse/[id]`): banner renders; iframe loads replay content and lets you click around within the archived edition.
- Some API calls happen server-side in Next.js; if you don’t see requests in the browser Network tab, tail backend logs or call the API directly to confirm connectivity.

This runs the Next.js/ESLint config for the app.

---

## Project structure (high-level)

```text
.
├── README.md
├── docs/
│   ├── implementation-guide.md # Deep-dive architecture, design system, routes
│   └── i18n.md                 # Localization strategy + English-governs policy
├── package.json
├── next.config.ts
├── tailwind.config.mjs
├── postcss.config.mjs
├── tsconfig.json
├── public/
│   ├── healtharchive-logo.webp  # Primary logo used in header/hero
│   └── demo-archive/            # Static HTML stubs used by the snapshot viewer
└── src/
    ├── proxy.ts                # Locale routing (English canonical; French /fr)
    ├── app/                    # Next.js App Router
    │   ├── [locale]/           # Locale-aware routes (see middleware)
    │   └── api/report/         # Same-origin report intake → backend forward
    ├── components/
    │   ├── i18n/               # LocaleProvider, LocalizedLink, FR banner
    │   ├── layout/             # Header, Footer, PageShell
    │   └── policy/             # English-governs notice for policy pages
    └── data/
        └── demo-records.ts    # Demo dataset + search helpers
```

---

## Deployment

Production is managed via Vercel:

- GitHub repo: [https://github.com/jerdaw/healtharchive-frontend](https://github.com/jerdaw/healtharchive-frontend)
- Production branch: `main`
- Domains:
  - `healtharchive.ca` (apex, A record → Vercel IP)
  - `www.healtharchive.ca` (CNAME → Vercel DNS host)
  - `healtharchive.vercel.app` (default Vercel URL)

Any push to `main` triggers a new Vercel deployment.

---

## Further documentation

- **Architecture & project state:**
  Detailed documentation is now unified in the **Backend** repository.
  Run `make docs-serve` there to view the full Implementation Guide, i18n instructions, and deployment runbooks.
