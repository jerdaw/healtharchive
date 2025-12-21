import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getRecordById } from "@/data/demo-records";
import {
  fetchSnapshotDetail,
  fetchSnapshotTimeline,
  fetchSourceEditions,
  getApiBaseUrl,
} from "@/lib/api";
import { siteCopy } from "@/lib/siteCopy";
import { SnapshotReplayClient } from "@/components/replay/SnapshotReplayClient";

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

export default async function SnapshotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let snapshotMeta: Awaited<ReturnType<typeof fetchSnapshotDetail>> | null =
    null;
  let usingBackend = false;

  // Attempt to fetch real snapshot metadata from the backend. If that fails
  // (e.g., backend not running or this ID not present), fall back to the demo
  // record lookup.
  try {
    const numericId = Number(id);
    if (!Number.isNaN(numericId)) {
      snapshotMeta = await fetchSnapshotDetail(numericId);
      usingBackend = true;
    }
  } catch {
    snapshotMeta = null;
    usingBackend = false;
  }

  const record = getRecordById(id);

  if (!snapshotMeta && !record) {
    return notFound();
  }

  const title = snapshotMeta?.title ?? record?.title ?? "Snapshot";
  const captureDate =
    snapshotMeta?.captureDate ?? record?.captureDate ?? "Unknown";
  const sourceCode = snapshotMeta?.sourceCode ?? record?.sourceCode ?? null;
  const sourceName =
    snapshotMeta?.sourceName ?? record?.sourceName ?? "Unknown source";
  const language = snapshotMeta?.language ?? record?.language ?? "Unknown";
  const originalUrl =
    snapshotMeta?.originalUrl ?? record?.originalUrl ?? "Unknown URL";
  const captureTimestamp = snapshotMeta?.captureTimestamp ?? null;
  const jobId = snapshotMeta?.jobId ?? null;
  // Backend-backed snapshots may include:
  // - browseUrl: an absolute URL to the replay service (preferred for browsing)
  // - rawSnapshotUrl: a backend-relative HTML endpoint for debugging/fallback
  //
  // For backend-backed snapshots, rawSnapshotUrl is a path (e.g.
  // "/api/snapshots/raw/{id}") relative to the backend host. Prefix it with
  // the configured API base URL so the iframe/link always point at the backend
  // origin, not the frontend origin. For demo records, fall back to the local
  // static snapshot path under /public.
  const apiBaseUrl = getApiBaseUrl();
  const rawHtmlUrl =
    snapshotMeta?.rawSnapshotUrl != null
      ? `${apiBaseUrl}${snapshotMeta.rawSnapshotUrl}`
      : record?.snapshotPath ?? null;
  const browseUrl = snapshotMeta?.browseUrl ?? null;
  const viewerUrl = browseUrl ?? rawHtmlUrl ?? null;
  const apiLink =
    usingBackend && snapshotMeta?.id != null
      ? `${apiBaseUrl}/api/snapshot/${snapshotMeta.id}`
      : undefined;
  const reportParams = new URLSearchParams();
  if (!Number.isNaN(Number(id))) {
    reportParams.set("snapshot", id);
  }
  if (originalUrl && originalUrl !== "Unknown URL") {
    reportParams.set("url", originalUrl);
  }
  reportParams.set("page", `/snapshot/${id}`);
  const reportHref = `/report?${reportParams.toString()}`;

  let sourceEditions: Awaited<ReturnType<typeof fetchSourceEditions>> | null =
    null;
  if (usingBackend && snapshotMeta?.sourceCode) {
    try {
      sourceEditions = await fetchSourceEditions(snapshotMeta.sourceCode);
    } catch {
      sourceEditions = null;
    }
  }

  let timeline: Awaited<ReturnType<typeof fetchSnapshotTimeline>> | null = null;
  if (usingBackend && snapshotMeta?.id) {
    try {
      timeline = await fetchSnapshotTimeline(snapshotMeta.id);
    } catch {
      timeline = null;
    }
  }

  return (
    <PageShell
      eyebrow="Archived snapshot"
      title={title}
      intro="View a captured snapshot and its associated metadata. Archived content may be incomplete, outdated, or superseded."
    >
      <section className="ha-grid-2">
        {/* Metadata card */}
        <div className="space-y-4">
          <div className="ha-card p-4 sm:p-5">
            <p className="text-xs font-medium text-ha-muted">
              Archived snapshot from {formatDate(captureDate)}.
            </p>
            {!usingBackend && record && (
              <p className="mt-1 text-xs text-ha-muted">
                This snapshot is from a limited offline sample bundled with the
                site.
              </p>
            )}
            <dl className="mt-3 space-y-1 text-xs text-slate-800 sm:text-sm">
              <div className="flex gap-2">
                <dt className="w-28 text-ha-muted">Source</dt>
                <dd>{sourceName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-ha-muted">Capture date</dt>
                <dd>{formatDate(captureDate)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-ha-muted">Language</dt>
                <dd>{language}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-ha-muted">Original URL</dt>
                <dd className="break-all">{originalUrl}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/archive" className="ha-btn-secondary text-xs">
                ← Back to archive
              </Link>
              {sourceCode && (
                <Link
                  href={`/archive?source=${encodeURIComponent(sourceCode)}`}
                  className="ha-btn-secondary text-xs"
                >
                  Search this source
                </Link>
              )}
              {viewerUrl && (
                <Link href={`/browse/${id}`} className="ha-btn-primary text-xs">
                  Browse full screen
                </Link>
              )}
              {browseUrl && (
                <a
                  href={browseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ha-btn-secondary text-xs"
                >
                  Open in replay ↗
                </a>
              )}
              {rawHtmlUrl && (
                <a
                  href={rawHtmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ha-btn-secondary text-xs"
                >
                  Raw HTML ↗
                </a>
              )}
            </div>
          </div>

          <div className="ha-callout">
            <h3 className="ha-callout-title">Important note</h3>
            <p className="text-xs leading-relaxed sm:text-sm">
              Archived content reflects what public websites displayed at the
              time of capture. {siteCopy.whatThisSiteIs.limitations} This is
              not medical advice and should not be treated as current guidance
              or official policy. {siteCopy.whatThisSiteIs.forCurrent}.
            </p>
            <p className="mt-3 text-xs leading-relaxed sm:text-sm">
              <Link
                href={reportHref}
                className="font-medium text-ha-accent hover:text-blue-700"
              >
                Report an issue with this snapshot
              </Link>
              .
            </p>
          </div>

          {timeline?.snapshots && timeline.snapshots.length > 1 && (
            <div className="ha-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Other captures of this page
              </h3>
              <p className="mt-1 text-xs text-ha-muted">
                Compare captures to see descriptive text changes between editions.
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-800 sm:text-sm">
                {timeline.snapshots.map((item) => {
                  const isCurrent = Number(id) === item.snapshotId;
                  const compareHref =
                    item.compareFromSnapshotId != null
                      ? `/compare?from=${item.compareFromSnapshotId}&to=${item.snapshotId}`
                      : null;
                  return (
                    <li
                      key={item.snapshotId}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-ha-border pb-2 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {formatDate(item.captureDate)}
                        </p>
                        <p className="text-xs text-ha-muted">
                          {item.jobName ? item.jobName : "Edition capture"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isCurrent ? (
                          <span className="ha-tag">This capture</span>
                        ) : (
                          <Link
                            href={`/snapshot/${item.snapshotId}`}
                            className="ha-btn-secondary text-xs"
                          >
                            View snapshot
                          </Link>
                        )}
                        {compareHref ? (
                          <Link
                            href={compareHref}
                            className="ha-btn-secondary text-xs"
                          >
                            Compare
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Embedded snapshot */}
        <div className="ha-card ha-card-elevated flex min-h-[320px] flex-col">
          <div className="border-b border-ha-border px-4 py-3 text-xs text-ha-muted sm:px-5">
            <span className="font-medium text-slate-900">Archived content</span>{" "}
            {viewerUrl ? (
              <>
                {" "}
                · served from{" "}
                <code>
                  {viewerUrl}
                </code>{" "}
                {browseUrl
                  ? "via the replay service."
                  : usingBackend
                    ? "from the live API."
                    : "from the offline sample."}
              </>
            ) : (
              <>
                {" "}
                ·{" "}
                {usingBackend && snapshotMeta
                  ? "archived HTML for this snapshot is not currently available; metadata remains accessible below."
                  : "viewer integration for this snapshot is not yet available."}
              </>
            )}
            <span className="sr-only">
              {" "}
              The following section is an embedded snapshot of the archived page.
            </span>
          </div>
          <div className="flex-1">
            {viewerUrl ? (
              <SnapshotReplayClient
                title={title}
                initialSrc={viewerUrl}
                browseUrl={browseUrl}
                rawHtmlUrl={rawHtmlUrl}
                apiLink={apiLink}
                editions={sourceEditions}
                initialJobId={jobId}
                initialCaptureTimestamp={captureTimestamp}
                initialOriginalUrl={originalUrl}
              />
            ) : (
              <div className="flex h-[320px] items-center justify-center px-4 text-center text-xs text-ha-muted sm:h-[560px] sm:text-sm">
                {usingBackend && snapshotMeta ? (
                  <>
                    Archived HTML content for this snapshot is not currently
                    available.{" "}
                    {apiLink && (
                      <>
                        You can still{" "}
                        <a
                          href={apiLink}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-ha-accent hover:text-blue-700"
                        >
                          view metadata JSON
                        </a>
                        .
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Archived HTML content for this snapshot is not currently
                    available in the embedded viewer.
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
