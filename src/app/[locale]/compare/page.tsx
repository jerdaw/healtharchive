import type { Metadata } from "next";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

import { PageShell } from "@/components/layout/PageShell";
import { fetchChangeCompare, fetchSnapshotLatest } from "@/lib/api";
import { formatDate, formatPercent } from "@/lib/format";
import { type Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";

function getCompareMetadataCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      title: "Comparer des captures archivées",
      intro:
        "Cette vue met en évidence des différences de texte entre deux captures archivées. Elle n’interprète pas le sens et ne fournit pas de directives.",
    };
  }

  return {
    title: "Compare archived captures",
    intro:
      "This view highlights text differences between two archived captures. It does not interpret meaning or provide guidance.",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getCompareMetadataCopy(locale);
  return buildPageMetadata(locale, "/compare", copy.title, copy.intro);
}

export default async function ComparePage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await resolveLocale(routeParams);
  const siteCopy = getSiteCopy(locale);
  const params = await searchParams;
  const toParam = typeof params.to === "string" ? params.to : "";
  const fromParam = typeof params.from === "string" ? params.from : "";

  const toSnapshotId = Number.parseInt(toParam, 10);
  const fromSnapshotId = Number.parseInt(fromParam, 10);

  if (!toSnapshotId || Number.isNaN(toSnapshotId)) {
    return (
      <PageShell
        eyebrow={locale === "fr" ? "Comparer" : "Compare"}
        title={locale === "fr" ? "Comparer des captures" : "Compare captures"}
        intro={
          locale === "fr"
            ? "Sélectionnez deux captures archivées pour voir des différences de texte descriptives."
            : "Select two archived captures to view descriptive text differences."
        }
      >
        <div className="ha-callout">
          <h2 className="ha-callout-title">
            {locale === "fr" ? "Comparaison indisponible" : "Compare unavailable"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Aucune capture n’a été sélectionnée pour la comparaison. Visitez une page de capture pour choisir des captures à comparer."
              : "No snapshot was selected for comparison. Visit a snapshot page to choose captures to compare."}
          </p>
        </div>
      </PageShell>
    );
  }

  let compare = null;
  try {
    compare = await fetchChangeCompare({
      toSnapshotId,
      fromSnapshotId: Number.isNaN(fromSnapshotId) ? null : fromSnapshotId,
    });
  } catch {
    compare = null;
  }

  let compareLiveHref: string | null = null;
  if (compare) {
    let latestSnapshotId = compare.toSnapshot.snapshotId;
    try {
      const latest = await fetchSnapshotLatest(compare.toSnapshot.snapshotId);
      if (latest.found && latest.snapshotId != null) {
        latestSnapshotId = latest.snapshotId;
      }
    } catch {
      latestSnapshotId = compare.toSnapshot.snapshotId;
    }
    compareLiveHref = `/compare-live?to=${latestSnapshotId}`;
  }

  return (
    <PageShell
      eyebrow={locale === "fr" ? "Comparer" : "Compare"}
      title={locale === "fr" ? "Comparer des captures archivées" : "Compare archived captures"}
      intro={
        locale === "fr"
          ? "Cette vue met en évidence des différences de texte entre deux captures archivées. Elle n’interprète pas le sens et ne fournit pas de directives."
          : "This view highlights text differences between two archived captures. It does not interpret meaning or provide guidance."
      }
    >
      {!compare && (
        <div className="ha-callout">
          <h2 className="ha-callout-title">
            {locale === "fr" ? "Comparaison indisponible" : "Comparison unavailable"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "La comparaison n’a pas pu être chargée. Assurez-vous que le suivi des changements est activé et que la paire de captures sélectionnée possède un diff pré-calculé."
              : "The comparison could not be loaded. Ensure change tracking is enabled and the selected capture pair has a precomputed diff."}
          </p>
        </div>
      )}

      {compare && (
        <section className="space-y-6">
          <div className="ha-callout">
            <h2 className="ha-callout-title">
              {locale === "fr" ? "Changements descriptifs seulement" : "Descriptive changes only"}
            </h2>
            <p className="mt-2 text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Cette comparaison met en évidence des changements de texte entre des captures archivées. Elle n’interprète pas le changement et ne fournit pas d’avis médical."
                : "This comparison highlights text changes between archived captures. It does not interpret the change or provide medical advice."}{" "}
              {siteCopy.whatThisSiteIs.forCurrent}.
            </p>
            <p className="mt-3 text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Besoin de citer cette comparaison? Voir"
                : "Need to cite this comparison? See"}{" "}
              <Link href="/cite" className="ha-link">
                /cite
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {compareLiveHref && (
              <Link
                href={compareLiveHref}
                prefetch={false}
                rel="nofollow"
                className="ha-btn-secondary text-xs"
              >
                {locale === "fr" ? "Comparer à la page en direct" : "Compare to the live page"}
              </Link>
            )}
            <Link
              href={`/snapshot/${compare.toSnapshot.snapshotId}`}
              className="ha-btn-secondary text-xs"
            >
              {locale === "fr" ? "Voir la capture" : "View snapshot"}
            </Link>
          </div>

          <div className="ha-grid-2">
            <div className="ha-card space-y-2">
              <p className="text-ha-muted text-xs">
                {locale === "fr" ? "Capture précédente" : "Earlier capture"}
              </p>
              {compare.fromSnapshot ? (
                <>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {compare.fromSnapshot.title ??
                      (locale === "fr" ? "Capture archivée" : "Archived snapshot")}
                  </h3>
                  <p className="text-ha-muted text-xs">
                    {formatDate(locale, compare.fromSnapshot.captureDate)}
                  </p>
                  <p className="text-ha-muted text-xs">
                    {compare.fromSnapshot.jobName ??
                      (locale === "fr" ? "Capture d’édition" : "Edition capture")}
                  </p>
                  <p className="text-ha-muted text-xs">ID {compare.fromSnapshot.snapshotId}</p>
                  <div className="text-xs">
                    <a
                      href={compare.fromSnapshot.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ha-link"
                    >
                      {locale === "fr" ? "URL originale ↗" : "Original URL ↗"}
                    </a>
                  </div>
                  <div className="pt-2">
                    <Link
                      href={`/snapshot/${compare.fromSnapshot.snapshotId}`}
                      className="ha-btn-secondary text-xs"
                    >
                      {locale === "fr" ? "Voir la capture" : "View snapshot"}
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-ha-muted text-xs">
                  {locale === "fr"
                    ? "Il s’agit de la première capture archivée pour cette page."
                    : "This is the first archived capture for this page."}
                </p>
              )}
            </div>
            <div className="ha-card space-y-2">
              <p className="text-ha-muted text-xs">
                {locale === "fr" ? "Capture suivante" : "Later capture"}
              </p>
              <h3 className="text-sm font-semibold text-slate-900">
                {compare.toSnapshot.title ??
                  (locale === "fr" ? "Capture archivée" : "Archived snapshot")}
              </h3>
              <p className="text-ha-muted text-xs">
                {formatDate(locale, compare.toSnapshot.captureDate)}
              </p>
              <p className="text-ha-muted text-xs">
                {compare.toSnapshot.jobName ??
                  (locale === "fr" ? "Capture d’édition" : "Edition capture")}
              </p>
              <p className="text-ha-muted text-xs">ID {compare.toSnapshot.snapshotId}</p>
              <div className="text-xs">
                <a
                  href={compare.toSnapshot.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ha-link"
                >
                  {locale === "fr" ? "URL originale ↗" : "Original URL ↗"}
                </a>
              </div>
              <div className="pt-2">
                <Link
                  href={`/snapshot/${compare.toSnapshot.snapshotId}`}
                  className="ha-btn-secondary text-xs"
                >
                  {locale === "fr" ? "Voir la capture" : "View snapshot"}
                </Link>
              </div>
            </div>
          </div>

          {compare.event.highNoise && (
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
              <span className="ha-tag">{compare.event.changeType}</span>
              <span>
                {compare.event.summary ??
                  (locale === "fr" ? "Texte archivé mis à jour." : "Archived text updated.")}
              </span>
            </div>
            <div className="text-ha-muted flex flex-wrap items-center gap-2 text-xs">
              {compare.event.changedSections != null && (
                <span>
                  {compare.event.changedSections}{" "}
                  {locale === "fr" ? "sections modifiées" : "sections changed"}
                </span>
              )}
              {compare.event.addedSections != null && (
                <span>
                  {compare.event.addedSections} {locale === "fr" ? "ajoutées" : "added"}
                </span>
              )}
              {compare.event.removedSections != null && (
                <span>
                  {compare.event.removedSections} {locale === "fr" ? "retirées" : "removed"}
                </span>
              )}
              {compare.event.addedLines != null && compare.event.removedLines != null && (
                <span>
                  +{compare.event.addedLines} / -{compare.event.removedLines}{" "}
                  {locale === "fr" ? "lignes" : "lines"}
                </span>
              )}
              {compare.event.changeRatio != null && (
                <span>
                  {locale === "fr" ? "Variation" : "Change ratio"}:{" "}
                  {formatPercent(compare.event.changeRatio)}
                </span>
              )}
            </div>
            {compare.diffHtml ? (
              <div className="ha-diff" dangerouslySetInnerHTML={{ __html: compare.diffHtml }} />
            ) : (
              <p className="text-ha-muted text-xs">
                {locale === "fr"
                  ? "Aucun diff n’est disponible pour cette paire de captures. Cela peut se produire lorsque le contenu est inchangé ou stocké dans un format non HTML."
                  : "No diff is available for this capture pair. This can happen when content is unchanged or stored in a non-HTML format."}
              </p>
            )}
            {compare.diffTruncated && (
              <p className="text-ha-muted text-xs">
                {locale === "fr"
                  ? "La sortie du diff a été tronquée pour la lisibilité."
                  : "Diff output was truncated for readability."}
              </p>
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}
