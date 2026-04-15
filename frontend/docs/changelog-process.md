# Changelog process (public-facing)

This project keeps a simple, public changelog so ongoing maintenance is legible to users, partners, and researchers.

## Source of truth

- UI route: `src/app/[locale]/changelog/page.tsx`
- Entries: `src/content/changelog.ts`

## When to add an entry

Add a changelog entry for:

- New user-visible features or workflows (search, browse, snapshot viewer, compare, exports).
- Public policy/governance changes (scope/cadence/provenance/corrections/takedown posture).
- Dataset releases (new cadence, new fields, new manifest rules).
- Reliability changes that affect expectations (major outages, integrity incidents, material operational changes).

Do not add entries for internal refactors unless they change user-visible behavior or operational posture.

## Entry format

Each entry has:

- `date`: `YYYY-MM-DD` (UTC date of release/change)
- `title`: short, noun-phrase summary
- `items`: 2–6 bullets; concrete, factual, public-safe

Style rules:

- Avoid internal hostnames, secrets, and sensitive incident details.
- Prefer “what changed” over implementation detail.
- Keep it boring and scannable; link to stable public pages when helpful.

## Ordering

Entries should be listed newest-first (prepend new entries to the arrays).

## Localization

- Changelog entries exist in both `en` and `fr`.
- French is an alpha, automated translation elsewhere, but changelog entries are curated copy; keep them coherent and aligned.
- If there is any inconsistency, English governs (see `docs/i18n.md`).

Practical workflow:

1. Add the English entry.
2. Add a matching French entry with the same structure and intent.
3. Run `npm run check` and verify the `/changelog` page renders in both locales.
