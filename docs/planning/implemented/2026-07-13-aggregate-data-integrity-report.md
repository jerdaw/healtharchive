# Aggregate data-integrity report

## Goal

Generate one public-safe, reproducible corpus-level integrity artifact that
reports snapshot coverage, WARC and checksum coverage, and the latest
successful crawl for each source without exposing storage paths or private
operational details.

## Scope

- Add a dedicated report model and collector for global and per-source
  snapshot counts, relevant successful jobs, canonical WARC counts, manifest
  coverage, checksum results, distinct snapshot WARC-reference readability,
  and latest successful crawl metadata.
- Use explicit `pass`, `fail`, and `incomplete` semantics. Missing manifests,
  absent checksums, unreadable storage, and undiscoverable files must never be
  presented as verified.
- Harden manifest verification so hash-level verification accounts for entries
  without hashes, orphaned stable WARCs, and zero-byte candidates.
- Add a schedulable `healtharchive data-integrity-report` CLI that renders
  deterministic, versioned JSON and Markdown, writes atomically, and refuses
  to overwrite artifacts unless explicitly requested.
- Keep report payloads public-safe: no output directories, WARC paths, raw
  exception text, host topology, credentials, or operator-only instructions.
- Document the public contract and local command while leaving environment
  scheduling and publication procedures in the private operations source of
  truth.

## Validation

- Add focused collector, renderer, CLI, manifest, zero-byte, and public-safety
  regression tests.
- Run the existing WARC manifest, WARC verification, and discovery suites.
- Run Ruff, mypy, backend CI, strict documentation checks, and the repository
  pre-push parity gate.

## Outcome

Implemented the aggregate collector, deterministic JSON and Markdown
renderers, staged/rollback-safe CLI artifact output, explicit status/exit
semantics, and manifest hardening in one batch. Focused coverage includes
complete reports, missing and invalid evidence, checksum mismatch, discovery
failure, empty state, public-safety boundaries, overwrite refusal, and
fast-inventory status.
Generating and publishing the first live-corpus artifact remains external work:
it requires access to the live database/storage plus an operator-owned cadence
and destination, all of which stay outside this public repository.
