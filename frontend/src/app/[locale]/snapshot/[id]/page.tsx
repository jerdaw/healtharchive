import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { getRecordById } from "@/data/demo-records";
import {
  fetchSnapshotDetail,
  fetchSnapshotLatest,
  fetchSnapshotTimeline,
  searchSnapshots,
  getApiBaseUrl,
} from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { isHtmlMimeType } from "@/lib/mime";
import { resolveLocale } from "@/lib/resolveLocale";
import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { CopyButton } from "@/components/archive/CopyButton";
import { PageShell } from "@/components/layout/PageShell";
import { SnapshotFrame } from "@/components/SnapshotFrame";
import { formatDate, formatUtcTimestamp } from "@/lib/format";
import { getSiteCopy } from "@/lib/siteCopy";

function getSnapshotDetailsMetadataCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      title: "Détails de la capture",
      description:
        "Consultez les détails d’une capture archivée (métadonnées, liens et captures connexes).",
    };
  }

  return {
    title: "Snapshot details",
    description: "Review snapshot details (metadata, links, and related captures).",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>;
}): Promise<Metadata> {
  const routeParams = await params;
  const locale = await resolveLocale(Promise.resolve(routeParams));
  const copy = getSnapshotDetailsMetadataCopy(locale);
  return buildPageMetadata(locale, `/snapshot/${routeParams.id}`, copy.title, copy.description);
}

