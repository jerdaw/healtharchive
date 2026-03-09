# Deployment verification – CSP, CORS, and snapshot viewer

This guide walks through verifying a live deployment of the HealthArchive
frontend + backend with a focus on:

- Security headers and CSP on the frontend.
- CORS between the frontend and backend.
- The snapshot viewer iframe loading raw HTML from the backend.

## Current deployment model (important context)

- **Single backend API:** `https://api.healtharchive.ca`
- **Canonical frontend domain:** `https://healtharchive.ca`
- **Frontend alias:** `https://www.healtharchive.ca` (redirects to apex)
- **Replay domain:** `https://replay.healtharchive.ca`
- **Target frontend runtime:** VPS-hosted Next.js container behind host Caddy
- **Strict backend CORS allowlist (current choice):**
  - `https://healtharchive.ca`
  - `https://www.healtharchive.ca`
  - `https://replay.healtharchive.ca`

---

## 1. Confirm frontend runtime environment

For the deployed frontend runtime, set:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.healtharchive.ca
NEXT_PUBLIC_REPLAY_BASE_URL=https://replay.healtharchive.ca
```

Optional diagnostics envs should normally remain disabled in production:

```env
NEXT_PUBLIC_SHOW_API_HEALTH_BANNER=true
NEXT_PUBLIC_LOG_API_HEALTH_FAILURE=true
NEXT_PUBLIC_SHOW_API_BASE_HINT=true
```

---

## 2. Verify frontend security headers & CSP (report-only)

Do these checks on the production frontend:

- `https://healtharchive.ca/archive`

In Chrome or Firefox DevTools:

1. Open the page.
2. Open **DevTools → Network** and reload.
3. Click the main document request (usually the first row with path `/archive`).
4. In **Headers → Response headers**, confirm you see:
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
   - `Content-Security-Policy-Report-Only: ...` with a value containing:
     - `connect-src 'self' https://api.healtharchive.ca;`
     - `frame-src 'self' https://api.healtharchive.ca https://replay.healtharchive.ca;`

5. Check the **Console** tab for `Content-Security-Policy-Report-Only` warnings.
   Some warnings are expected while the CSP is report-only and being tuned.

---

## 3. Verify the UI is using the live API (and CORS is correct)

### 3.1 Browser checks

1. Open `https://healtharchive.ca/archive`.
2. Confirm the page does not show the offline fallback notice (for example,
   “Live API unavailable”).
3. (Optional, if previews are enabled) Confirm the “Browse archived sites” cards
   show preview images. If they do not:
   - confirm `HEALTHARCHIVE_REPLAY_PREVIEW_DIR` is set on the backend host, and
   - confirm `/api/sources` includes `entryPreviewUrl` values.
4. In **DevTools → Network**, look for requests to `https://api.healtharchive.ca`
   like:
   - `/api/health`
   - `/api/sources`
   - `/api/search?...`
5. Click one of those requests and confirm in **Response headers**:
   - `Access-Control-Allow-Origin` matches the frontend origin
   - `Vary: Origin` is present

### 3.2 Curl check (recommended if Network tab is confusing)

Some API calls may happen server-side in Next.js. To verify CORS directly from
your terminal:

```bash
curl -i \
  -H "Origin: https://healtharchive.ca" \
  https://api.healtharchive.ca/api/health | grep -iE "HTTP/|access-control|vary"
```

You should see `HTTP/2 200`, `Access-Control-Allow-Origin: https://healtharchive.ca`,
and `Vary: Origin`.

---

## 4. Snapshot viewer + replay verification

This verifies that the snapshot viewer iframe can load **replay** content from
`replay.healtharchive.ca` (preferred), and that raw HTML from the API remains
available as a fallback/debug path.

1. Pick a known snapshot ID that exists in the backend (at least one should
   exist in production).
2. Open (metadata + embedded viewer):

- `https://healtharchive.ca/snapshot/<id>`

3. Confirm:
   - The page loads snapshot metadata (title, capture date, source, URL).
   - If replay is configured, the page displays “Archived content · served from
     `https://replay.healtharchive.ca/...` via the replay service.”
   - The embedded iframe renders the archived page (CSS/JS/images should load where captured).
   - The page still offers a “Raw HTML” link to `https://api.healtharchive.ca/api/snapshots/raw/<id>`.

4. Open the full-screen browse view:

- `https://healtharchive.ca/browse/<id>`

Confirm it loads the same replay content with a persistent HealthArchive
banner/controls above the iframe.

5. (Optional, if a source has multiple editions) Verify edition switching:
   - In `/browse/<id>` (or `/snapshot/<id>`), look for an “Edition” / “Switch edition” dropdown.
   - Click a few links inside the replay iframe to navigate to a deeper page.
   - Switch the dropdown to another job/edition and confirm:
     - the viewer attempts to keep you on the _same original URL_ in the selected edition, and
     - if that page wasn’t captured in the selected edition, it falls back to the edition’s entry page with a short notice.

6. Verify “Browse archived sites” search shortcuts:
   - On `https://healtharchive.ca/archive`, click **Search** on one of the “Browse archived sites” cards.
   - Confirm:
     - the Source filter updates to that source (not “All sources”), and
     - the page scrolls to the Search card without the fixed header covering its title.

7. (Optional) Verify the direct replay banner (non-framed replay):
   - From a snapshot page, click **Replay ↗** to open the replay service in a new tab.
   - Confirm the replay banner:
     - shows a compact snapshot summary,
     - includes links like **View diff** / **Raw HTML** / **Metadata JSON**, and
     - **← HealthArchive.ca** returns to the specific `/snapshot/<id>` page (not the homepage).

---

## 5. Optional: allow additional preview origins

If you later introduce a separate staging frontend origin:

1. Add that origin to `HEALTHARCHIVE_CORS_ORIGINS` on the backend.
2. Ensure `connect-src` and `frame-src` continue to allow the API and replay hosts.
3. Redeploy backend + frontend and repeat the checks above.
