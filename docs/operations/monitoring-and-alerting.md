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
  delivery.

Transient availability flaps, short-lived search errors, internal scrape
failures, and resolved events should remain in monitoring history without
becoming push notifications. External uptime monitoring owns public
availability paging when it is configured with a sustained-delay threshold.

Specific monitoring implementation details, collector paths, alert-routing
configuration, credentials, and incident-response procedures are intentionally
excluded from public documentation.
