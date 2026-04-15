# Annual Crawl Content-Cost and Scope Diagnosis (Implemented 2026-04-14)

**Status:** Implemented | **Scope:** Added a bounded operator report for classifying annual-crawl cost/failure drivers, used it to separate PHAC runtime friction from CIHR media-heavy frontier waste, and completed the CIHR scope remediation and verification loop.

## Outcomes

- Added `scripts/vps-crawl-content-report.py` with automated coverage in `tests/test_ops_crawl_content_report.py` so operators can classify active annual jobs without doing a heavy full-WARC scan by default.
- Tightened the report bootstrap path so it auto-loads the repo venv and production env when run directly on the VPS.
- Reduced stale crawl warning noise by requiring temp-dir and container-restart alerts to keep growing before they fire.
- PHAC pilot evidence stayed concentrated in in-scope HTML/runtime families, so no broad PHAC scope cuts were recommended from this plan.
- Updated annual-campaign policy so CIHR now uses a source-managed custom scope:
  - HTML pages on `cihr-irsc.gc.ca` stay in scope.
  - Render-critical assets stay in scope.
  - Top-level binary/media/archive frontier expansion is excluded.
  - `asl-video/...` descendants are excluded.
  - HTML query-string variants such as `?wbdisable=false` no longer expand the crawl frontier.
- Added reconciliation coverage so existing annual CIHR jobs are rewritten onto the canonical scope during `reconcile-annual-tool-options`.
- Completed the 2026-04-14 production maintenance window for CIHR:
  - deployed the scope fix on the VPS
  - reconciled job `8` from `scopeType=host` to `scopeType=custom`
  - reset the poisoned resume/temp frontier while preserving historical WARCs
  - verified the restarted crawl used the new custom scope in live logs
  - verified the live frontier shrank from roughly `25.6k` URLs to `7.2k`, with clean depth-3 HTML pages and no live `wbdisable=false` / `asl-video` / `.mp4` / `.pdf` frontier churn in the new combined log

## Canonical Docs Updated

- `docs/operations/annual-campaign.md`
- `docs/operations/runbooks/crawl-restart-budget-low.md`
- `docs/operations/runbooks/crawl-temp-dirs-high.md`
- `docs/operations/healtharchive-ops-roadmap.md`

## Historical Context

Full implementation detail is preserved in git history. The repo-side sequence landed across `f74c77a`, `48389eb`, `b2eb00f`, and `95f7e06`.
