# Bilingual maintenance rules (EN/FR)

These rules keep bilingual copy safe and consistent over time.

## When changing copy

1. Update **English and French in the same change**.
2. Prefer canonical copy in `src/lib/siteCopy.ts` for shared disclaimers.
3. Avoid idioms and keep sentences short to improve translation quality.
4. Keep disclaimers strong: no affiliation, not medical advice, archived content may be outdated.

## Policy pages

1. `/terms`, `/privacy`, `/governance` must include the English-governs notice.
2. French pages must link clearly to the official English text.
3. Do not weaken any legal or safety wording in French.

## Metadata and SEO

1. New routes must export `generateMetadata` using `buildPageMetadata()` from
   `src/lib/metadata.ts`.
2. Keep `/fr/...` `noindex` while French remains alpha.
3. Use `localeToLanguageTag()` for dates and numbers (avoid implicit locales).

## Downloadables

1. Always ship FR equivalents for public handouts and dictionaries.
2. Keep file names mirrored (`*.fr.md`) and link them from the FR UI.

## QA expectations

1. Run `npm run check` before merging.
2. Ensure the forbidden-reference scan stays green.
3. Spot-check `/fr/*` paths after any routing or navigation change.
