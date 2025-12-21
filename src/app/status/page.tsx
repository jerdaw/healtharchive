import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import {
  fetchArchiveStats,
  fetchHealth,
  fetchSources,
  fetchUsageMetrics,
} from "@/lib/api";
import { siteCopy } from "@/lib/siteCopy";

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat().format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function StatusPage() {
  const [healthRes, statsRes, sourcesRes, usageRes] = await Promise.allSettled([
    fetchHealth(),
    fetchArchiveStats(),
    fetchSources(),
    fetchUsageMetrics(),
  ]);

  const health = healthRes.status === "fulfilled" ? healthRes.value : null;
  const stats = statsRes.status === "fulfilled" ? statsRes.value : null;
  const sources = sourcesRes.status === "fulfilled" ? sourcesRes.value : null;
  const usage = usageRes.status === "fulfilled" ? usageRes.value : null;

  const hasAnyData = Boolean(health || stats || sources || usage);
  const statusLabel = !hasAnyData
    ? "Unavailable"
    : health?.status === "ok"
      ? "Operational"
      : "Degraded";

  const lastChecked = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <PageShell
      eyebrow="Status"
      title="Status & metrics"
      intro="A transparent view of HealthArchive.ca coverage, freshness, and service status."
    >
      {!hasAnyData && (
        <div className="ha-callout">
          <h2 className="ha-callout-title">Live metrics unavailable</h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            The backend API could not be reached. This page will display live
            metrics when the API is available.
          </p>
        </div>
      )}

      <section className="ha-home-hero space-y-4">
        <h2 className="ha-section-heading">Current status</h2>
        <div className="ha-card space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="ha-tag">{statusLabel}</span>
            <span className="text-xs text-ha-muted">Last checked: {lastChecked}</span>
          </div>
          <p className="text-sm text-ha-muted">
            {siteCopy.whatThisSiteIs.is} {siteCopy.whatThisSiteIs.isNot}
          </p>
        </div>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Coverage snapshot</h2>
        <div className="ha-grid-3">
          <div className="ha-card space-y-1">
            <p className="text-xs text-ha-muted">Sources tracked</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(stats?.sourcesTotal ?? null)}
            </p>
          </div>
          <div className="ha-card space-y-1">
            <p className="text-xs text-ha-muted">Snapshots</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(stats?.snapshotsTotal ?? null)}
            </p>
          </div>
          <div className="ha-card space-y-1">
            <p className="text-xs text-ha-muted">Unique pages</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(stats?.pagesTotal ?? null)}
            </p>
          </div>
        </div>
        <p className="text-sm text-ha-muted">
          Latest capture date: {formatDate(stats?.latestCaptureDate ?? null)}.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Per-source coverage</h2>
        <p className="text-sm text-ha-muted">
          First/last capture dates are UTC and reflect archival capture times, not
          necessarily the last time a source updated its content.
        </p>
        {sources && sources.length > 0 ? (
          <div className="ha-grid-2">
            {sources.map((source) => (
              <div key={source.sourceCode} className="ha-card space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {source.sourceName}
                  </h3>
                  <span className="ha-tag">
                    {formatNumber(source.recordCount)} snapshots
                  </span>
                </div>
                <p className="text-xs text-ha-muted">
                  First capture: {formatDate(source.firstCapture)}
                </p>
                <p className="text-xs text-ha-muted">
                  Last capture: {formatDate(source.lastCapture)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {source.entryRecordId != null ? (
                    <Link
                      href={`/browse/${source.entryRecordId}`}
                      className="ha-btn-secondary text-xs"
                    >
                      Browse archived site
                    </Link>
                  ) : null}
                  <Link
                    href={`/archive?source=${encodeURIComponent(source.sourceCode)}`}
                    className="ha-btn-secondary text-xs"
                  >
                    Browse records
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ha-callout">
            <p className="text-xs leading-relaxed sm:text-sm">
              Per-source coverage is unavailable while the API is down.
            </p>
          </div>
        )}
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Usage snapshot</h2>
        {usage?.enabled ? (
          <div className="ha-grid-2">
            <div className="ha-card space-y-1">
              <p className="text-xs text-ha-muted">Search requests (last {usage.windowDays} days)</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatNumber(usage.totals.searchRequests)}
              </p>
            </div>
            <div className="ha-card space-y-1">
              <p className="text-xs text-ha-muted">Snapshot detail views</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatNumber(usage.totals.snapshotDetailViews)}
              </p>
            </div>
            <div className="ha-card space-y-1">
              <p className="text-xs text-ha-muted">Raw snapshot views</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatNumber(usage.totals.rawSnapshotViews)}
              </p>
            </div>
            <div className="ha-card space-y-1">
              <p className="text-xs text-ha-muted">Reports submitted</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatNumber(usage.totals.reportSubmissions)}
              </p>
            </div>
          </div>
        ) : (
          <div className="ha-callout">
            <p className="text-xs leading-relaxed sm:text-sm">
              Usage metrics are currently unavailable or disabled. Enable
              aggregated usage counts in the backend to display this section.
            </p>
          </div>
        )}
        <p className="text-xs text-ha-muted">
          Usage metrics are aggregated daily counts with no personal identifiers.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Metrics definitions</h2>
        <ul className="list-disc pl-5 text-sm text-ha-muted leading-relaxed space-y-1">
          <li>
            Snapshots are individual captured pages with a timestamped record.
          </li>
          <li>
            Pages are URL groups that may have multiple snapshots over time.
          </li>
          <li>
            Last capture date is a proxy for freshness and reflects archive
            capture time (UTC), not source update time.
          </li>
          <li>
            Annual editions are captured on Jan 01 (UTC). Ad-hoc captures are
            labeled when they occur.
          </li>
          <li>
            Usage counts are aggregated daily totals (search requests, snapshot
            views, report submissions).
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">Monthly impact report</h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            A short monthly report summarizes coverage, reliability, and usage
            trends.
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link
              href="/impact"
              className="font-medium text-ha-accent hover:text-blue-700"
            >
              View the latest impact report
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
