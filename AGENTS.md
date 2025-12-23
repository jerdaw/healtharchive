# AGENTS.md – HealthArchive.ca frontend

## Project overview

- Next.js 16 App Router frontend for **HealthArchive.ca**, a public-facing UI for an independent archive of Canadian public health websites.
- Language: **TypeScript**
- Styling:
  - TailwindCSS for layout/spacing/typography utilities.
  - A custom design system via `.ha-*` classes in `src/app/globals.css` for colors, cards, buttons, etc.
- Homepage surfaces and CTAs:
  - Use `ha-home-hero` for featured sections; `ha-home-hero-plain` drops the gradient on follow-up sections while keeping padding/border/shadow; `ha-home-panel` for inset cards.
  - `ha-btn-glow` with `HoverGlowLink` / `HoverGlowButton` provides the subtle cursor-follow highlight on primary/secondary buttons.
- Hero before/after phrase includes a `<noscript>` fallback for non-JS crawlers/users.
- Homepage hero animation events:
  - `ha-trackchanges-finished` is dispatched by `TrackChangesPhrase` after the “before → after” typing sequence completes.
  - “Project snapshot” metrics start on that event and dispatch `ha-project-snapshot-finished` after all metric animations complete (used to trigger the final “before” fade-out).
- Primary documentation for humans and agents:
  - `docs/implementation-guide.md` → architecture, routes, styling system, deployment details.
  - `docs/deployment/verification.md` → Preview/Production CSP/CORS/snapshot viewer verification.
- Canonical public-facing copy (mission + workflow disclaimers) lives in `src/lib/siteCopy.ts` and should be reused rather than duplicated across pages.
- Localization:
  - Locale-aware routes live under `src/app/[locale]/...`.
  - English is canonical/unprefixed; French is under `/fr/...` (see `src/middleware.ts`).
  - French is an automated alpha translation; English governs for any inconsistencies (see `src/components/i18n/FrenchTranslationBanner.tsx` and `src/components/policy/EnglishControlsNotice.tsx`).
  - Prefer `getSiteCopy(locale)` and `pickLocalized(locale, { en, fr })` instead of sprinkling ad-hoc strings.

When you’re unsure about architecture, routes, or design decisions, **read `docs/implementation-guide.md` first instead of guessing**.

---

## Dev environment & commands

From the repo root:

- Install deps: `npm ci`
- Run dev server: `npm run dev`
- Build: `npm run build`
- Full checks (what CI runs): `npm run check`

**Expectations when you change code:**

- For non-trivial changes, run at least:
  - `npm run check`
- If you add new behavior (new route, new helpers, etc.), consider adding or updating tests under `src/**` or the existing test dirs in the same style as current tests.

---

## Environment & API integration

- The frontend talks to a backend API via `src/lib/api.ts`.
- Public endpoints it should use:
  - `GET /api/search`
  - `GET /api/sources`
  - `GET /api/snapshot/{id}`
  - `GET /api/snapshots/raw/{id}`
  - `GET /api/usage`
  - `GET /api/exports`
  - `GET /api/changes`
  - `GET /api/changes/compare`
  - `GET /api/changes/rss`
  - `GET /api/snapshots/{id}/timeline`
- **Never call admin or observability endpoints** (`/api/admin/**`, `/metrics`) from the frontend.

Environment variables (for local dev):

- `NEXT_PUBLIC_API_BASE_URL`
  - Default fallback if unset: `http://localhost:8001`.
  - Local dev example: `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001`.
- Dev/Preview-only diagnostics (can be enabled locally, but keep them off in production/CI):
  - `NEXT_PUBLIC_SHOW_API_HEALTH_BANNER`
  - `NEXT_PUBLIC_LOG_API_HEALTH_FAILURE`
  - `NEXT_PUBLIC_SHOW_API_BASE_HINT`

When wiring new API calls, keep the **public-only** contract and reuse `src/lib/api.ts` if possible instead of scattering `fetch` calls.

---

## Code style & conventions

- Use **TypeScript** with types that match existing patterns.
- Use **Next.js 16 App Router** idioms:
  - `searchParams` and `params` are **Promises** in server components – don’t “fix” that back to the old Next 13 signature.
  - Tests that render server route components should `await Page(...)` and then `render(ui)`.
- Routing:
  - Archive/search/browse: under `src/app/archive/**`
  - Snapshot viewer: `src/app/snapshot/[id]/page.tsx`
  - Static content pages: `/methods`, `/researchers`, `/about`, `/contact`
  - Reporting pages: `/status`, `/impact`
  - Change tracking pages: `/changes`, `/compare`, `/digest`
- Layout:
  - Shared layout & shell:
    - `src/components/layout/Header.tsx`
    - `src/components/layout/Footer.tsx`
    - `src/components/layout/PageShell.tsx`
  - Reuse `<PageShell>` for new inner pages so overall structure stays consistent.

### Styling

- **Prefer `.ha-*` classes** from `src/app/globals.css` for:
  - Cards (`.ha-card`, `.ha-card-title`, `.ha-card-body`, …)
  - Buttons (`.ha-btn-primary`, `.ha-btn-secondary`)
  - Badges (`.ha-badge`, `.ha-tag`)
  - Layout sections (`.ha-main`, `.ha-grid-2`, `.ha-grid-3`, `.ha-section-heading`, …)
- Use Tailwind utilities mainly for:
  - Layout/spacing (`flex`, `grid`, `gap-*`, `px-*`, `py-*`)
  - Typography (`text-sm`, `text-xs`, `font-semibold`, etc.)
- Don’t reintroduce broken `bg-ha-*` style Tailwind classes. Color tokens live in CSS variables; `.ha-*` classes should consume them.

### Theme / accessibility

- Theme is controlled by `data-theme` on `<html>` + CSS variables in `globals.css`.
- Don’t remove:
  - The inline theme-bootstrapping script in `layout.tsx`.
  - The theme toggle in `<Header />`.
  - The skip link to `#main-content`.
- Respect existing accessibility patterns:
  - `aria-current="page"` for active nav.
  - `prefers-reduced-motion` handling.
  - Focus-visible outlines.

---

## Testing expectations

When you touch anything that affects:

- Search, filtering, pagination, or snapshot rendering → add/adjust tests around:
  - `/archive`
  - `/archive/browse-by-source`
  - `/snapshot/[id]`
- Routing / 404 behavior → test the relevant route component, not just helpers.
- API integration logic → mock `fetch` in tests (see existing patterns) instead of hitting real endpoints.

CI (GitHub Actions) will run:

- `npm ci`
- `npm run check`

Aim to keep those passing.

---

## Safety rails / things not to touch casually

- Don’t:
  - Make the site look like or imply affiliation with an official government website.
  - Remove or weaken disclaimers about independence / non-authoritative status in the header/footer.
  - Call or expose admin API endpoints or `/metrics` to the browser.
- Be cautious editing:
  - `docs/implementation-guide.md` – it’s the main architecture doc. Propose changes in chat unless explicitly asked to modify it.
  - The snapshot viewer iframe sandboxing or CSP-related configs in `next.config.ts`. These are intentionally conservative for security.
- Demo HTML files in `public/demo-archive/**`:
  - Treat as curated examples. Only add/change these when explicitly asked, and keep paths consistent with `snapshotPath` in `src/data/demo-records.ts`.
