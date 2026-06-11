# Decision: Solo-Operator Alert Paging Policy (2026-06-11)

Status: accepted

## Context

- HealthArchive is operated as a solo-dev project, so notification volume must
  be kept low enough that Pushover remains meaningful.
- Recent backend availability and search-error alerts produced repeated
  notifications for transient or dashboard-level conditions.
- The previous severity-aware routing decision reduced warning noise, but still
  allowed any critical alert to page and send resolved notifications.
- Monitoring should still retain diagnostic history for incidents, trend
  review, and roadmap work without interrupting the operator for every signal.

## Decision

- Pushover is reserved for alerts that explicitly opt in with
  `notify="pushover"`.
- Warning-level alerts are dashboard/history signals by default and must not
  page.
- Public availability paging is owned by the external uptime monitor after a
  sustained outage window. Internal backend scrape-down alerts remain visible
  in monitoring history without sending duplicate Pushover pages.
- Alertmanager-generated Pushover notifications do not send resolved events.

## Rationale

An alert should mean that human attention is needed. Severity alone is too
coarse for a solo-operator workflow because a technically critical state can be
self-recovering, derivative, or too brief to justify interruption. Explicit
notification intent keeps monitoring useful while preserving operator attention
for sustained, actionable problems.

## Alternatives considered

- Keep severity-based routing and tune individual thresholds:
  - Rejected because new critical alerts could still page by default.
- Disable most Prometheus alerts:
  - Rejected because dashboard/history signals are still useful for diagnosis
    and roadmap prioritization.
- Use both external uptime monitoring and internal scrape-down alerts as
  pagers:
  - Rejected because duplicate pages for the same public outage do not meet the
    solo-operator actionability requirement.

## Consequences

### Positive

- Lower Pushover volume.
- Fewer firing/resolved notification pairs for transient incidents.
- Alert rules must opt in to paging explicitly, making future changes safer.

### Negative / risks

- Some short outages and internal scrape flaps no longer interrupt the
  operator.
- Warning-level trends require periodic dashboard review or a future digest.
- External uptime-monitor notification delay depends on the external service
  plan.

## Verification / rollout

- Tests assert that Pushover routing is label-driven and that warnings do not
  page.
- Alertmanager is applied only after the current WARC validation/maintenance
  work is safe to pause or complete.
- External uptime monitor notifications are configured for a 60-minute delay
  where supported; otherwise direct push notifications are disabled and the
  monitor remains a history/status signal.
- `HealthArchiveBackendScrapeDown` remains dashboard-only so it does not
  duplicate the external public-availability page.

## References

- Supersedes: `2026-02-19-alert-fatigue-reduction-for-crawl-alerting.md`
- Related docs: `../operations/monitoring-and-alerting.md`
- Alert rules: `../../ops/observability/alerting/healtharchive-alerts.yml`
- Alerting installer: `../../scripts/vps-install-observability-alerting.sh`
- Uptime Robot postponed notification documentation:
  https://help.uptimerobot.com/en/articles/11361289-recurring-postponed-notifications-in-uptimerobot
