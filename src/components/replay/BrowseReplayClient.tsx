"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SnapshotFrame } from "@/components/SnapshotFrame";

import type { ReplayEdition } from "./replayUtils";
import {
  buildReplayUrl,
  dateIsoToLabel,
  formatEditionLabel,
  isoToTimestamp14,
  parseJobIdFromCollection,
  stripUrlFragment,
  timestamp14ToDateLabel,
} from "./replayUtils";

type ReplayNavigationMessage = {
  type?: unknown;
  coll?: unknown;
  timestamp?: unknown;
  url?: unknown;
  topUrl?: unknown;
};

type BrowseReplayClientProps = {
  snapshotId: string;
  title: string;
  sourceCode: string | null;
  sourceName: string;
  captureDate: string;
  captureTimestamp: string | null;
  jobId: number | null;
  originalUrl: string;
  browseUrl: string | null;
  rawHtmlUrl: string | null;
  apiLink?: string;
  editions?: ReplayEdition[] | null;
};

export function BrowseReplayClient({
  snapshotId,
  title,
  sourceCode,
  sourceName,
  captureDate,
  captureTimestamp,
  jobId,
  originalUrl,
  browseUrl,
  rawHtmlUrl,
  apiLink,
  editions,
}: BrowseReplayClientProps) {
  const initialViewerUrl = browseUrl ?? rawHtmlUrl ?? null;

  const [iframeSrc, setIframeSrc] = useState<string | null>(initialViewerUrl);
  const [activeJobId, setActiveJobId] = useState<number | null>(jobId);
  const [currentOriginalUrl, setCurrentOriginalUrl] = useState<string>(
    stripUrlFragment(originalUrl) || originalUrl,
  );
  const [currentTimestamp14, setCurrentTimestamp14] = useState<string | null>(
    isoToTimestamp14(captureTimestamp),
  );
  const [currentReplayUrl, setCurrentReplayUrl] = useState<string | null>(
    browseUrl,
  );

  const replayOrigin = useMemo(() => {
    if (!browseUrl) return null;
    try {
      return new URL(browseUrl).origin;
    } catch {
      return null;
    }
  }, [browseUrl]);

  useEffect(() => {
    if (!replayOrigin) return;

    const handler = (event: MessageEvent) => {
      if (event.origin !== replayOrigin) return;

      const data = (event.data ?? null) as ReplayNavigationMessage | null;
      if (!data || typeof data !== "object") return;
      if (data.type !== "haReplayNavigation") return;

      const nextUrl = typeof data.url === "string" ? data.url : null;
      const nextTs = typeof data.timestamp === "string" ? data.timestamp : null;
      const nextColl = typeof data.coll === "string" ? data.coll : null;
      const nextTop = typeof data.topUrl === "string" ? data.topUrl : null;

      if (nextUrl) setCurrentOriginalUrl(stripUrlFragment(nextUrl));
      if (nextTs && /^\d{14}$/.test(nextTs)) setCurrentTimestamp14(nextTs);
      if (nextTop) setCurrentReplayUrl(nextTop);

      const parsedJobId = parseJobIdFromCollection(nextColl);
      if (parsedJobId != null) setActiveJobId(parsedJobId);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [replayOrigin]);

  const editionOptions = editions ?? [];
  const showEditionSelect =
    Boolean(browseUrl && replayOrigin) &&
    activeJobId != null &&
    editionOptions.length > 1;

  const displayedCapture =
    timestamp14ToDateLabel(currentTimestamp14) ?? dateIsoToLabel(captureDate);

  function handleEditionChange(nextJobId: number) {
    if (!replayOrigin) return;
    if (!Number.isFinite(nextJobId)) return;
    if (!currentOriginalUrl) return;

    const nextSrc = buildReplayUrl(
      replayOrigin,
      nextJobId,
      currentTimestamp14,
      currentOriginalUrl,
    );
    setIframeSrc(nextSrc);
    setActiveJobId(nextJobId);
    setCurrentReplayUrl(nextSrc);
  }

  const browseLink = browseUrl ? currentReplayUrl ?? browseUrl : undefined;
  const rawLink = rawHtmlUrl ?? undefined;

  return (
    <div className="ha-container">
      <section className="space-y-4 pb-10 pt-6">
        <header className="ha-card ha-home-panel space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-ha-muted">
                Browsing archived site
              </p>
              <h1 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
                {sourceName}
              </h1>
              <p className="mt-1 text-xs text-ha-muted">
                Capture: {displayedCapture}
                {activeJobId != null && (
                  <>
                    {" "}
                    · backup <span className="font-medium">job-{activeJobId}</span>
                  </>
                )}
              </p>

              {showEditionSelect && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="ha-edition-select"
                    className="text-[11px] font-medium text-slate-800"
                  >
                    Switch backup
                  </label>
                  <select
                    id="ha-edition-select"
                    className="ha-select ha-select-sm"
                    value={activeJobId ?? undefined}
                    onChange={(e) => handleEditionChange(Number(e.target.value))}
                  >
                    {editionOptions.map((edition) => (
                      <option key={edition.jobId} value={edition.jobId}>
                        {formatEditionLabel(edition)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="mt-2 break-all text-[11px] text-ha-muted">
                <span className="font-medium text-slate-800">Original URL:</span>{" "}
                {currentOriginalUrl}
              </p>

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
              <Link
                href={`/snapshot/${snapshotId}`}
                className="ha-btn-secondary text-xs"
              >
                Snapshot details
              </Link>
              {browseLink && (
                <a
                  href={browseLink}
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
          {iframeSrc ? (
            <SnapshotFrame
              key={iframeSrc}
              src={iframeSrc}
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