export default async function SnapshotPage({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>;
}) {
  const routeParams = await params;
  const { id } = routeParams;
  const locale = await resolveLocale(Promise.resolve(routeParams));
  const siteCopy = getSiteCopy(locale);

  let snapshotMeta: Awaited<ReturnType<typeof fetchSnapshotDetail>> | null = null;
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

  if (!snapshotMeta && record?.originalUrl) {
    try {
      const search = await searchSnapshots({
        q: record.originalUrl,
        view: "pages",
        pageSize: 1,
        sort: "newest",
      });
      const resolved = search.results[0];
      if (resolved?.id != null) {
        snapshotMeta = await fetchSnapshotDetail(resolved.id);
        usingBackend = true;
      }
    } catch {
      snapshotMeta = null;
    }
  }

  if (!snapshotMeta && !record) {
    return notFound();
  }

  const title = snapshotMeta?.title ?? record?.title ?? (locale === "fr" ? "Capture" : "Snapshot");
  const captureDate = snapshotMeta?.captureDate ?? record?.captureDate ?? null;
  const sourceCode = snapshotMeta?.sourceCode ?? record?.sourceCode ?? null;
  const sourceName =
    snapshotMeta?.sourceName ??
    record?.sourceName ??
    (locale === "fr" ? "Source inconnue" : "Unknown source");
  const language = snapshotMeta?.language ?? record?.language ?? null;
  const originalUrl = snapshotMeta?.originalUrl ?? record?.originalUrl ?? null;
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
  const rawHtmlUrl = usingBackend
    ? snapshotMeta?.rawSnapshotUrl
      ? `${apiBaseUrl}${snapshotMeta.rawSnapshotUrl}`
      : null
    : (record?.snapshotPath ?? null);
  const browseUrl = snapshotMeta?.browseUrl ?? null;
  const apiLink =
    usingBackend && snapshotMeta?.id != null ? `${apiBaseUrl}/api/snapshot/${id}` : null;

  const canCompareLive = Boolean(
    usingBackend && snapshotMeta?.id && isHtmlMimeType(snapshotMeta?.mimeType),
  );
  let compareLiveSnapshotId: number | null = null;
  if (canCompareLive && snapshotMeta?.id) {
    compareLiveSnapshotId = snapshotMeta.id;
    try {
      const latest = await fetchSnapshotLatest(snapshotMeta.id);
      if (latest.found && latest.snapshotId != null) {
        compareLiveSnapshotId = latest.snapshotId;
      }
    } catch {
      compareLiveSnapshotId = snapshotMeta.id;
    }
  }

  const viewHref = browseUrl;
  const diffHref =
    canCompareLive && compareLiveSnapshotId != null
      ? `/compare-live?to=${compareLiveSnapshotId}`
      : null;
  const citeHref =
    usingBackend && snapshotMeta?.id != null
      ? `/cite?snapshot=${snapshotMeta.id}`
      : originalUrl
        ? `/cite?url=${encodeURIComponent(originalUrl)}`
        : "/cite";

  const reportHref =
    originalUrl && usingBackend && snapshotMeta?.id != null
      ? `/report?snapshot=${snapshotMeta.id}&url=${encodeURIComponent(originalUrl)}&page=${encodeURIComponent(
          `/snapshot/${snapshotMeta.id}`,
        )}`
      : "/report";

  const allSnapshotsHref =
    originalUrl && sourceCode
      ? `/archive?view=snapshots&source=${encodeURIComponent(sourceCode)}&q=${encodeURIComponent(
          originalUrl,
        )}&focus=results`
      : "/archive?view=snapshots&focus=results";

  let timeline: Awaited<ReturnType<typeof fetchSnapshotTimeline>> | null = null;
  if (usingBackend && snapshotMeta?.id != null) {
    try {
      timeline = await fetchSnapshotTimeline(snapshotMeta.id);
    } catch {
      timeline = null;
    }
  }

  return (
    <PageShell
      eyebrow={locale === "fr" ? "Détails" : "Details"}
      title={title}
      intro={
        locale === "fr"
          ? "Métadonnées et liens pour une capture archivée."
          : "Metadata and links for an archived snapshot."
      }
      compact
    >
      <section className="ha-card ha-home-panel space-y-4 p-4 sm:p-5">
        <dl className="space-y-1 text-xs text-[var(--text)] sm:text-sm">
          <div className="flex gap-2">
            <dt className="text-ha-muted w-28">{locale === "fr" ? "Source" : "Source"}</dt>
            <dd>{sourceName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ha-muted w-28">{locale === "fr" ? "Date" : "Date"}</dt>
            <dd>
              {captureDate
                ? formatDate(locale, captureDate)
                : locale === "fr"
                  ? "Inconnu"
                  : "Unknown"}
              {jobId != null ? (
                <>
                  {" "}
                  · {locale === "fr" ? "édition" : "edition"}{" "}
                  <span className="font-medium">#{jobId}</span>
                </>
              ) : null}
            </dd>
          </div>
          {captureTimestamp ? (
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">{locale === "fr" ? "Horodatage" : "Timestamp"}</dt>
              <dd className="break-all">{formatUtcTimestamp(captureTimestamp)}</dd>
            </div>
          ) : null}
          {language ? (
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">{locale === "fr" ? "Langue" : "Language"}</dt>
              <dd>{language}</dd>
            </div>
          ) : null}
          {originalUrl ? (
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">
                {locale === "fr" ? "URL d’origine" : "Original URL"}
              </dt>
              <dd className="min-w-0 flex-1 break-all">
                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-ha-accent hover:text-ha-accent font-medium"
                >
                  {originalUrl}
                </a>
              </dd>
            </div>
          ) : null}
          {browseUrl ? (
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">
                {locale === "fr" ? "URL de relecture" : "Replay URL"}
              </dt>
              <dd className="min-w-0 flex-1 break-all">
                <a
                  href={browseUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-ha-accent hover:text-ha-accent font-medium"
                >
                  {browseUrl}
                </a>
              </dd>
            </div>
          ) : null}

          {usingBackend && snapshotMeta ? (
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">ID</dt>
              <dd className="break-all">{snapshotMeta.id}</dd>
            </div>
          ) : null}
          {usingBackend && snapshotMeta?.statusCode != null ? (
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">{locale === "fr" ? "Statut" : "Status"}</dt>
              <dd>{snapshotMeta.statusCode}</dd>
            </div>
          ) : null}
          {usingBackend && snapshotMeta?.mimeType ? (
            <div className="flex gap-2">
              <dt className="text-ha-muted w-28">{locale === "fr" ? "Type" : "Type"}</dt>
              <dd className="break-all">{snapshotMeta.mimeType}</dd>
            </div>
          ) : null}
        </dl>

        <p className="text-ha-warning text-[11px] font-medium">
          {locale === "fr"
            ? "Archive indépendante · Pas un site officiel du gouvernement."
            : "Independent archive · Not an official government website."}{" "}
          {siteCopy.whatThisSiteIs.forCurrent}.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {viewHref ? (
            <a href={viewHref} className="ha-btn-primary text-xs">
              {locale === "fr" ? "Voir" : "View"}
            </a>
          ) : null}
          {diffHref ? (
            <Link
              href={diffHref}
              prefetch={false}
              rel="nofollow"
              className="ha-btn-secondary text-xs"
            >
              {locale === "fr" ? "Voir diff" : "View diff"}
            </Link>
          ) : null}
          {rawHtmlUrl ? (
            <a
              href={rawHtmlUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="ha-btn-secondary text-xs"
            >
              {locale === "fr" ? "HTML brut ↗" : "Raw HTML ↗"}
            </a>
          ) : null}
          {apiLink ? (
            <a
              href={apiLink}
              target="_blank"
              rel="noreferrer noopener"
              className="ha-btn-secondary text-xs"
            >
              {locale === "fr" ? "Métadonnées (JSON) ↗" : "Metadata JSON ↗"}
            </a>
          ) : null}
          <Link href={citeHref} prefetch={false} className="ha-btn-secondary text-xs">
            {locale === "fr" ? "Citer" : "Cite"}
          </Link>
          <Link href={reportHref} prefetch={false} className="ha-btn-secondary text-xs">
            {locale === "fr" ? "Signaler un problème" : "Report issue"}
          </Link>
          <Link href={allSnapshotsHref} prefetch={false} className="ha-btn-secondary text-xs">
            {locale === "fr" ? "Toutes les captures" : "All snapshots"}
          </Link>
          {originalUrl ? (
            <CopyButton
              text={originalUrl}
              label={locale === "fr" ? "Copier l’URL d’origine" : "Copy original URL"}
              ariaLabel={locale === "fr" ? "Copier l’URL (d’origine)" : "Copy URL (original)"}
              className="ha-btn-secondary text-xs"
            >
              {locale === "fr" ? "Copier l’URL" : "Copy URL"}
            </CopyButton>
          ) : null}
        </div>
      </section>

      <section id="other-snapshots" className="ha-card ha-home-panel space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          {locale === "fr" ? "Autres captures" : "Other snapshots"}
        </h2>
        {!usingBackend ? (
          <p className="text-ha-muted text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "L’historique n’est pas disponible pour les captures de démonstration."
              : "History is not available for demo snapshots."}
          </p>
        ) : timeline?.snapshots?.length ? (
          <ul className="space-y-2 text-xs text-[var(--text)] sm:text-sm">
            {timeline.snapshots
              .slice()
              .reverse()
              .map((item) => {
                const isCurrent = snapshotMeta?.id != null && item.snapshotId === snapshotMeta.id;
                const compareHref =
                  item.compareFromSnapshotId != null
                    ? `/compare?from=${item.compareFromSnapshotId}&to=${item.snapshotId}`
                    : null;
                return (
                  <li
                    key={item.snapshotId}
                    className={`border-ha-border flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0 ${
                      isCurrent ? "ha-snapshot-current rounded-lg px-2 py-1.5" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text)]">
                        {formatDate(locale, item.captureDate)}
                        {isCurrent
                          ? locale === "fr"
                            ? " · (cette capture)"
                            : " · (this snapshot)"
                          : ""}
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
                      {item.browseUrl ? (
                        <a href={item.browseUrl} className="ha-btn-secondary text-xs">
                          {locale === "fr" ? "Voir" : "View"}
                        </a>
                      ) : null}
                      <Link
                        href={`/snapshot/${item.snapshotId}`}
                        prefetch={false}
                        className="ha-btn-secondary text-xs"
                      >
                        {locale === "fr" ? "Détails" : "Details"}
                      </Link>
                      {compareHref ? (
                        <Link
                          href={compareHref}
                          prefetch={false}
                          className="ha-btn-secondary text-xs"
                        >
                          {locale === "fr" ? "Comparer" : "Compare"}
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
          </ul>
        ) : (
          <p className="text-ha-muted text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Aucune autre capture n’est disponible pour cette page."
              : "No other snapshots are available for this page."}
          </p>
        )}
      </section>

      {browseUrl || rawHtmlUrl ? (
        <section className="ha-card ha-home-panel space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            {locale === "fr" ? "Aperçu de la page archivée" : "Archived page preview"}
          </h2>
          <SnapshotFrame
            src={browseUrl ?? rawHtmlUrl ?? ""}
            title={title}
            iframeClassName="h-[90vh] w-full border-0 sm:h-[96vh]"
          />
        </section>
      ) : null}
    </PageShell>
  );
}
