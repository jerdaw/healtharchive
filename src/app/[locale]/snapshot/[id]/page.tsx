import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getRecordById } from "@/data/demo-records";
import {
  fetchSnapshotDetail,
  fetchSnapshotTimeline,
  fetchSourceEditions,
  getApiBaseUrl,
} from "@/lib/api";
import { localeToLanguageTag, type Locale } from "@/lib/i18n";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";
import { SnapshotReplayClient } from "@/components/replay/SnapshotReplayClient";

function formatDate(locale: Locale, iso: string | undefined | null): string {
  if (!iso) return locale === "fr" ? "Inconnu" : "Unknown";

  const parts = iso.split("-");
  if (parts.length === 3) {
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (year && month && day) {
      const d = new Date(year, month - 1, day);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(localeToLanguageTag(locale), {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
  }

  const parsed = new Date(iso);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(localeToLanguageTag(locale), {
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

  if (!snapshotMeta && !record) {
    return notFound();
  }

  const title = snapshotMeta?.title ?? record?.title ?? (locale === "fr" ? "Capture" : "Snapshot");
  const captureDate =
    snapshotMeta?.captureDate ?? record?.captureDate ?? (locale === "fr" ? "Inconnu" : "Unknown");
  const sourceCode = snapshotMeta?.sourceCode ?? record?.sourceCode ?? null;
  const sourceName =
    snapshotMeta?.sourceName ??
    record?.sourceName ??
    (locale === "fr" ? "Source inconnue" : "Unknown source");
  const language =
    snapshotMeta?.language ?? record?.language ?? (locale === "fr" ? "Inconnu" : "Unknown");
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
  const rawHtmlUrl =
    snapshotMeta?.rawSnapshotUrl != null
      ? `${apiBaseUrl}${snapshotMeta.rawSnapshotUrl}`
      : (record?.snapshotPath ?? null);
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
  if (originalUrl) {
    reportParams.set("url", originalUrl);
  }
  reportParams.set("page", `/snapshot/${id}`);
  const reportHref = `/report?${reportParams.toString()}`;

  let sourceEditions: Awaited<ReturnType<typeof fetchSourceEditions>> | null = null;
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

  const displayedOriginalUrl = originalUrl ?? (locale === "fr" ? "URL inconnue" : "Unknown URL");

  return (
    <PageShell
      eyebrow={locale === "fr" ? "Capture archivée" : "Archived snapshot"}
      title={title}
      intro={
        locale === "fr"
          ? "Consultez une capture archivée et ses métadonnées associées. Le contenu archivé peut être incomplet, périmé ou remplacé."
          : "Review an archived snapshot and its associated metadata. Archived content may be incomplete, outdated, or superseded."
      }
    >
      <section className="ha-grid-2">
        {/* Metadata card */}
        <div className="space-y-4">
          <div className="ha-card p-4 sm:p-5">
            <p className="text-ha-muted text-xs font-medium">
              {locale === "fr"
                ? `Capture archivée du ${formatDate(locale, captureDate)}.`
                : `Archived snapshot from ${formatDate(locale, captureDate)}.`}
            </p>
            {!usingBackend && record && (
              <p className="text-ha-muted mt-1 text-xs">
                {locale === "fr"
                  ? "Cette capture provient d’un échantillon hors ligne limité inclus avec le site."
                  : "This snapshot is from a limited offline sample bundled with the site."}
              </p>
            )}
            <dl className="mt-3 space-y-1 text-xs text-slate-800 sm:text-sm">
              <div className="flex gap-2">
                <dt className="text-ha-muted w-28">{locale === "fr" ? "Source" : "Source"}</dt>
                <dd>{sourceName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ha-muted w-28">
                  {locale === "fr" ? "Date de capture" : "Capture date"}
                </dt>
                <dd>{formatDate(locale, captureDate)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ha-muted w-28">{locale === "fr" ? "Langue" : "Language"}</dt>
                <dd>{language}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ha-muted w-28">
                  {locale === "fr" ? "URL d’origine" : "Original URL"}
                </dt>
                <dd className="break-all">{displayedOriginalUrl}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/archive" className="ha-btn-secondary text-xs">
                {locale === "fr" ? "← Retour à l’archive" : "← Back to archive"}
              </Link>
              {sourceCode && (
                <Link
                  href={`/archive?source=${encodeURIComponent(sourceCode)}`}
                  className="ha-btn-secondary text-xs"
                >
                  {locale === "fr" ? "Rechercher cette source" : "Search this source"}
                </Link>
              )}
              {viewerUrl && (
                <Link href={`/browse/${id}`} className="ha-btn-primary text-xs">
                  {locale === "fr" ? "Parcourir en plein écran" : "Browse full screen"}
                </Link>
              )}
              {browseUrl && (
                <a
                  href={browseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ha-btn-secondary text-xs"
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
            </div>
          </div>

          <div className="ha-callout">
            <h3 className="ha-callout-title">
              {locale === "fr" ? "Note importante" : "Important note"}
            </h3>
            <p className="text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Archive indépendante · Pas un site gouvernemental officiel. Le contenu archivé reflète ce que les sites publics affichaient au moment de la capture. "
                : "Independent archive · Not an official government website. Archived content reflects what public websites displayed at the time of capture. "}
              {siteCopy.whatThisSiteIs.limitations}{" "}
              {locale === "fr"
                ? "Ceci n’est pas un avis médical et ne doit pas être interprété comme des directives actuelles. "
                : "This is not medical advice and should not be treated as current guidance. "}
              {siteCopy.whatThisSiteIs.forCurrent}.
            </p>
            <p className="mt-3 text-xs leading-relaxed sm:text-sm">
              <Link href={reportHref} className="text-ha-accent font-medium hover:text-blue-700">
                {locale === "fr"
                  ? "Signaler un problème avec cette capture"
                  : "Report an issue with this snapshot"}
              </Link>
              .{" "}
              <Link href="/cite" className="text-ha-accent font-medium hover:text-blue-700">
                {locale === "fr" ? "Comment citer cette capture" : "How to cite this snapshot"}
              </Link>
              .
            </p>
          </div>

          {timeline?.snapshots && timeline.snapshots.length > 1 && (
            <div className="ha-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                {locale === "fr" ? "Autres captures de cette page" : "Other captures of this page"}
              </h3>
              <p className="text-ha-muted mt-1 text-xs">
                {locale === "fr"
                  ? "Comparez les captures pour voir les changements descriptifs entre les éditions."
                  : "Compare captures to see descriptive text changes between editions."}
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
                      className="border-ha-border flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {formatDate(locale, item.captureDate)}
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
                        {isCurrent ? (
                          <span className="ha-tag">
                            {locale === "fr" ? "Cette capture" : "This capture"}
                          </span>
                        ) : (
                          <Link
                            href={`/snapshot/${item.snapshotId}`}
                            className="ha-btn-secondary text-xs"
                          >
                            {locale === "fr" ? "Voir la capture" : "View snapshot"}
                          </Link>
                        )}
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
            </div>
          )}
        </div>

        {/* Embedded snapshot */}
        <div className="ha-card ha-card-elevated flex min-h-[320px] flex-col">
          <div className="border-ha-border text-ha-muted border-b px-4 py-3 text-xs sm:px-5">
            <span className="font-medium text-slate-900">
              {locale === "fr" ? "Contenu archivé" : "Archived content"}
            </span>{" "}
            {viewerUrl ? (
              <>
                {" "}
                · {locale === "fr" ? "servi depuis" : "served from"} <code>{viewerUrl}</code>{" "}
                {browseUrl
                  ? locale === "fr"
                    ? "via le service de relecture."
                    : "via the replay service."
                  : usingBackend
                    ? locale === "fr"
                      ? "via l’API en direct."
                      : "from the live API."
                    : locale === "fr"
                      ? "via l’échantillon hors ligne."
                      : "from the offline sample."}
              </>
            ) : (
              <>
                {" "}
                ·{" "}
                {usingBackend && snapshotMeta
                  ? locale === "fr"
                    ? "le HTML archivé de cette capture n’est pas disponible pour le moment; les métadonnées restent accessibles ci-dessous."
                    : "archived HTML for this snapshot is not currently available; metadata remains accessible below."
                  : locale === "fr"
                    ? "l’intégration du lecteur pour cette capture n’est pas encore disponible."
                    : "viewer integration for this snapshot is not yet available."}
              </>
            )}
            <span className="sr-only">
              {" "}
              {locale === "fr"
                ? "La section suivante est une capture intégrée de la page archivée."
                : "The following section is an embedded snapshot of the archived page."}
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
              <div className="text-ha-muted flex h-[320px] items-center justify-center px-4 text-center text-xs sm:h-[560px] sm:text-sm">
                {usingBackend && snapshotMeta ? (
                  <>
                    {locale === "fr"
                      ? "Le contenu HTML archivé de cette capture n’est pas disponible pour le moment."
                      : "Archived HTML content for this snapshot is not currently available."}{" "}
                    {apiLink && (
                      <>
                        {locale === "fr" ? "Vous pouvez tout de même" : "You can still"}{" "}
                        <a
                          href={apiLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ha-accent font-medium hover:text-blue-700"
                        >
                          {locale === "fr" ? "voir les métadonnées (JSON)" : "view metadata JSON"}
                        </a>
                        .
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {locale === "fr"
                      ? "Le contenu HTML archivé de cette capture n’est pas disponible dans le lecteur intégré."
                      : "Archived HTML content for this snapshot is not currently available in the embedded viewer."}
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
