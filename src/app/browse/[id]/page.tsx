import Link from "next/link";
import { notFound } from "next/navigation";

import { getRecordById } from "@/data/demo-records";
import { fetchSnapshotDetail, getApiBaseUrl } from "@/lib/api";
import { SnapshotFrame } from "@/components/SnapshotFrame";

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "Unknown";

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

export default async function BrowseSnapshotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let snapshotMeta: Awaited<ReturnType<typeof fetchSnapshotDetail>> | null =
    null;
  let usingBackend = false;

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

  const title = snapshotMeta?.title ?? record?.title ?? "Archived page";
  const sourceCode = snapshotMeta?.sourceCode ?? record?.sourceCode ?? null;
  const sourceName =
    snapshotMeta?.sourceName ?? record?.sourceName ?? "Unknown source";
  const captureDate =
    snapshotMeta?.captureDate ?? record?.captureDate ?? "Unknown";
  const captureTimestamp = snapshotMeta?.captureTimestamp ?? null;
  const jobId = snapshotMeta?.jobId ?? null;
  const originalUrl =
    snapshotMeta?.originalUrl ?? record?.originalUrl ?? "Unknown URL";

  const apiBaseUrl = getApiBaseUrl();
  const rawHtmlUrl =
    snapshotMeta?.rawSnapshotUrl != null
      ? `${apiBaseUrl}${snapshotMeta.rawSnapshotUrl}`
      : record?.snapshotPath ?? null;
  const browseUrl = snapshotMeta?.browseUrl ?? null;
  const viewerUrl = browseUrl ?? rawHtmlUrl ?? null;

  const browseLink = browseUrl ?? undefined;
  const rawLink = rawHtmlUrl ?? undefined;
  const apiLink =
    usingBackend && snapshotMeta?.id != null
      ? `${apiBaseUrl}/api/snapshot/${snapshotMeta.id}`
      : undefined;

  return (
    <div className="ha-container">
      <section className="pt-6 pb-10 space-y-4">
        <header className="ha-card ha-home-panel p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-ha-muted">
                Browsing archived site
              </p>
              <h1 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
                {sourceName}
              </h1>
              <p className="mt-1 text-xs text-ha-muted">
                Capture: {formatDate(captureDate)}
                {jobId != null && (
                  <>
                    {" "}
                    · backup <span className="font-medium">job-{jobId}</span>
                  </>
                )}
              </p>
              <p className="mt-2 break-all text-[11px] text-ha-muted">
                <span className="font-medium text-slate-800">Original URL:</span>{" "}
                {originalUrl}
              </p>
              {captureTimestamp && (
                <p className="mt-1 text-[11px] text-ha-muted">
                  <span className="font-medium text-slate-800">
                    Replay lock:
                  </span>{" "}
                  {captureTimestamp}
                </p>
              )}
              {!browseUrl && (
                <p className="mt-2 text-[11px] font-medium text-amber-800">
                  Replay browsing is not available for this record; showing raw
                  HTML instead.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
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
              <Link href={`/snapshot/${id}`} className="ha-btn-secondary text-xs">
                Snapshot details
              </Link>
              {browseUrl && (
                <a
                  href={browseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ha-btn-primary text-xs"
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
              {apiLink && (
                <a
                  href={apiLink}
                  target="_blank"
                  rel="noreferrer"
                  className="ha-btn-secondary text-xs"
                >
                  Metadata JSON ↗
                </a>
              )}
            </div>
          </div>
        </header>

        <div className="ha-card ha-card-elevated overflow-hidden">
          {viewerUrl ? (
            <SnapshotFrame
              src={viewerUrl}
              title={title}
              browseLink={browseLink}
              rawLink={rawLink}
              apiLink={apiLink}
              iframeClassName="h-[70vh] w-full border-0 sm:h-[75vh]"
            />
          ) : (
            <div className="flex h-[320px] items-center justify-center px-4 text-center text-sm text-ha-muted">
              Archived HTML content for this snapshot is not currently available.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
