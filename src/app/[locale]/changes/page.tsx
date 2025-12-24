import type { Metadata } from "next";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

import { PageShell } from "@/components/layout/PageShell";
import { fetchChanges, fetchSourceEditions, fetchSources, fetchSourcesLocalized } from "@/lib/api";
import { localeToLanguageTag, type Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";

function getChangesCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: "Changements",
      title: "Suivi des changements",
      intro:
        "Suivez les changements de texte entre des captures archivées. Ces changements reflètent des différences entre captures, et non des directives actuelles.",
    };
  }

  return {
    eyebrow: "Changes",
    title: "Change tracking",
    intro:
      "Track text changes between archived captures. These changes reflect differences between snapshots, not current guidance.",
  };
}

export async function generateMetadata({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getChangesCopy(locale);
  return buildPageMetadata(locale, "/changes", copy.title, copy.intro);
}

function formatDate(locale: Locale, value: string | null | undefined): string {
  if (!value) return locale === "fr" ? "Inconnu" : "Unknown";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(localeToLanguageTag(locale), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return value;
}

export default async function ChangesPage({
  params: routeParams,
  searchParams,
}: {
  params?: Promise<{ locale?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await resolveLocale(routeParams);
  const copy = getChangesCopy(locale);
  const siteCopy = getSiteCopy(locale);
  const params = await searchParams;
  const requestedSource = typeof params.source === "string" ? params.source : "";
  const requestedJob = typeof params.job === "string" ? params.job : "";
  const requestedPage = typeof params.page === "string" ? params.page : "";

  const page = Number.parseInt(requestedPage, 10);
  const currentPage = Number.isNaN(page) || page < 1 ? 1 : page;

  const sourcesRes = await Promise.allSettled([
    locale === "fr" ? fetchSourcesLocalized({ lang: "fr" }) : fetchSources(),
  ]);
  const sources = sourcesRes[0].status === "fulfilled" ? sourcesRes[0].value : null;

  const selectedSource =
    requestedSource || (sources && sources.length > 0 ? sources[0].sourceCode : "");

  let editions = null;
  if (selectedSource) {
    try {
      editions = await fetchSourceEditions(selectedSource);
    } catch {
      editions = null;
    }
  }

  const selectedEdition =
    editions?.find((edition) => String(edition.jobId) === requestedJob) ?? editions?.[0] ?? null;

  let changes = null;
  if (selectedSource && selectedEdition?.jobId) {
    try {
      changes = await fetchChanges({
        source: selectedSource,
        jobId: selectedEdition.jobId,
        page: currentPage,
        pageSize: 20,
      });
    } catch {
      changes = null;
    }
  }

  const hasResults = Boolean(changes?.results?.length);
  const total = changes?.total ?? 0;
  const pageSize = changes?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      <section className="ha-home-hero space-y-4">
        <div className="ha-callout">
          <h2 className="ha-callout-title">
            {locale === "fr" ? "Changements descriptifs seulement" : "Descriptive changes only"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Les comparaisons mettent en évidence des différences de texte entre des captures archivées. Elles n’interprètent pas le sens et ne fournissent pas de directives médicales."
              : "Comparisons highlight text differences between archived captures. They do not interpret meaning or provide medical guidance."}{" "}
            {siteCopy.whatThisSiteIs.forCurrent}.
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            {locale === "fr" ? "Pour des conseils de citation, voir" : "For citation guidance, see"}{" "}
            <Link href="/cite" className="text-ha-accent font-medium hover:text-blue-700">
              /cite
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">{locale === "fr" ? "Portée" : "Scope"}</h2>
        <form className="ha-card space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-ha-muted space-y-2 text-xs font-medium">
              {locale === "fr" ? "Source" : "Source"}
              <select name="source" defaultValue={selectedSource} className="ha-select w-full">
                {(sources ?? []).map((source) => (
                  <option key={source.sourceCode} value={source.sourceCode}>
                    {source.sourceName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-ha-muted space-y-2 text-xs font-medium">
              {locale === "fr"
                ? "Édition (la plus récente par défaut)"
                : "Edition (latest by default)"}
              <select
                name="job"
                defaultValue={selectedEdition ? String(selectedEdition.jobId) : ""}
                className="ha-select w-full"
                disabled={!selectedEdition}
              >
                {(editions ?? []).map((edition) => (
                  <option key={edition.jobId} value={String(edition.jobId)}>
                    {edition.jobName}{" "}
                    {locale === "fr"
                      ? `(dernière capture ${formatDate(locale, edition.lastCapture)})`
                      : `(last capture ${formatDate(locale, edition.lastCapture)})`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="ha-btn-primary text-xs">
              {locale === "fr" ? "Mettre à jour la vue" : "Update view"}
            </button>
            <Link href="/digest" className="ha-btn-secondary text-xs">
              {locale === "fr" ? "Voir le bulletin et RSS" : "View digest & RSS"}
            </Link>
          </div>
          <p className="text-ha-muted text-xs">
            {locale === "fr"
              ? "La vue par défaut tient compte des éditions et reflète les changements entre captures archivées, et non des mises à jour en temps réel. Les éditions annuelles sont capturées le 1er janvier (UTC), et les captures ponctuelles sont étiquetées lorsqu’elles surviennent."
              : "The default view is edition-aware and reflects changes between archived captures, not real-time source updates. Annual editions are captured on Jan 01 (UTC), and ad-hoc captures are labeled when they occur."}
          </p>
        </form>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Fil des changements" : "Changes feed"}
        </h2>
        {!changes && (
          <div className="ha-callout">
            <h3 className="ha-callout-title">
              {locale === "fr" ? "Changements indisponibles" : "Changes unavailable"}
            </h3>
            <p className="mt-2 text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Le fil des changements n’a pas pu être chargé. Assurez-vous que le backend est accessible et que le suivi des changements est activé."
                : "The changes feed could not be loaded. Ensure the backend is reachable and change tracking is enabled."}
            </p>
          </div>
        )}

        {changes && !changes.enabled && (
          <div className="ha-callout">
            <p className="text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Le suivi des changements est actuellement désactivé sur le backend."
                : "Change tracking is currently disabled on the backend."}
            </p>
          </div>
        )}

        {changes && changes.enabled && !hasResults && (
          <div className="ha-callout">
            <p className="text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Aucun changement trouvé pour cette édition pour le moment. C’est attendu lors des premières captures ou lorsque le contenu n’a pas changé entre éditions."
                : "No changes found for this edition yet. This is expected during early captures or when content did not change between editions."}
            </p>
          </div>
        )}

        {changes && changes.enabled && hasResults && (
          <div className="space-y-3">
            {changes.results.map((event) => {
              const compareHref =
                event.fromSnapshotId && event.diffAvailable
                  ? `/compare?from=${event.fromSnapshotId}&to=${event.toSnapshotId}`
                  : null;
              const snapshotHref = `/snapshot/${event.toSnapshotId}`;
              return (
                <div key={event.changeId} className="ha-card space-y-2">
                  <div className="text-ha-muted flex flex-wrap items-center gap-2 text-xs">
                    <span className="ha-tag">{event.changeType}</span>
                    {event.highNoise ? (
                      <span className="ha-tag">
                        {locale === "fr" ? "Bruit élevé" : "High noise"}
                      </span>
                    ) : null}
                    <span>
                      {locale === "fr" ? "Capturé" : "Captured"}{" "}
                      {formatDate(locale, event.toCaptureTimestamp)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {event.sourceName ??
                        (locale === "fr" ? "Source archivée" : "Archived source")}
                    </h3>
                    <p className="text-ha-muted text-xs">
                      {event.summary ??
                        (locale === "fr" ? "Texte archivé mis à jour." : "Archived text updated.")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {compareHref ? (
                      <Link href={compareHref} className="ha-btn-secondary text-xs">
                        {locale === "fr" ? "Comparer les captures" : "Compare captures"}
                      </Link>
                    ) : null}
                    <Link href={snapshotHref} className="ha-btn-secondary text-xs">
                      {locale === "fr" ? "Voir la capture" : "View snapshot"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {changes && changes.enabled && totalPages > 1 && (
          <div className="text-ha-muted flex items-center justify-between text-xs">
            <span>
              {locale === "fr"
                ? `Page ${currentPage} sur ${totalPages}`
                : `Page ${currentPage} of ${totalPages}`}
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  className="ha-btn-secondary text-xs"
                  href={`/changes?source=${encodeURIComponent(
                    selectedSource,
                  )}&job=${selectedEdition?.jobId ?? ""}&page=${currentPage - 1}`}
                >
                  {locale === "fr" ? "Précédent" : "Previous"}
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  className="ha-btn-secondary text-xs"
                  href={`/changes?source=${encodeURIComponent(
                    selectedSource,
                  )}&job=${selectedEdition?.jobId ?? ""}&page=${currentPage + 1}`}
                >
                  {locale === "fr" ? "Suivant" : "Next"}
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
