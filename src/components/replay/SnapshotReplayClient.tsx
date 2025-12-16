"use client";

import { useEffect, useMemo, useState } from "react";

import { SnapshotFrame } from "@/components/SnapshotFrame";

import type { ReplayEdition } from "./replayUtils";
import {
  buildReplayUrl,
  formatEditionLabel,
  isoToTimestamp14,
  parseJobIdFromCollection,
  stripUrlFragment,
} from "./replayUtils";

type ReplayNavigationMessage = {
  type?: unknown;
  coll?: unknown;
  timestamp?: unknown;
  url?: unknown;
  topUrl?: unknown;
};

type SnapshotReplayClientProps = {
  title: string;
  initialSrc: string;
  browseUrl: string | null;
  rawHtmlUrl: string | null;
  apiLink?: string;
  editions?: ReplayEdition[] | null;
  initialJobId: number | null;
  initialCaptureTimestamp: string | null;
  initialOriginalUrl: string;
  iframeClassName?: string;
};

export function SnapshotReplayClient({
  title,
  initialSrc,
  browseUrl,
  rawHtmlUrl,
  apiLink,
  editions,
  initialJobId,
  initialCaptureTimestamp,
  initialOriginalUrl,
  iframeClassName,
}: SnapshotReplayClientProps) {
  const [iframeSrc, setIframeSrc] = useState<string>(initialSrc);
  const [activeJobId, setActiveJobId] = useState<number | null>(initialJobId);
  const [currentOriginalUrl, setCurrentOriginalUrl] = useState<string>(
    stripUrlFragment(initialOriginalUrl) || initialOriginalUrl,
  );
  const [currentTimestamp14, setCurrentTimestamp14] = useState<string | null>(
    isoToTimestamp14(initialCaptureTimestamp),
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
    <div className="flex h-full w-full flex-col">
      {showEditionSelect && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ha-border px-4 py-3 text-xs text-ha-muted sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="ha-snapshot-edition-select"
              className="text-[11px] font-medium text-slate-800"
            >
              Backup
            </label>
            <select
              id="ha-snapshot-edition-select"
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

          {browseLink && (
            <a
              href={browseLink}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-medium text-ha-accent hover:text-blue-700"
            >
              Open current page ↗
            </a>
          )}
        </div>
      )}

      <div className="flex-1">
        <SnapshotFrame
          key={iframeSrc}
          src={iframeSrc}
          title={title}
          browseLink={browseLink}
          rawLink={rawLink}
          apiLink={apiLink}
          iframeClassName={iframeClassName}
        />
      </div>
    </div>
  );
}
