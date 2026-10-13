# Deployment verification – CSP, CORS, and snapshot viewer

This guide walks through verifying a live deployment of the HealthArchive
frontend + backend with a focus on:

- Security headers and CSP on the frontend.
- CORS between the frontend and backend.
- The snapshot viewer iframe loading raw HTML from the backend.

Shared-host ownership note:

- This guide is canonical for HealthArchive frontend verification steps.
- Shared host topology, ingress ownership, and other cross-project host facts are canonical in `private shared-ops workspace`.
- Boundary reference: `private shared-ops documentation boundary`

## Current deployment model (important context)

- **Single backend API:** `https://api.healtharchive.ca`
- **Canonical frontend domain:** `https://healtharchive.ca`
- **Frontend alias:** `https://www.healtharchive.ca` (redirects to apex)
- **Replay domain:** `https://replay.healtharchive.ca`
- **Target frontend runtime:** hosted Next.js container behind host ingress
- **Runtime cache:** `/app/.next/cache` should be mounted as the named Docker
  volume `healtharchive-frontend-next-cache` in production.
- **Strict backend CORS allowlist (current choice):**
  - `https://healtharchive.ca`
  - `https://www.healtharchive.ca`
  - `https://replay.healtharchive.ca`

---

## 1. Confirm frontend build and runtime configuration

Next.js compiles `NEXT_PUBLIC_*` values into the browser bundle at build time.
For the production Dockerfile, the public API and replay URL defaults are
`https://api.healtharchive.ca` and `https://replay.healtharchive.ca`. For a
different public deployment, pass the matching `NEXT_PUBLIC_API_BASE_URL` and
`NEXT_PUBLIC_REPLAY_BASE_URL` as Docker build args. Setting them only in the
container runtime env file does not change the built browser bundle. These
values are public; do not pass secrets as `NEXT_PUBLIC_*` variables or build
args.

The Docker image smoke in frontend CI starts the production-default image in a
bounded, read-only, non-root container with networking disabled. It checks the
canonical English and French exports/status responses for expected public API
references and rejects the known localhost and sentinel values. Status-page
archive links may be API-provided external replay URLs or the locale-canonical
internal `/browse/{numeric-id}` fallback. Every external archived-site anchor
is checked independently; only `/browse/{positive-id}` in English and
`/fr/browse/{positive-id}` in French are accepted as internal fallbacks. An
API-unavailable page with no such links is valid only when it has the canonical
status-page structure. This is not proof of every client/server request or a
live service check.
Independently of backend data, the smoke resolves the archive page through
Next's app-path manifest and checks its directly referenced server chunks for
compiled-literal evidence of the replay origin, rejecting the known sentinel
and unresolved runtime variable. This is not a full rendered-link proof or a
complete search for every possible origin in the application. The Dockerfile
contract test checks the declared build defaults and stage assignments.

The application and direct `npm run build` path retain the legacy
`NEXT_PUBLIC_BACKEND_URL` fallback. The Dockerfile's production default sets
`NEXT_PUBLIC_API_BASE_URL`, so Docker builds must use that preferred build arg
to select a custom API host; a legacy-only Docker arg does not override it.

`scripts/deploy-vps-proof.sh` runs `docker build` without public build args and
is supported only with the Dockerfile's production defaults. Its runtime env
file cannot select staging or custom browser URLs; do not use that helper for
those builds.

If these values are also retained in the deployed frontend runtime env file,
keep them aligned for clarity; runtime values do not override the compiled
browser bundle:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.healtharchive.ca
NEXT_PUBLIC_REPLAY_BASE_URL=https://replay.healtharchive.ca
```

Optional diagnostics remain disabled by default in the production Dockerfile.
Because these flags are also inlined at build time, enable one only in a
separately built diagnostic image with explicit Docker build args; setting a
runtime env-file value alone has no effect on the browser bundle. Example:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SHOW_API_HEALTH_BANNER=true \
  --build-arg NEXT_PUBLIC_LOG_API_HEALTH_FAILURE=true \
  --build-arg NEXT_PUBLIC_SHOW_API_BASE_HINT=true \
  -t healtharchive-frontend:diagnostic .
```

Confirm the runtime cache is externalized from the Docker writable layer:

```bash
sudo docker inspect healtharchive-frontend \
  --format '{{range .Mounts}}{{println .Type .Name .Destination}}{{end}}' \
  | grep '/app/.next/cache'
```

---

## 2. Verify frontend security headers & CSP

Current posture note:

- Production should send an enforcing `Content-Security-Policy` header.
- No dedicated CSP report collector is configured yet, so header inspection,
  browser console errors, and functional smoke checks are the practical
  verification signals today.

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
   - `Content-Security-Policy: ...` with a value containing:
     - `script-src 'self' 'unsafe-inline';`
     - `connect-src 'self' https://api.healtharchive.ca;`
     - `frame-src 'self' https://api.healtharchive.ca https://replay.healtharchive.ca;`
   - No `Content-Security-Policy-Report-Only` header on the same response.

5. Check the **Console** tab for `Content-Security-Policy` errors. Any blocking
   errors on the primary archive, browse, search, report-issue, or replay flows
   should block deployment until either the policy or source behavior is fixed.
   The current enforced policy allows inline scripts for Next.js bootstrap and
   JSON-LD compatibility; a nonce-based CSP can tighten this in a later
   hardening pass.

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
