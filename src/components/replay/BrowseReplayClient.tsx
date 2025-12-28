"use client";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { useEffect, useMemo, useState } from "react";

import { SnapshotFrame } from "@/components/SnapshotFrame";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { fetchSnapshotLatest, fetchSnapshotTimeline, resolveReplayUrl } from "@/lib/api";
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
  language: string;
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
  initialCompareSnapshotId?: string | null;
  initialDetailsOpen?: boolean;
  timelineSnapshotId?: number | null;
};

export function BrowseReplayClient({
  snapshotId,
  title,
  language,
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
  initialCompareSnapshotId = null,
  initialDetailsOpen = false,
  timelineSnapshotId = null,
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
  const defaultCompareSnapshotId = canCompareLive ? (initialCompareSnapshotId ?? snapshotId) : null;
  const [compareSnapshotId, setCompareSnapshotId] = useState<string | null>(
    defaultCompareSnapshotId,
  );
  const [fallbackCompareSnapshotId, setFallbackCompareSnapshotId] = useState<string | null>(
    defaultCompareSnapshotId,
  );
  const [historyOpen, setHistoryOpen] = useState(initialDetailsOpen);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Awaited<
    ReturnType<typeof fetchSnapshotTimeline>
  > | null>(null);

  useEffect(() => {
    setFallbackCompareSnapshotId(defaultCompareSnapshotId);
    if (!canCompareLive) {
      setCompareSnapshotId(null);
      return;
    }
    setCompareSnapshotId(defaultCompareSnapshotId);
  }, [canCompareLive, defaultCompareSnapshotId]);

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
  const entryOriginalUrl = originalUrl ? stripUrlFragment(originalUrl) || originalUrl : "";
  const reportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (snapshotId) params.set("snapshot", snapshotId);
    if (currentOriginalUrl) {
      params.set("url", currentOriginalUrl);
    }
    params.set("page", `/snapshot/${snapshotId}`);
    return `/report?${params.toString()}`;
  }, [snapshotId, currentOriginalUrl]);

  useEffect(() => {
    if (!historyOpen) return;
    if (!timelineSnapshotId) return;
    if (timeline) return;

    let cancelled = false;
    setTimelineLoading(true);
    setTimelineError(null);

    fetchSnapshotTimeline(timelineSnapshotId)
      .then((data) => {
        if (cancelled) return;
        setTimeline(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load timeline";
        setTimelineError(message);
        setTimeline(null);
      })
      .finally(() => {
        if (!cancelled) setTimelineLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [historyOpen, timeline, timelineSnapshotId]);

  useEffect(() => {
    if (historyOpen) return;
    setTimelineLoading(false);
  }, [historyOpen]);

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
            try {
              const latest = await fetchSnapshotLatest(resolved.snapshotId);
              if (cancelled) return;
              if (latest.found && latest.snapshotId != null) {
                setCompareSnapshotId(String(latest.snapshotId));
                return;
              }
            } catch {
              if (cancelled) return;
            }
            setCompareSnapshotId(String(resolved.snapshotId));
            return;
          }
          setCompareSnapshotId(null);
          return;
        }
        setCompareSnapshotId(fallbackCompareSnapshotId);
      } catch {
        if (!cancelled) setCompareSnapshotId(fallbackCompareSnapshotId);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    activeJobId,
    canCompareLive,
    currentOriginalUrl,
    currentTimestamp14,
    fallbackCompareSnapshotId,
  ]);

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
  const compareLiveHref = compareSnapshotId ? `/compare-live?to=${compareSnapshotId}&run=1` : null;

  const otherSnapshotsCount =
    timeline?.snapshots && timelineSnapshotId != null
      ? timeline.snapshots.filter((item) => item.snapshotId !== timelineSnapshotId).length
      : null;
  const otherSnapshotsDisabled =
    !timelineSnapshotId ||
    (timelineLoading && !historyOpen) ||
    (otherSnapshotsCount != null && otherSnapshotsCount < 1 && !historyOpen);

  const otherSnapshotsButtonLabel = (() => {
    if (!timelineSnapshotId) {
      return locale === "fr" ? "Autres captures indisponibles" : "Other snapshots unavailable";
    }
    if (timelineLoading) {
      return locale === "fr" ? "Chargement des autres captures…" : "Loading other snapshots…";
    }
    if (otherSnapshotsCount != null) {
      if (otherSnapshotsCount < 1) {
        if (historyOpen) {
          return locale === "fr" ? "Masquer les autres captures" : "Hide other snapshots";
        }
        return locale === "fr" ? "Aucune autre capture" : "No other snapshots";
      }
      const countLabel =
        locale === "fr"
          ? `${otherSnapshotsCount} autre${otherSnapshotsCount === 1 ? "" : "s"} capture${
              otherSnapshotsCount === 1 ? "" : "s"
            }`
          : `${otherSnapshotsCount} other snapshot${otherSnapshotsCount === 1 ? "" : "s"}`;
      return historyOpen
        ? locale === "fr"
          ? `Masquer ${countLabel}`
          : `Hide ${countLabel}`
        : locale === "fr"
          ? `Afficher ${countLabel}`
          : `Show ${countLabel}`;
    }
    return historyOpen
      ? locale === "fr"
        ? "Masquer les autres captures"
        : "Hide other snapshots"
      : locale === "fr"
        ? "Afficher les autres captures"
        : "Show other snapshots";
  })();

  return (
    <div className="ha-container">
      <section className="space-y-4 pt-6 pb-10">
        <header className="ha-card ha-home-panel space-y-3 p-4 sm:p-5">
          <dl className="space-y-1 text-xs text-slate-800 sm:text-sm">
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">
                {locale === "fr" ? "Titre de la page" : "Page title"}
              </dt>
              <dd className="min-w-0 flex-1 font-semibold break-words text-slate-900">{title}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">{locale === "fr" ? "Source" : "Source"}</dt>
              <dd>{sourceName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">
                {locale === "fr" ? "Date de capture" : "Snapshot date"}
              </dt>
              <dd>
                {displayedCapture}
                {activeJobId != null && (
                  <>
                    {" "}
                    · {locale === "fr" ? "édition" : "edition"}{" "}
                    <span className="font-medium">#{activeJobId}</span>
                  </>
                )}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">{locale === "fr" ? "Langue" : "Language"}</dt>
              <dd>{language}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">
                {locale === "fr" ? "URL d’origine" : "Original URL"}
              </dt>
              <dd className="min-w-0 flex-1 break-all">
                {entryOriginalUrl ? (
                  <a
                    href={entryOriginalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ha-accent font-medium hover:text-blue-700"
                  >
                    {entryOriginalUrl}
                  </a>
                ) : (
                  <span className="text-ha-muted">{unknownUrlLabel}</span>
                )}
              </dd>
            </div>
          </dl>

          <p className="mt-2 text-[11px] font-medium text-amber-800">
            {locale === "fr"
              ? "Archive indépendante · Pas un site gouvernemental officiel."
              : "Independent archive · Not an official government website."}{" "}
            {buildBrowseDisclaimer(locale, { captureLabel: displayedCapture })}{" "}
            {siteCopy.whatThisSiteIs.forCurrent}.
          </p>

          {showEditionSelect && (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="ha-edition-select" className="text-ha-muted text-xs">
                {locale === "fr" ? "Édition" : "Edition"}
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
              {isResolvingEdition && (
                <span className="text-ha-muted text-xs">
                  {locale === "fr" ? "Changement…" : "Switching…"}
                </span>
              )}
            </div>
          )}

          {editionNotice && <p className="text-ha-muted text-xs">{editionNotice}</p>}

          {!browseUrl && (
            <p className="mt-2 text-[11px] font-medium text-amber-800">
              {locale === "fr"
                ? "La navigation en mode relecture n’est pas disponible pour cet enregistrement; affichage du HTML brut à la place."
                : "Replay browsing is not available for this record; showing raw HTML instead."}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {browseLink && (
              <a
                href={browseLink}
                target="_blank"
                rel="noreferrer"
                className="ha-btn-primary text-xs"
              >
                {locale === "fr" ? "Relecture ↗" : "Replay ↗"}
              </a>
            )}
            {compareLiveHref && (
              <Link href={compareLiveHref} prefetch={false} className="ha-btn-primary text-xs">
                {locale === "fr" ? "Voir diff" : "View diff"}
              </Link>
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
            <Link href="/cite" className="ha-btn-secondary text-xs">
              {locale === "fr" ? "Citer" : "Cite"}
            </Link>
            <Link href={reportHref} className="ha-btn-secondary text-xs">
              {locale === "fr" ? "Signaler un problème" : "Report issue"}
            </Link>
            <div className="ml-auto flex w-full justify-end sm:w-auto">
              <button
                type="button"
                className="ha-btn-secondary text-xs whitespace-nowrap"
                aria-expanded={historyOpen}
                onClick={() => setHistoryOpen((prev) => !prev)}
                disabled={otherSnapshotsDisabled}
              >
                {otherSnapshotsButtonLabel}
              </button>
            </div>
          </div>

          {historyOpen && (
            <div className="border-ha-border mt-4 border-t pt-4">
              {!timelineSnapshotId ? (
                <p className="text-ha-muted text-xs">
                  {locale === "fr"
                    ? "L’historique n’est pas disponible pour cette capture."
                    : "History is not available for this snapshot."}
                </p>
              ) : timelineLoading ? (
                <p className="text-ha-muted text-xs">
                  {locale === "fr" ? "Chargement…" : "Loading…"}
                </p>
              ) : timelineError ? (
                <p className="text-ha-muted text-xs">
                  {locale === "fr"
                    ? "Impossible de charger l’historique."
                    : "Could not load history."}
                </p>
              ) : timeline?.snapshots && timelineSnapshotId != null ? (
                (() => {
                  const otherItems = timeline.snapshots.filter(
                    (item) => item.snapshotId !== timelineSnapshotId,
                  );
                  if (otherItems.length < 1) {
                    return (
                      <p className="text-ha-muted text-xs">
                        {locale === "fr"
                          ? "Aucune autre capture n’est disponible pour cette page."
                          : "No other captures are available for this page."}
                      </p>
                    );
                  }
                  return (
                    <ul className="space-y-2 text-xs text-slate-800 sm:text-sm">
                      {otherItems.map((item) => {
                        const compareHref =
                          item.compareFromSnapshotId != null
                            ? `/compare?from=${item.compareFromSnapshotId}&to=${item.snapshotId}`
                            : null;
                        return (
                          <li
                            key={item.snapshotId}
                            className="border-ha-border flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0"
                          >
                            <div>
                              <p className="font-medium text-slate-900">
                                {dateIsoToLabel(item.captureDate, locale)}
                              </p>
                              <p className="text-ha-muted text-xs">
                                {item.jobName
                                  ? item.jobName
                                  : locale === "fr"
                                    ? "Capture d’édition"
                                    : "Edition capture"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/snapshot/${item.snapshotId}`}
                                className="ha-btn-secondary text-xs"
                              >
                                {locale === "fr" ? "Voir" : "View"}
                              </Link>
                              {compareHref ? (
                                <Link href={compareHref} className="ha-btn-secondary text-xs">
                                  {locale === "fr" ? "Comparer" : "Compare"}
                                </Link>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()
              ) : (
                <p className="text-ha-muted text-xs">
                  {locale === "fr"
                    ? "Aucune autre capture n’est disponible pour cette page."
                    : "No other captures are available for this page."}
                </p>
              )}
            </div>
          )}
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
              iframeClassName="h-[175vh] w-full border-0 sm:h-[187.5vh]"
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
