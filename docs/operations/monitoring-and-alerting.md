# Observability Overview

HealthArchive uses environment-specific monitoring to track scheduled jobs,
ingestion health, and service availability.

This public document describes the kinds of signals that are useful to monitor:

- crawler completion status
- dataset freshness
- service availability
- error rates
- storage usage
- release health

## Signal Tiers

Monitoring signals are separated by operator impact:

- **Dashboard signal:** useful for diagnosis, trend review, and future roadmap
  work, but not enough to interrupt the operator.
- **Warning:** a sustained condition worth reviewing during normal maintenance;
  warnings do not page by default.
- **Action-required page:** a sustained, actionable condition that needs human
  attention. These alerts must opt in explicitly to private notification
  delivery and carry a critical notification tier.

Transient availability flaps, short-lived search errors, internal scrape
failures, and resolved events should remain in monitoring history without
becoming push notifications. External uptime monitoring owns public
availability paging when it is configured with a sustained-delay threshold.

In critical-only mode, only `P0` and `P1` operational alerts may interrupt the
operator. Degraded freshness, crawler/source warnings, and routine remediation
events stay visible in dashboards and logs unless they become storage,
data-continuity, data-loss, security, privacy, or sustained public-outage
signals.

Specific monitoring implementation details, collector paths, alert-routing
configuration, credentials, and incident-response procedures are intentionally
excluded from public documentation.
