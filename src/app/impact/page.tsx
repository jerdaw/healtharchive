import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { fetchArchiveStats, fetchUsageMetrics } from "@/lib/api";

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

export default async function ImpactPage() {
  const [statsRes, usageRes] = await Promise.allSettled([
    fetchArchiveStats(),
    fetchUsageMetrics(),
  ]);

  const stats = statsRes.status === "fulfilled" ? statsRes.value : null;
  const usage = usageRes.status === "fulfilled" ? usageRes.value : null;

  const now = new Date();
  const monthLabel = now.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  return (
    <PageShell
      eyebrow="Impact report"
      title={`Monthly impact report - ${monthLabel}`}
      intro="A lightweight monthly summary of coverage, reliability, and usage."
    >
      <section className="ha-home-hero space-y-4">
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
        <h2 className="ha-section-heading">What changed this month</h2>
        <ul className="list-disc pl-5 text-sm text-ha-muted leading-relaxed space-y-1">
          <li>Launched edition-aware change tracking and comparison views.</li>
          <li>Added a public digest page with RSS feeds for change events.</li>
          <li>Exposed snapshot timelines to support capture-to-capture auditing.</li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Reliability notes</h2>
        <p className="text-sm text-ha-muted">
          No public incident log this month. Service availability is tracked via
          the /api/health endpoint and external checks when configured.
        </p>
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
              aggregate counts in the backend to include this section in future
              reports.
            </p>
          </div>
        )}
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Partner highlights</h2>
        <p className="text-sm text-ha-muted">
          No partner updates recorded this month. Outreach and verification are
          tracked as part of Phase 4.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Next focus</h2>
        <p className="text-sm text-ha-muted">
          Phase 3 work will introduce change tracking and compare views to make
          updates over time easier to audit.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">Want more detail?</h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            See the status page for live coverage metrics.
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link
              href="/status"
              className="font-medium text-ha-accent hover:text-blue-700"
            >
              View status & metrics
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
