import type { Metadata } from "next";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { PageShell } from "@/components/layout/PageShell";
import { CompareLiveDiffPanel } from "@/components/diff/CompareLiveDiffPanel";
import { ApiError, fetchSnapshotCompareLive, type CompareLiveTextMode } from "@/lib/api";
import { type Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";

export const dynamic = "force-dynamic";

function getCompareLiveMetadataCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      title: "Comparer à la page en direct",
      intro:
        "Comparez une capture archivée à la page en direct à partir d’un chargement frais (sans mise en cache).",
    };
  }

  return {
    title: "Compare to the live page",
    intro: "Compare an archived capture with the live page using a fresh fetch (no caching).",
  };
}

function formatUtcTimestamp(locale: Locale, value: string | null | undefined): string {
  if (!value) return locale === "fr" ? "Inconnu" : "Unknown";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().replace(".000Z", "Z");
  }
  return value;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return "";
  const rounded = Math.round(value * 100);
  return `${rounded}%`;
}

export async function generateMetadata({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getCompareLiveMetadataCopy(locale);
  const metadata = buildPageMetadata(locale, "/compare-live", copy.title, copy.intro);
  return {
    ...metadata,
    robots: { index: false, follow: false },
  };
}

export default async function CompareLivePage({
  params: routeParams,
  searchParams,
}: {
  params?: Promise<{ locale?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await resolveLocale(routeParams);
  const params = await searchParams;

  const toParam = typeof params.to === "string" ? params.to : "";
  const runParam = typeof params.run === "string" ? params.run : "";
  const modeParam = typeof params.mode === "string" ? params.mode : "";

  const toSnapshotId = Number.parseInt(toParam, 10);
  const shouldRun = runParam === "1";
  const mode: CompareLiveTextMode = modeParam === "full" ? "full" : "main";
  const modeQuery = mode === "full" ? "&mode=full" : "";

  if (!toSnapshotId || Number.isNaN(toSnapshotId)) {
    return (
      <PageShell
        eyebrow={locale === "fr" ? "Comparer" : "Compare"}
        title={
          locale === "fr"
            ? "Comparer une capture et la page en direct"
            : "Compare a snapshot to the live page"
        }
        intro={
          locale === "fr"
            ? "Sélectionnez une capture archivée pour lancer une comparaison en direct."
            : "Select an archived snapshot to run a live comparison."
        }
      >
        <div className="ha-callout">
          <h2 className="ha-callout-title">
            {locale === "fr" ? "Comparaison indisponible" : "Compare unavailable"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Aucune capture n’a été sélectionnée pour la comparaison en direct."
              : "No snapshot was selected for a live comparison."}
          </p>
        </div>
      </PageShell>
    );
  }

  const runHref = `/compare-live?to=${toSnapshotId}&run=1${modeQuery}`;
  const modeHrefMain = `/compare-live?to=${toSnapshotId}`;
  const modeHrefFull = `/compare-live?to=${toSnapshotId}&mode=full`;

  if (!shouldRun) {
    return (
      <PageShell
        eyebrow={locale === "fr" ? "Comparer" : "Compare"}
        title={locale === "fr" ? "Comparer à la page en direct" : "Compare to the live page"}
        compact
        hideHeaderVisually
      >
        <section className="ha-card ha-home-panel space-y-3 p-4 sm:p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {locale === "fr" ? "Prêt à comparer" : "Ready to compare"}
            </h2>
            <p className="mt-2 text-xs text-ha-muted leading-relaxed">
              {locale === "fr"
                ? "Cette vue compare une capture archivée à la page en direct via un chargement frais."
                : "This view compares an archived snapshot to the live page using a fresh fetch."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <span className="text-ha-muted">
              {locale === "fr" ? "Portée du texte:" : "Text scope:"}
            </span>
            <Link
              href={modeHrefMain}
              prefetch={false}
              scroll={false}
              className={`ha-tag ${mode === "main" ? "ring-1 ring-blue-700" : "opacity-70 hover:opacity-100"}`}
            >
              {locale === "fr" ? "Contenu principal" : "Main content"}
            </Link>
            <Link
              href={modeHrefFull}
              prefetch={false}
              scroll={false}
              className={`ha-tag ${mode === "full" ? "ring-1 ring-blue-700" : "opacity-70 hover:opacity-100"}`}
            >
              {locale === "fr" ? "Texte complet" : "Full-page text"}
            </Link>
          </div>
          <Link href={runHref} prefetch={false} className="ha-btn-secondary text-xs">
            {locale === "fr" ? "Charger le diff en direct" : "Fetch live diff"}
          </Link>
          <p className="text-[11px] font-medium text-amber-800">
            {locale === "fr"
              ? "Archive indépendante · Changements descriptifs seulement; la page en direct n’est pas archivée."
              : "Independent archive · Descriptive changes only; the live page is not archived."}
          </p>
        </section>
      </PageShell>
    );
  }

  let compare = null;
  let errorMessage: string | null = null;

  try {
    compare = await fetchSnapshotCompareLive(toSnapshotId, { mode });
  } catch (error) {
    if (error instanceof ApiError && typeof error.detail === "string") {
      errorMessage = error.detail;
    } else {
      errorMessage =
        locale === "fr"
          ? "La comparaison en direct n’a pas pu être chargée."
          : "The live comparison could not be loaded.";
    }
  }

  return (
    <PageShell
      eyebrow={locale === "fr" ? "Comparer" : "Compare"}
      title={locale === "fr" ? "Comparer à la page en direct" : "Compare to the live page"}
      compact
      hideHeaderVisually
    >
      {errorMessage && (
        <div className="ha-callout">
          <h2 className="ha-callout-title">
            {locale === "fr" ? "Comparaison indisponible" : "Comparison unavailable"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">{errorMessage}</p>
        </div>
      )}

      {compare && (
        <section className="space-y-4">
          <div className="ha-card ha-home-panel space-y-3 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-ha-muted text-xs">
                  {locale === "fr" ? "Capture archivée" : "Archived snapshot"}
                </p>
                <h2 className="text-sm font-semibold text-slate-900">
                  {compare.archivedSnapshot.title ??
                    (locale === "fr" ? "Capture archivée" : "Archived snapshot")}
                </h2>
                <p className="text-ha-muted text-xs">
                  {formatUtcTimestamp(locale, compare.archivedSnapshot.captureTimestamp)}
                  {compare.archivedSnapshot.jobName
                    ? ` · ${compare.archivedSnapshot.jobName}`
                    : ""}
                </p>
                <p className="text-ha-muted text-xs">ID {compare.archivedSnapshot.snapshotId}</p>
                <a
                  href={compare.archivedSnapshot.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ha-accent text-xs font-medium hover:text-blue-700"
                >
                  {locale === "fr" ? "URL originale ↗" : "Original URL ↗"}
                </a>
              </div>

              <div className="space-y-1">
                <p className="text-ha-muted text-xs">
                  {locale === "fr" ? "Page en direct" : "Live page"}
                </p>
                <h3 className="text-sm font-semibold text-slate-900">
                  {locale === "fr" ? "Chargement en direct" : "Live fetch"}
                </h3>
                <p className="text-ha-muted text-xs">
                  {formatUtcTimestamp(locale, compare.liveFetch.fetchedAt)}
                </p>
                <p className="text-ha-muted text-xs">
                  {locale === "fr" ? "Statut" : "Status"}: {compare.liveFetch.statusCode} ·{" "}
                  {locale === "fr" ? "Type" : "Type"}: {compare.liveFetch.contentType ?? "-"} ·{" "}
                  {locale === "fr" ? "Octets" : "Bytes"}: {compare.liveFetch.bytesRead}
                </p>
                <div className="space-y-1 pt-1 text-xs">
                  <p className="text-ha-muted">
                    {locale === "fr" ? "URL finale" : "Final URL"}
                  </p>
                  <a
                    href={compare.liveFetch.finalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ha-accent font-medium hover:text-blue-700"
                  >
                    {compare.liveFetch.finalUrl}
                  </a>
                  {compare.liveFetch.finalUrl !== compare.liveFetch.requestedUrl && (
                    <p className="text-ha-muted">
                      {locale === "fr" ? "(Redirection depuis" : "(Redirected from"}{" "}
                      {compare.liveFetch.requestedUrl}
                      {")"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {compare.textModeFallback && (
              <p className="text-[11px] font-medium text-amber-800">
                {locale === "fr"
                  ? "Le contenu principal n’a pas pu être extrait; comparaison basée sur le texte complet."
                  : "Main content could not be extracted; comparison uses full-page text."}
              </p>
            )}
            <p className="text-[11px] font-medium text-amber-800">
              {locale === "fr"
                ? "Archive indépendante · Changements descriptifs seulement; la page en direct n’est pas archivée. Citez plutôt la capture ("
                : "Independent archive · Descriptive changes only; the live page is not archived. Cite the snapshot ("}
              <Link href="/cite" className="text-ha-accent font-medium hover:text-blue-700">
                /cite
              </Link>
              {locale === "fr" ? ")." : ")."}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link href={runHref} prefetch={false} className="ha-btn-secondary text-xs">
                {locale === "fr" ? "Recharger le diff" : "Fetch live diff again"}
              </Link>
              <Link
                href={`/snapshot/${compare.archivedSnapshot.snapshotId}`}
                className="ha-btn-secondary text-xs"
              >
                {locale === "fr" ? "Voir la capture" : "View snapshot"}
              </Link>
            </div>
          </div>

          <div className="ha-card space-y-3 p-4 sm:p-5">
            <div className="text-ha-muted flex flex-wrap items-center gap-2 text-xs">
              <span className="ha-tag">{compare.stats.summary}</span>
              <span className="ha-tag">
                {compare.textModeUsed === "full"
                  ? locale === "fr"
                    ? "Texte complet"
                    : "Full-page text"
                  : locale === "fr"
                    ? "Contenu principal"
                    : "Main content"}
              </span>
              <span>
                {locale === "fr" ? "Variation" : "Change ratio"}:{" "}
                {formatPercent(compare.stats.changeRatio)}
              </span>
              <span>
                +{compare.stats.addedLines} / -{compare.stats.removedLines}{" "}
                {locale === "fr" ? "lignes" : "lines"}
              </span>
              <span>
                {compare.stats.changedSections}{" "}
                {locale === "fr" ? "sections modifiées" : "sections changed"}
              </span>
            </div>

            {compare.stats.highNoise && (
              <p className="text-[11px] font-medium text-amber-800">
                {locale === "fr"
                  ? "Changement à bruit élevé : peut inclure navigation/pied de page."
                  : "High-noise change: may include navigation/footer updates."}
              </p>
            )}

            {compare.render ? (
              <CompareLiveDiffPanel locale={locale} render={compare.render} />
            ) : (
              <>
                <div
                  className="ha-diff"
                  dangerouslySetInnerHTML={{ __html: compare.diff.diffHtml }}
                />
                {compare.diff.diffTruncated && (
                  <p className="text-ha-muted text-xs">
                    {locale === "fr"
                      ? "La sortie du diff a été tronquée pour la lisibilité."
                      : "Diff output was truncated for readability."}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}
