import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { getSourcesSummary } from "@/data/demo-records";
import { fetchSources, type SourceSummary as ApiSourceSummary } from "@/lib/api";

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "Unknown";
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (year && month && day) {
      const d = new Date(year, month - 1, day);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
  }
  const parsed = new Date(iso);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return iso;
}

type SourceSummaryLike = {
  sourceCode: string;
  sourceName: string;
  recordCount: number;
  firstCapture: string;
  lastCapture: string;
  topics: string[];
  latestRecordId: number | string | null;
};

export default async function BrowseBySourcePage() {
  let summaries: SourceSummaryLike[] = getSourcesSummary();
  let usingBackend = false;

  // Try backend /api/sources first; fall back to the demo summary on error.
  try {
    const apiSummaries = await fetchSources();
    summaries = apiSummaries.map((s: ApiSourceSummary) => ({
      sourceCode: s.sourceCode,
      sourceName: s.sourceName,
      recordCount: s.recordCount,
      firstCapture: s.firstCapture,
      lastCapture: s.lastCapture,
      topics: s.topics.map((t) => t.label),
      latestRecordId: s.latestRecordId,
    }));
    usingBackend = true;
  } catch {
    // Keep demo summaries if backend is unavailable.
    usingBackend = false;
  }

  return (
    <PageShell
      eyebrow={usingBackend ? "Archive explorer" : "Archive explorer (demo)"}
      title="Browse records by source"
      intro={
        usingBackend
          ? "This view summarizes which snapshots are available for each source."
          : "This view summarizes which snapshots are available for each source. In a fuller archive, this would expand to a broader set of agencies and jurisdictions."
      }
    >
      {!usingBackend && (
        <div className="ha-callout mb-6">
          <h3 className="ha-callout-title">Backend unavailable</h3>
          <p className="text-xs leading-relaxed sm:text-sm">
            Showing demo data while the live API is unavailable.
          </p>
        </div>
      )}
      <div className="ha-grid-2">
        {summaries.map((source) => (
          <article
            key={source.sourceCode}
            className="ha-card ha-card-elevated p-4 sm:p-5"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              {source.sourceName}
            </h2>
            <p className="mt-1 text-xs text-ha-muted">
              {source.recordCount} {usingBackend ? "snapshot" : "demo snapshot"}
              {source.recordCount === 1 ? "" : "s"} captured between{" "}
              {formatDate(source.firstCapture)} and {formatDate(source.lastCapture)}.
            </p>

            {source.topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {source.topics.slice(0, 6).map((topic) => (
                  <span key={topic} className="ha-badge">
                    {topic}
                  </span>
                ))}
                {source.topics.length > 6 && (
                  <span className="ha-badge ha-badge-amber">
                    +{source.topics.length - 6} more
                  </span>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/archive?source=${source.sourceCode}`}
                className="ha-btn-secondary text-xs"
              >
                Browse records
              </Link>
              {source.latestRecordId && (
                <Link
                  href={`/snapshot/${source.latestRecordId}`}
                  className="text-xs font-medium text-ha-accent hover:text-blue-700"
                >
                  View latest snapshot →
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
