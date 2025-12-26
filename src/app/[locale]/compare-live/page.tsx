import type { Metadata } from "next";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { PageShell } from "@/components/layout/PageShell";
import { CompareLiveDiffPanel } from "@/components/diff/CompareLiveDiffPanel";
import { ApiError, fetchSnapshotCompareLive, type CompareLiveTextMode } from "@/lib/api";
import { type Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";

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
  const siteCopy = getSiteCopy(locale);
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
        intro={
          locale === "fr"
            ? "Cette vue compare une capture archivée avec la page en direct à partir d’un chargement frais."
            : "This view compares an archived capture with the live page using a fresh fetch."
        }
      >
        <div className="ha-callout space-y-3">
          <div>
            <h2 className="ha-callout-title">
              {locale === "fr" ? "Prêt à comparer" : "Ready to compare"}
            </h2>
            <p className="mt-2 text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Le bouton ci-dessous effectue un chargement en direct à chaque exécution."
                : "The button below performs a fresh live fetch each time."}
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
        </div>
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
      intro={
        locale === "fr"
          ? "Cette vue compare une capture archivée avec la page en direct à partir d’un chargement frais."
          : "This view compares an archived capture with the live page using a fresh fetch."
      }
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
        <section className="space-y-6">
          {compare.textModeFallback && (
            <div className="ha-callout border-amber-300 bg-amber-50 text-amber-900">
              <h2 className="ha-callout-title">
                {locale === "fr"
                  ? "Portée du texte élargie automatiquement"
                  : "Text scope automatically expanded"}
              </h2>
              <p className="mt-2 text-xs leading-relaxed sm:text-sm">
                {locale === "fr"
                  ? "Le contenu principal n’a pas pu être extrait de façon fiable. La comparaison utilise le texte de la page complète (en-tête/navigation/pied de page inclus)."
                  : "The main content could not be extracted reliably. This comparison uses full-page text (including header/navigation/footer)."}
              </p>
            </div>
          )}
          <div className="ha-callout">
            <h2 className="ha-callout-title">
              {locale === "fr" ? "Changements descriptifs seulement" : "Descriptive changes only"}
            </h2>
            <p className="mt-2 text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Cette comparaison met en évidence des changements de texte entre une capture archivée et la page en direct. Elle n’interprète pas le changement et ne fournit pas d’avis médical. La page en direct n’est pas archivée et peut changer."
                : "This comparison highlights text changes between an archived capture and the live page. It does not interpret the change or provide medical advice. The live page is not archived and may change."}{" "}
              {siteCopy.whatThisSiteIs.forCurrent}.
            </p>
            <p className="mt-3 text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Besoin de citer? Citez plutôt la capture archivée. Voir"
                : "Need to cite this? Cite the archived snapshot instead. See"}{" "}
              <Link href="/cite" className="text-ha-accent font-medium hover:text-blue-700">
                /cite
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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

          <div className="ha-grid-2">
            <div className="ha-card space-y-2">
              <p className="text-ha-muted text-xs">
                {locale === "fr" ? "Capture archivée" : "Archived capture"}
              </p>
              <h3 className="text-sm font-semibold text-slate-900">
                {compare.archivedSnapshot.title ??
                  (locale === "fr" ? "Capture archivée" : "Archived snapshot")}
              </h3>
              <p className="text-ha-muted text-xs">
                {formatUtcTimestamp(locale, compare.archivedSnapshot.captureTimestamp)}
              </p>
              <p className="text-ha-muted text-xs">
                {compare.archivedSnapshot.jobName ??
                  (locale === "fr" ? "Capture d’édition" : "Edition capture")}
              </p>
              <p className="text-ha-muted text-xs">ID {compare.archivedSnapshot.snapshotId}</p>
              <div className="pt-2">
                <a
                  href={compare.archivedSnapshot.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ha-accent text-xs font-medium hover:text-blue-700"
                >
                  {locale === "fr" ? "URL originale ↗" : "Original URL ↗"}
                </a>
              </div>
            </div>

            <div className="ha-card space-y-2">
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
                {locale === "fr" ? "Statut" : "Status"}: {compare.liveFetch.statusCode}
              </p>
              <p className="text-ha-muted text-xs">
                {locale === "fr" ? "Type" : "Type"}: {compare.liveFetch.contentType ?? "-"}
              </p>
              <p className="text-ha-muted text-xs">
                {locale === "fr" ? "Octets" : "Bytes"}: {compare.liveFetch.bytesRead}
              </p>
              <div className="space-y-1 pt-2 text-xs">
                <p className="text-ha-muted">{locale === "fr" ? "URL finale" : "Final URL"}</p>
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

          {compare.stats.highNoise && (
            <div className="ha-callout border-amber-300 bg-amber-50 text-amber-900">
              <h3 className="ha-callout-title">
                {locale === "fr" ? "Changement à bruit élevé" : "High-noise change"}
              </h3>
              <p className="mt-2 text-xs leading-relaxed sm:text-sm">
                {locale === "fr"
                  ? "Ce changement peut inclure des mises à jour de mise en page ou de gabarit (par exemple : navigation ou pied de page). Traitez le diff comme descriptif, et non définitif."
                  : "This change may include layout or boilerplate updates (such as navigation or footer adjustments). Treat the diff as descriptive, not definitive."}
              </p>
            </div>
          )}

          <div className="ha-card space-y-3">
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
            </div>
            <div className="text-ha-muted flex flex-wrap items-center gap-2 text-xs">
              <span>
                {compare.stats.changedSections}{" "}
                {locale === "fr" ? "sections modifiées" : "sections changed"}
              </span>
              <span>
                {compare.stats.addedSections} {locale === "fr" ? "ajoutées" : "added"}
              </span>
              <span>
                {compare.stats.removedSections} {locale === "fr" ? "retirées" : "removed"}
              </span>
              <span>
                +{compare.stats.addedLines} / -{compare.stats.removedLines}{" "}
                {locale === "fr" ? "lignes" : "lines"}
              </span>
            </div>
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
