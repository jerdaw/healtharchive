# Deployment verification – CSP, CORS, and snapshot viewer

This guide walks through verifying a live deployment of the HealthArchive
frontend + backend with a focus on:

- Security headers and CSP on the frontend.
- CORS between the frontend and backend.
- The snapshot viewer iframe loading raw HTML from the backend.

## Current deployment model (important context)

- **Single backend API:** `https://api.healtharchive.ca`
  - Used by both Vercel **Preview** deployments and the **Production** site.
- **Frontend domains:**
  - Production: `https://healtharchive.ca` and `https://www.healtharchive.ca`
  - Vercel project domain: `https://healtharchive.vercel.app`
- **Strict backend CORS allowlist (current choice):**
  - `https://healtharchive.ca`
  - `https://www.healtharchive.ca`
  - `https://healtharchive.vercel.app`

Expected limitation (by design):

- Branch preview URLs like `https://healtharchive-git-...vercel.app` may not be
  allowed by CORS yet and can fall back to offline sample mode until we explicitly add
  those origins.

---

## 1. Confirm environment variables (Vercel)

In the Vercel dashboard for the `healtharchive-frontend` project:

1. Go to **Settings → Environment Variables**.
2. Under **Production**, set:

   ```env
   NEXT_PUBLIC_API_BASE_URL=https://api.healtharchive.ca
   ```

3. Under **Preview**, set the same:

   ```env
   NEXT_PUBLIC_API_BASE_URL=https://api.healtharchive.ca
   ```

4. (Optional, recommended) Enable diagnostics in **Preview only**:

   ```env
   NEXT_PUBLIC_SHOW_API_HEALTH_BANNER=true
   NEXT_PUBLIC_LOG_API_HEALTH_FAILURE=true
   NEXT_PUBLIC_SHOW_API_BASE_HINT=true
   ```

5. Save and redeploy.

---

## 2. Verify frontend security headers & CSP (report-only)

Do these checks in **both** places:

- Production: `https://www.healtharchive.ca/archive`
- Vercel domain: `https://healtharchive.vercel.app/archive`

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

1. Open `https://www.healtharchive.ca/archive`.
2. Confirm the page does not show the offline fallback notice (for example,
   “Live API unavailable”).
3. In **DevTools → Network**, look for requests to `https://api.healtharchive.ca`
   like:
   - `/api/health`
   - `/api/sources`
   - `/api/search?...`
4. Click one of those requests and confirm in **Response headers**:
   - `Access-Control-Allow-Origin` matches the frontend origin
   - `Vary: Origin` is present

### 3.2 Curl check (recommended if Network tab is confusing)

Some API calls may happen server-side in Next.js. To verify CORS directly from
your terminal:

```bash
curl -i \
  -H "Origin: https://www.healtharchive.ca" \
  https://api.healtharchive.ca/api/health | grep -iE "HTTP/|access-control|vary"
```

You should see `HTTP/2 200`, `Access-Control-Allow-Origin: https://www.healtharchive.ca`,
and `Vary: Origin`.

---

## 4. Snapshot viewer verification

This verifies that the snapshot viewer iframe can load raw HTML from the API.

1. Pick a known snapshot ID that exists in the backend (at least one should
   exist in production).
2. Open:

   - `https://www.healtharchive.ca/snapshot/<id>`

3. Confirm:

   - The page loads snapshot metadata (title, capture date, source, URL).
   - The page displays “Archived content · served from
     `https://api.healtharchive.ca/api/snapshots/raw/<id>` …”.
   - The embedded iframe renders HTML content.

---

## 5. Optional: allow branch previews to use the live API

If you decide you want `https://healtharchive-git-...vercel.app` preview URLs
to call the API:

1. Add those preview origins to `HEALTHARCHIVE_CORS_ORIGINS` on the backend.
2. If you enforce CSP (not report-only), ensure `connect-src` and `frame-src`
   include the API host you are using.
3. Redeploy backend + frontend and repeat the checks above.
