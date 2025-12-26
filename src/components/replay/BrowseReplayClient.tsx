"use client";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { useEffect, useMemo, useState } from "react";

import { SnapshotFrame } from "@/components/SnapshotFrame";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { resolveReplayUrl } from "@/lib/api";
import { isHtmlMimeType } from "@/lib/mime";
import { buildBrowseDisclaimer, getSiteCopy } from "@/lib/siteCopy";

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
  originalUrl: string | null;
  browseUrl: string | null;
  rawHtmlUrl: string | null;
  apiLink?: string;
  editions?: ReplayEdition[] | null;
  canCompareLive?: boolean;
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
  canCompareLive = false,
}: BrowseReplayClientProps) {
  const locale = useLocale();
  const siteCopy = getSiteCopy(locale);
  const initialViewerUrl = browseUrl ?? rawHtmlUrl ?? null;

  const [iframeSrc, setIframeSrc] = useState<string | null>(initialViewerUrl);
  const [activeJobId, setActiveJobId] = useState<number | null>(jobId);
  const [currentOriginalUrl, setCurrentOriginalUrl] = useState<string>(
    originalUrl ? stripUrlFragment(originalUrl) || originalUrl : "",
  );
  const [currentTimestamp14, setCurrentTimestamp14] = useState<string | null>(
    isoToTimestamp14(captureTimestamp),
  );
  const [currentReplayUrl, setCurrentReplayUrl] = useState<string | null>(browseUrl);
  const [editionNotice, setEditionNotice] = useState<string | null>(null);
  const [isResolvingEdition, setIsResolvingEdition] = useState(false);
  const [compareSnapshotId, setCompareSnapshotId] = useState<string | null>(
    canCompareLive ? snapshotId : null,
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
    Boolean(browseUrl && replayOrigin) && activeJobId != null && editionOptions.length > 1;

  const displayedCapture =
    timestamp14ToDateLabel(currentTimestamp14, locale) ?? dateIsoToLabel(captureDate, locale);
  const unknownUrlLabel = locale === "fr" ? "URL inconnue" : "Unknown URL";
  const reportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (snapshotId) params.set("snapshot", snapshotId);
    if (currentOriginalUrl) {
      params.set("url", currentOriginalUrl);
    }
    params.set("page", `/browse/${snapshotId}`);
    return `/report?${params.toString()}`;
  }, [snapshotId, currentOriginalUrl]);

  useEffect(() => {
    if (!canCompareLive) {
      setCompareSnapshotId(null);
      return;
    }
    if (!currentOriginalUrl) return;
    if (!activeJobId) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const resolved = await resolveReplayUrl({
          jobId: activeJobId,
          url: currentOriginalUrl,
          timestamp14: currentTimestamp14,
        });
        if (cancelled) return;
        if (resolved.snapshotId) {
          const mimeType = resolved.mimeType;
          if (mimeType === undefined || isHtmlMimeType(mimeType)) {
            setCompareSnapshotId(String(resolved.snapshotId));
            return;
          }
          setCompareSnapshotId(null);
          return;
        }
        setCompareSnapshotId(snapshotId);
      } catch {
        if (!cancelled) setCompareSnapshotId(snapshotId);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeJobId, canCompareLive, currentOriginalUrl, currentTimestamp14, snapshotId]);

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
  const compareLiveHref = compareSnapshotId ? `/compare-live?to=${compareSnapshotId}` : null;

  return (
    <div className="ha-container">
      <section className="space-y-4 pt-6 pb-10">
        <header className="ha-card ha-home-panel space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-ha-muted text-xs font-medium">
                {locale === "fr" ? "Navigation dans le site archivé" : "Browsing archived site"}
              </p>
              <h1 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
                {sourceName}
              </h1>
              <p className="text-ha-muted mt-1 text-xs">
                {locale === "fr" ? "Capture" : "Capture"}: {displayedCapture}
                {activeJobId != null && (
                  <>
                    {" "}
                    · {locale === "fr" ? "édition" : "edition"}{" "}
                    <span className="font-medium">#{activeJobId}</span>
                  </>
                )}
              </p>
              <p className="mt-2 text-[11px] font-medium text-amber-800">
                {locale === "fr"
                  ? "Archive indépendante · Pas un site gouvernemental officiel."
                  : "Independent archive · Not an official government website."}{" "}
                {buildBrowseDisclaimer(locale, { captureLabel: displayedCapture })}{" "}
                {siteCopy.whatThisSiteIs.forCurrent}.
              </p>

              {showEditionSelect && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="ha-edition-select"
                    className="text-[11px] font-medium text-slate-800"
                  >
                    {locale === "fr" ? "Changer d’édition" : "Switch edition"}
                  </label>
                  <select
                    id="ha-edition-select"
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
              )}

              {isResolvingEdition && (
                <p className="text-ha-muted mt-2 text-[11px] font-medium">
                  {locale === "fr" ? "Changement d’édition…" : "Switching edition…"}
                </p>
              )}
              {editionNotice && (
                <p className="mt-2 text-[11px] font-medium text-amber-800">{editionNotice}</p>
              )}

              <p className="text-ha-muted mt-2 text-[11px] break-all">
                <span className="font-medium text-slate-800">
                  {locale === "fr" ? "URL d’origine :" : "Original URL:"}
                </span>{" "}
                {currentOriginalUrl || unknownUrlLabel}
              </p>
              <p className="text-ha-muted mt-2 text-[11px]">
                <Link href={reportHref} className="text-ha-accent font-medium hover:text-blue-700">
                  {locale === "fr"
                    ? "Signaler un problème avec cette capture"
                    : "Report an issue with this capture"}
                </Link>
              </p>

              {!browseUrl && (
                <p className="mt-2 text-[11px] font-medium text-amber-800">
                  {locale === "fr"
                    ? "La navigation en mode relecture n’est pas disponible pour cet enregistrement; affichage du HTML brut à la place."
                    : "Replay browsing is not available for this record; showing raw HTML instead."}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href="/archive" className="ha-btn-secondary text-xs">
                {locale === "fr" ? "← Retour à l’archive" : "← Back to archive"}
              </Link>
              {sourceCode && (
                <Link
                  href={`/archive?source=${encodeURIComponent(sourceCode)}&focus=filters`}
                  scroll={false}
                  className="ha-btn-secondary text-xs"
                >
                  {locale === "fr" ? "Rechercher cette source" : "Search this source"}
                </Link>
              )}
              <Link href={`/snapshot/${snapshotId}`} className="ha-btn-secondary text-xs">
                {locale === "fr" ? "Détails de la capture" : "Snapshot details"}
              </Link>
              {compareLiveHref && (
                <Link href={compareLiveHref} prefetch={false} className="ha-btn-secondary text-xs">
                  {locale === "fr" ? "Comparer à la page en direct" : "Compare to the live page"}
                </Link>
              )}
              {browseLink && (
                <a
                  href={browseLink}
                  target="_blank"
                  rel="noreferrer"
                  className="ha-btn-primary text-xs"
                >
                  {locale === "fr" ? "Ouvrir dans le lecteur ↗" : "Open in replay ↗"}
                </a>
              )}
              {rawHtmlUrl && (
                <a
                  href={rawHtmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ha-btn-secondary text-xs"
                >
                  {locale === "fr" ? "HTML brut ↗" : "Raw HTML ↗"}
                </a>
              )}
              {apiLink && (
                <a
                  href={apiLink}
                  target="_blank"
                  rel="noreferrer"
                  className="ha-btn-secondary text-xs"
                >
                  {locale === "fr" ? "Métadonnées (JSON) ↗" : "Metadata JSON ↗"}
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
            <div className="text-ha-muted flex h-[320px] items-center justify-center px-4 text-center text-sm">
              {locale === "fr"
                ? "Le contenu HTML archivé pour cette capture n’est pas disponible pour le moment."
                : "Archived HTML content for this snapshot is not currently available."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
