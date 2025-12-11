# Staging verification – CSP, headers, and snapshot viewer

This guide walks through verifying the **staging deployment** of the
HealthArchive frontend + backend with a focus on security headers, CSP, and
the snapshot viewer.

It assumes:

- Frontend preview/staging URL: something under `https://healtharchive.vercel.app`
  (or a specific Vercel preview URL).
- Backend staging API: `https://api-staging.healtharchive.ca` (or whatever you
  configured).

---

## 1. Confirm staging environment variables

### 1.1 Backend (staging host)

On the **staging backend** host (VM, container, or PaaS):

- Set the environment variables:

  ```bash
  export HEALTHARCHIVE_ENV=staging
  export HEALTHARCHIVE_DATABASE_URL=postgresql+psycopg://user:pass@db-host:5432/healtharchive_staging
  export HEALTHARCHIVE_ARCHIVE_ROOT=/srv/healtharchive/jobs-staging
  export HEALTHARCHIVE_ADMIN_TOKEN="<long-random-secret>"
  export HEALTHARCHIVE_CORS_ORIGINS="https://healtharchive.vercel.app"
  ```

  Adjust the DB URL, archive root, and CORS origins as needed. If you use
  multiple preview URLs, include them in `HEALTHARCHIVE_CORS_ORIGINS` as a
  comma-separated list.

- Restart the backend service (systemd/Docker/PaaS).

### 1.2 Frontend (Vercel Preview env)

In the Vercel dashboard for the `healtharchive-frontend` project:

1. Go to **Settings → Environment Variables → Preview**.
2. Set:

   ```env
   NEXT_PUBLIC_API_BASE_URL=https://api-staging.healtharchive.ca
   NEXT_PUBLIC_SHOW_API_HEALTH_BANNER=true
   NEXT_PUBLIC_LOG_API_HEALTH_FAILURE=true
   NEXT_PUBLIC_SHOW_API_BASE_HINT=true
   ```

3. Save and trigger a new **Preview** deployment (e.g., push a commit to a
   feature/staging branch or redeploy the latest preview build).

---

## 2. Grab the preview URL

After the Vercel build completes:

1. Go to the project’s **Deployments** tab.
2. Click the latest **Preview** deployment (from your staging/feature branch).
3. Copy the deployment URL, e.g.

   ```text
   https://healtharchive-git-staging-<hash>.vercel.app
   ```

You’ll use this URL for all of the checks below.

---

## 3. Verify frontend security headers & CSP (report-only)

In Chrome or Firefox DevTools:

1. Open the preview URL’s `/archive` route, e.g.:

   ```text
   https://healtharchive-git-staging-<hash>.vercel.app/archive
   ```

2. Open **DevTools → Network** and reload the page.
3. Click the main document request (usually the first row with path `/archive`).
4. In the **Headers** panel, under *Response headers*, confirm you see:

   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
   - `Content-Security-Policy-Report-Only: ...` with a value containing:
     - `default-src 'self';`
     - `script-src 'self';`
     - `style-src 'self' 'unsafe-inline';`
     - `img-src 'self' data: https:;`
     - `font-src 'self' data:;`
     - `connect-src 'self' https://api.healtharchive.ca https://api-staging.healtharchive.ca;`
     - `frame-src 'self' https://api.healtharchive.ca https://api-staging.healtharchive.ca;`
     - `frame-ancestors 'self';`
     - `base-uri 'self';`
     - `form-action 'self';`

5. Check the **Console** tab:
   - Look for any `Content-Security-Policy-Report-Only` warnings.
   - If you see violations (e.g., a script or connection blocked by the
     policy), note the directive and origin—in a future iteration you can
     either adjust the CSP or fix the offending resource.

---

## 4. Verify backend security headers & CORS via the browser

While still on `/archive` with the Network tab open:

1. Filter requests by `"api"` or look for requests to
   `https://api-staging.healtharchive.ca`.
2. Click the `GET /api/health` request.
3. Under **Response headers**, confirm:

   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `X-Frame-Options: SAMEORIGIN`
   - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
   - `Access-Control-Allow-Origin: https://healtharchive-git-staging-<hash>.vercel.app`
   - `Vary: Origin`

4. Click a `GET /api/search?...` request and confirm:

   - HTTP 200 response.
   - JSON body matching the search response schema.
   - The same security + CORS headers as above.

If the headers are missing, ensure:

- The staging backend is running the latest code from `main`.
- No reverse proxy is stripping or overriding these headers.

---

## 5. Verify snapshot viewer sandboxing

1. Navigate to a snapshot page on the preview frontend:

   ```text
   https://healtharchive-git-staging-<hash>.vercel.app/snapshot/42
   ```

   (Use a snapshot ID that exists in the staging backend or a demo ID.)

2. In **DevTools → Elements**, locate the `<iframe>` inside the snapshot
   viewer (`SnapshotFrame`).

3. Confirm the iframe has:

   - `src` pointing to the backend raw snapshot URL, e.g.:

     ```text
     https://api-staging.healtharchive.ca/api/snapshots/raw/42
     ```

   - A `sandbox` attribute:

     ```text
     sandbox="allow-same-origin allow-scripts"
     ```

4. In the Network tab, click the iframe’s request (the `GET /api/snapshots/raw/{id}`
   call) and confirm the same backend security headers as in `/api/health`.

---

## 6. Verify backend health via curl

From your own terminal (not inside this repo’s sandbox):

```bash
curl -i "https://api-staging.healtharchive.ca/api/health"
```

You should see:

- `HTTP/1.1 200 OK`
- JSON body with `"status": "ok"`.
- Security headers as documented above.

To explicitly verify CORS:

```bash
curl -i \
  -H "Origin: https://healtharchive.vercel.app" \
  "https://api-staging.healtharchive.ca/api/health"
```

The response should include:

```text
Access-Control-Allow-Origin: https://healtharchive.vercel.app
Vary: Origin
```

---

## 7. Monitoring (optional but recommended)

Once staging looks good:

1. Configure an uptime monitor (e.g., UptimeRobot, healthchecks.io) for:
   - `GET https://api.healtharchive.ca/api/health`
   - `GET https://healtharchive.ca/archive`
2. If you have Prometheus or similar, configure it to scrape:
   - `https://api.healtharchive.ca/metrics`
   - Build dashboards/alerts for:
     - `healtharchive_jobs_total{status="failed"}`
     - `healtharchive_snapshots_total`
     - `healtharchive_jobs_cleanup_status_total{cleanup_status="temp_cleaned"}`

After these checks pass in staging, you can safely apply the same configuration
to production, and later switch the CSP header from `Report-Only` to a
fully-enforced `Content-Security-Policy` once you’re confident it does not
block legitimate traffic.

