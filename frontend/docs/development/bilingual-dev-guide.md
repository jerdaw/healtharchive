# Bilingual development guide (EN/FR)

This guide helps future work stay consistent with the bilingual UI and the
English-governs policy. It applies to UI + project copy only. Archived snapshots
remain as-captured and are never translated.

## Principles and scope

1. English is the source of truth; French is a convenience translation.
2. Bilingual parity is the default for user-facing UI and copy.
3. Keep safety and non-affiliation wording consistent across locales.
4. Prefer evolvable patterns over one-off strings and ad-hoc routing.
5. If a change cannot follow these defaults, note the exception and update
   relevant docs or policies.

## Quick rules (TL;DR)

1. Ship English and French copy in the same change by default.
2. Default to localized utilities for user-facing strings.
3. Every new route must export `generateMetadata` via `buildPageMetadata()`.
4. Keep `/fr/...` pages `noindex` while French is alpha (unless policy changes).
5. Policy pages must include the English-governs notice and link.
6. Do not introduce forbidden references in repo content.

## Source of truth for copy

- Canonical shared copy: `src/lib/siteCopy.ts`
- Small localized snippets: `src/lib/localized.ts`
- Locale helpers: `src/lib/i18n.ts`
- Metadata helpers: `src/lib/metadata.ts`
- Routing + base metadata: `src/app/[locale]/layout.tsx`
- Replay banner (direct replay pages): `healtharchive-backend/docs/deployment/pywb/custom_banner.html`
  - Keep EN/FR strings in sync; the banner infers UI language from the archived URL.

Prefer reusing canonical copy to avoid drift. If a string is locale-invariant
(for example, a product name or code), keep it literal and document the choice
in the PR if it is not obvious.

## Adding or editing UI copy

1. Update English first, then add French in the same change whenever possible.
2. Keep sentences short and literal; avoid idioms and wordplay.
3. Avoid string concatenation. Use templates/placeholders so French can reorder
   naturally.
4. Reuse canonical disclaimers from `getSiteCopy(locale)` where possible.
5. Keep safety posture strong: not medical advice, not official, archived
   content may be outdated or incomplete.
6. When introducing new terminology, add it to the glossary docs.

## Adding new routes or pages

1. Create the page under `src/app/[locale]/...`.
2. Export `generateMetadata` and use `buildPageMetadata()`.
3. Ensure `hreflang` alternates are present (handled by metadata helper).
4. Use `localeToLanguageTag(locale)` for dates/numbers, not implicit locales.
5. When linking internally, rely on locale-aware helpers:
   - `LocalizedLink` (`src/components/i18n/LocalizedLink.tsx`)
   - `localizeHref()` (`src/lib/i18n.ts`)
     Avoid hardcoded `/fr` or unprefixed paths.
6. If the route is part of the “public surface” you rely on in production, add it to the backend verifier:
   - `healtharchive-backend/scripts/verify_public_surface.py`
   - Include both unprefixed (EN) and `/fr/...` (FR) variants when applicable.

## Policy and legal pages

Required pages: `/terms`, `/privacy`, `/governance`.

Rules:

- Include the English-governs notice on both EN and FR pages.
- French versions must link clearly to the official English text.
- Keep wording aligned with canonical policy copy.

## Downloadables and external assets

- Provide French equivalents for public handouts and dictionaries.
- Use mirrored filenames (`*.fr.md`) and link to them from French pages.
- Do not apply the English-governs notice to marketing handouts.

## Localization behavior and routing

- English URLs are unprefixed: `/archive`, `/snapshot/123`.
- French URLs are prefixed: `/fr/archive`, `/fr/snapshot/123`.
- Use `localeToLanguageTag()` for `en-CA` / `fr-CA` formatting.
- Do not translate archived snapshots or embedded captures.
- Language switching should preserve the current path and query string.

## Locale access in components

- Server components: resolve locale from route params or use helpers like
  `resolveLocale(params)`.
- Client components: use `LocaleProvider` + `useLocale()` to avoid implicit
  browser locale behavior.

## PR checklist

1. `npm run check` passes (includes forbidden references scan).
2. New strings exist in both languages.
3. New routes export `generateMetadata`.
4. `/fr/...` pages remain `noindex` while alpha.
5. Policy pages retain the English-governs notice and link.
6. Any new glossary terms are recorded.

## If you need an exception

Occasionally a feature may land in English first (for example, a time-sensitive
UI fix). If this happens:

1. Keep user-facing strings minimal and localized if possible.
2. Note the exception in the PR and plan a follow-up translation change.
3. If behavior changes, update the relevant docs listed below.

## When to update docs

Update these if behavior changes:

- `docs/i18n.md` (routing, policy, or SEO changes)
- `docs/deployment/bilingual-release-checklist.md` (release posture)
- `docs/development/bilingual-maintenance.md` (ongoing rules)
