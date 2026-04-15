"use client";

import { useEffect, useMemo, useState } from "react";

import { SnapshotFrame } from "@/components/SnapshotFrame";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { resolveReplayUrl } from "@/lib/api";

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
  initialOriginalUrl: string | null;
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
  const locale = useLocale();
  const [iframeSrc, setIframeSrc] = useState<string>(initialSrc);
  const [activeJobId, setActiveJobId] = useState<number | null>(initialJobId);
  const [currentOriginalUrl, setCurrentOriginalUrl] = useState<string>(
    initialOriginalUrl ? stripUrlFragment(initialOriginalUrl) || initialOriginalUrl : "",
  );
  const [currentTimestamp14, setCurrentTimestamp14] = useState<string | null>(
    isoToTimestamp14(initialCaptureTimestamp),
  );
  const [currentReplayUrl, setCurrentReplayUrl] = useState<string | null>(browseUrl);
  const [editionNotice, setEditionNotice] = useState<string | null>(null);
  const [isResolvingEdition, setIsResolvingEdition] = useState(false);

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
    Boolean(browseUrl && replayOrigin) && activeJobId != null && editionOptions.length > 1;

  async function handleEditionChange(nextJobId: number) {
    if (!replayOrigin) return;
    if (!Number.isFinite(nextJobId)) return;
    if (!currentOriginalUrl) return;
    if (nextJobId === activeJobId) return;

    setIsResolvingEdition(true);
    setEditionNotice(null);

    try {
      const resolved = await resolveReplayUrl({
        jobId: nextJobId,
        url: currentOriginalUrl,
        timestamp14: currentTimestamp14,
      });

      if (resolved.found && resolved.browseUrl) {
        setIframeSrc(resolved.browseUrl);
        setActiveJobId(nextJobId);
        setCurrentReplayUrl(resolved.browseUrl);

        if (resolved.resolvedUrl) {
          setCurrentOriginalUrl(stripUrlFragment(resolved.resolvedUrl));
        }
        if (resolved.captureTimestamp) {
          const nextTs = isoToTimestamp14(resolved.captureTimestamp);
          if (nextTs) setCurrentTimestamp14(nextTs);
        }

        return;
      }

      const edition = editionOptions.find((opt) => opt.jobId === nextJobId);
      if (edition?.entryBrowseUrl) {
        setIframeSrc(edition.entryBrowseUrl);
        setActiveJobId(nextJobId);
        setCurrentReplayUrl(edition.entryBrowseUrl);
        setEditionNotice(
          locale === "fr"
            ? "Cette page n’a pas été capturée dans l’édition sélectionnée; affichage de la page d’entrée de l’édition à la place."
            : "This page was not captured in the selected edition; showing the edition’s entry page instead.",
        );
        return;
      }

      const timegateUrl = buildReplayUrl(replayOrigin, nextJobId, null, currentOriginalUrl);
      setIframeSrc(timegateUrl);
      setActiveJobId(nextJobId);
      setCurrentReplayUrl(timegateUrl);
      setEditionNotice(
        locale === "fr"
          ? "Aucune capture exacte trouvée pour cette page dans cette édition; affichage de la capture la plus proche disponible."
          : "No exact capture found for this page in that edition; showing the closest available capture.",
      );
    } catch {
      const nextSrc = buildReplayUrl(
        replayOrigin,
        nextJobId,
        currentTimestamp14,
        currentOriginalUrl,
      );
      setIframeSrc(nextSrc);
      setActiveJobId(nextJobId);
      setCurrentReplayUrl(nextSrc);
      setEditionNotice(
        locale === "fr"
          ? "Impossible de confirmer la disponibilité de la capture; tentative d’ouverture de cette page dans l’édition sélectionnée."
          : "Could not confirm capture availability; attempting to open this page in the selected edition.",
      );
    } finally {
      setIsResolvingEdition(false);
    }
  }

  const browseLink = browseUrl ? (currentReplayUrl ?? browseUrl) : undefined;
  const rawLink = rawHtmlUrl ?? undefined;

  return (
    <div className="flex h-full w-full flex-col">
      {showEditionSelect && (
        <div className="border-ha-border text-ha-muted flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-xs sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="ha-snapshot-edition-select"
              className="text-[11px] font-medium text-[var(--text)]"
            >
              {locale === "fr" ? "Édition" : "Edition"}
            </label>
            <select
              id="ha-snapshot-edition-select"
              className="ha-select ha-select-sm"
              value={activeJobId ?? undefined}
              onChange={(e) => handleEditionChange(Number(e.target.value))}
              disabled={isResolvingEdition}
            >
              {editionOptions.map((edition) => (
                <option key={edition.jobId} value={edition.jobId}>
                  {formatEditionLabel(edition, locale)}
                </option>
              ))}
            </select>
          </div>

          {browseLink && (
            <a
              href={browseLink}
              target="_blank"
              rel="noreferrer"
              className="text-ha-accent hover:text-ha-accent text-[11px] font-medium"
            >
              {locale === "fr" ? "Ouvrir la page actuelle ↗" : "Open current page ↗"}
            </a>
          )}
        </div>
      )}

      {showEditionSelect && (isResolvingEdition || editionNotice) && (
        <div
          className={
            editionNotice
              ? "border-ha-border bg-ha-warning text-ha-warning border-b px-4 py-2 text-[11px] font-medium sm:px-5"
              : "border-ha-border text-ha-muted border-b bg-[var(--card-bg)] px-4 py-2 text-[11px] font-medium sm:px-5"
          }
        >
          {isResolvingEdition
            ? locale === "fr"
              ? "Changement d’édition…"
              : "Switching edition…"
            : editionNotice}
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
