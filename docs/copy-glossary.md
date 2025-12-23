# HealthArchive.ca – Copy glossary (EN baseline)

This glossary defines canonical terms used in the UI and public materials so copy stays consistent.

Scope: **UI + project copy**. Archived snapshots remain as-captured (no translation of archived
content).

HealthArchive supports French UI under `/fr/...`, but the French copy is an **automated,
convenience-only** translation and may contain errors. The English text is the source of truth
and governs in the event of inconsistency.

When editing localized copy, translate _concepts_, not words.

## Canonical terms

### Snapshot

A single archived capture of a page at a specific time.

Use in UI:

- “Snapshot details”
- “Archived snapshot”
- “Snapshot ID”

Avoid:

- Using “snapshot” to mean a set of captures across time (use “timeline” or “captures”).

### Capture

The act of archiving a page at a time, and/or the recorded capture time.

Use in UI:

- “Capture date”
- “Other captures of this page”

### Archived content

Content displayed on HealthArchive that reflects what the original site showed at capture time.

Always pair with the safety posture (not current guidance, may be outdated).

### Replay / Browse

Replay: opening an archived page through the replay service (high fidelity when available).

Browse (full screen): the HealthArchive UI that wraps replay/raw HTML in a controlled frame with
clear disclaimers and navigation back to the archive.

Use in UI:

- “Browse full screen”
- “Open in replay”

### Edition

A named/coded capture run or release slice used for comparing and navigating changes (for example,
annual edition captures). In the UI we call these “editions” rather than “backups.”

Use in UI:

- “Switch edition”
- “Edition (latest by default)”

Avoid:

- “Backup” (too infrastructure-flavored and ambiguous).

### Change tracking

Feature that summarizes text differences between captures.

Always describe as “descriptive only” and “does not interpret meaning.”

Use in UI:

- “Change tracking”
- “Compare captures”

### Compare view

A page that shows a descriptive diff between two captures (from/to snapshot IDs).

### Digest / RSS

Digest: a lightweight view of change events and links to RSS feeds.

Always clarify: edition-to-edition changes, not real-time monitoring.

### Source

The originating organization/domain (e.g., Health Canada, PHAC).

Use in UI:

- “Browse by source”
- “Search this source”

### Original URL

The URL as published by the source site (the thing users should cite alongside the snapshot link).

Use in UI:

- “Original URL”
- “Copy original URL”

### Metadata

The descriptive fields associated with a snapshot (title, capture date/time, source, language,
status code, etc.).

Use in UI:

- “Metadata JSON”
- “View … metadata”
