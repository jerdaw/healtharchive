import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { fetchChanges, fetchSourceEditions, fetchSources } from "@/lib/api";
import { siteCopy } from "@/lib/siteCopy";

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return value;
}

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedSource = typeof params.source === "string" ? params.source : "";
  const requestedJob = typeof params.job === "string" ? params.job : "";
  const requestedPage = typeof params.page === "string" ? params.page : "";

  const page = Number.parseInt(requestedPage, 10);
  const currentPage = Number.isNaN(page) || page < 1 ? 1 : page;

  const sourcesRes = await Promise.allSettled([fetchSources()]);
  const sources =
    sourcesRes[0].status === "fulfilled" ? sourcesRes[0].value : null;

  const selectedSource =
    requestedSource ||
    (sources && sources.length > 0 ? sources[0].sourceCode : "");

  let editions = null;
  if (selectedSource) {
    try {
      editions = await fetchSourceEditions(selectedSource);
    } catch {
      editions = null;
    }
  }

  const selectedEdition =
    editions?.find((edition) => String(edition.jobId) === requestedJob) ??
    editions?.[0] ??
    null;

  let changes = null;
  if (selectedSource && selectedEdition?.jobId) {
    try {
      changes = await fetchChanges({
        source: selectedSource,
        jobId: selectedEdition.jobId,
        page: currentPage,
        pageSize: 20,
      });
    } catch {
      changes = null;
    }
  }

  const hasResults = Boolean(changes?.results?.length);
  const total = changes?.total ?? 0;
  const pageSize = changes?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageShell
      eyebrow="Changes"
      title="Change tracking"
      intro="Track text changes between archived captures. These changes reflect differences between snapshots, not current guidance."
    >
      <section className="ha-home-hero space-y-4">
        <div className="ha-callout">
          <h2 className="ha-callout-title">Descriptive changes only</h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            Comparisons highlight text differences between archived captures.
            {` `}They do not interpret meaning or provide medical guidance.
            {` `}{siteCopy.whatThisSiteIs.forCurrent}
          </p>
        </div>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Scope</h2>
        <form className="ha-card space-y-4" action="/changes">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-xs font-medium text-ha-muted">
              Source
              <select
                name="source"
                defaultValue={selectedSource}
                className="ha-select w-full"
              >
                {(sources ?? []).map((source) => (
                  <option key={source.sourceCode} value={source.sourceCode}>
                    {source.sourceName}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs font-medium text-ha-muted">
              Edition (latest by default)
              <select
                name="job"
                defaultValue={selectedEdition ? String(selectedEdition.jobId) : ""}
                className="ha-select w-full"
                disabled={!selectedEdition}
              >
                {(editions ?? []).map((edition) => (
                  <option key={edition.jobId} value={String(edition.jobId)}>
                    {edition.jobName} (last capture {formatDate(edition.lastCapture)})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="ha-btn-primary text-xs">
              Update view
            </button>
            <Link href="/digest" className="ha-btn-secondary text-xs">
              View digest & RSS
            </Link>
          </div>
          <p className="text-xs text-ha-muted">
            The default view is edition-aware and reflects changes between
            archived captures, not real-time source updates.
          </p>
        </form>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Changes feed</h2>
        {!changes && (
          <div className="ha-callout">
            <h3 className="ha-callout-title">Changes unavailable</h3>
            <p className="mt-2 text-xs leading-relaxed sm:text-sm">
              The changes feed could not be loaded. Ensure the backend is
              reachable and change tracking is enabled.
            </p>
          </div>
        )}

        {changes && !changes.enabled && (
          <div className="ha-callout">
            <p className="text-xs leading-relaxed sm:text-sm">
              Change tracking is currently disabled on the backend.
            </p>
          </div>
        )}

        {changes && changes.enabled && !hasResults && (
          <div className="ha-callout">
            <p className="text-xs leading-relaxed sm:text-sm">
              No changes found for this edition yet. This is expected during
              early captures or when content did not change between editions.
            </p>
          </div>
        )}

        {changes && changes.enabled && hasResults && (
          <div className="space-y-3">
            {changes.results.map((event) => {
              const compareHref =
                event.fromSnapshotId && event.diffAvailable
                  ? `/compare?from=${event.fromSnapshotId}&to=${event.toSnapshotId}`
                  : null;
              const snapshotHref = `/snapshot/${event.toSnapshotId}`;
              return (
                <div key={event.changeId} className="ha-card space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ha-muted">
                    <span className="ha-tag">{event.changeType}</span>
                    {event.highNoise ? (
                      <span className="ha-tag">High noise</span>
                    ) : null}
                    <span>
                      Captured {formatDate(event.toCaptureTimestamp)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {event.sourceName ?? "Archived source"}
                    </h3>
                    <p className="text-xs text-ha-muted">
                      {event.summary ?? "Archived text updated."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {compareHref ? (
                      <Link href={compareHref} className="ha-btn-secondary text-xs">
                        Compare captures
                      </Link>
                    ) : null}
                    <Link href={snapshotHref} className="ha-btn-secondary text-xs">
                      View snapshot
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {changes && changes.enabled && totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-ha-muted">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  className="ha-btn-secondary text-xs"
                  href={`/changes?source=${encodeURIComponent(
                    selectedSource,
                  )}&job=${selectedEdition?.jobId ?? ""}&page=${currentPage - 1}`}
                >
                  Previous
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  className="ha-btn-secondary text-xs"
                  href={`/changes?source=${encodeURIComponent(
                    selectedSource,
                  )}&job=${selectedEdition?.jobId ?? ""}&page=${currentPage + 1}`}
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
