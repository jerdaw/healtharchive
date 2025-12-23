# Bilingual release checklist (EN/FR)

Use this checklist before shipping bilingual UI + copy updates.

## Pre-release checks

1. **Coverage:** Every route under `src/app/[locale]/` renders EN + FR copy. No untranslated UI strings.
2. **Downloadables:** FR handouts exist and are linked correctly:
   - `public/partner-kit/healtharchive-brief.fr.md`
   - `public/partner-kit/healtharchive-citation.fr.md`
   - `public/exports/healtharchive-data-dictionary.fr.md`
3. **Policy pages:** `/terms`, `/privacy`, `/governance` show the English-governs notice and an explicit English link.
4. **SEO tags:** `hreflang` alternates present for `en-CA` and `fr-CA` on every page.
5. **Noindex posture:** `/fr/...` is marked `noindex` while FR is alpha.
6. **Copy safety:** No wording implies official affiliation or medical advice.
7. **Content audit check:** `npm run check` passes (includes a forbidden-reference scan).

## Manual smoke checks (both locales)

1. Language toggle keeps the same path and query string.
2. Dynamic routes:
   - `/snapshot/<id>` ↔ `/fr/snapshot/<id>`
   - `/browse/<id>` ↔ `/fr/browse/<id>`
3. Forms: `/report` validation copy and privacy warnings are localized.
4. Date/number formatting uses `en-CA` / `fr-CA`.

## Release steps

1. Run `npm run check`.
2. Preview `/` and `/fr` on production build.
3. If/when you decide to index French pages, remove the `noindex` flag in
   `src/app/[locale]/layout.tsx` and confirm sitemap coverage (if enabled).

## Post-release monitoring

1. Monitor `/fr/*` 404s and redirect health.
2. Track translation error reports and correct English + French together.
