import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

import { PageShell } from "@/components/layout/PageShell";
import { fetchArchiveStats, fetchHealth, fetchSources, fetchUsageMetrics } from "@/lib/api";
import { localeToLanguageTag, type Locale } from "@/lib/i18n";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";

function formatNumber(locale: Locale, value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat(localeToLanguageTag(locale)).format(value);
}

function formatDate(locale: Locale, value: string | null | undefined): string {
  if (!value) return locale === "fr" ? "Inconnu" : "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(localeToLanguageTag(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function StatusPage({
  params,
}: {
  params?: Promise<{ locale?: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const siteCopy = getSiteCopy(locale);

  const [healthRes, statsRes, sourcesRes, usageRes] = await Promise.allSettled([
    fetchHealth(),
    fetchArchiveStats(),
    fetchSources(),
    fetchUsageMetrics(),
  ]);

  const health = healthRes.status === "fulfilled" ? healthRes.value : null;
  const stats = statsRes.status === "fulfilled" ? statsRes.value : null;
  const sources = sourcesRes.status === "fulfilled" ? sourcesRes.value : null;
  const usage = usageRes.status === "fulfilled" ? usageRes.value : null;

  const hasAnyData = Boolean(health || stats || sources || usage);
  const statusLabel = !hasAnyData
    ? locale === "fr"
      ? "Indisponible"
      : "Unavailable"
    : health?.status === "ok"
      ? locale === "fr"
        ? "Opérationnel"
        : "Operational"
      : locale === "fr"
        ? "Dégradé"
        : "Degraded";

  const lastChecked = new Date().toLocaleString(localeToLanguageTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <PageShell
      eyebrow={locale === "fr" ? "Statut" : "Status"}
      title={locale === "fr" ? "Statut et métriques" : "Status & metrics"}
      intro={
        locale === "fr"
          ? "Une vue transparente de la couverture, de la fraîcheur et de l’état du service de HealthArchive.ca."
          : "A transparent view of HealthArchive.ca coverage, freshness, and service status."
      }
    >
      {!hasAnyData && (
        <div className="ha-callout">
          <h2 className="ha-callout-title">
            {locale === "fr" ? "Métriques en direct indisponibles" : "Live metrics unavailable"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "L’API du backend n’a pas pu être jointe. Cette page affichera des métriques en direct lorsque l’API sera disponible."
              : "The backend API could not be reached. This page will display live metrics when the API is available."}
          </p>
        </div>
      )}

      <section className="ha-home-hero space-y-4">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Statut actuel" : "Current status"}
        </h2>
        <div className="ha-card space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="ha-tag">{statusLabel}</span>
            <span className="text-ha-muted text-xs">
              {locale === "fr" ? "Dernière vérification :" : "Last checked:"} {lastChecked}
            </span>
          </div>
          <p className="text-ha-muted text-sm">
            {siteCopy.whatThisSiteIs.is}{" "}
            <span className="font-medium text-slate-800">{locale === "fr" ? "Pas :" : "Not:"}</span>{" "}
            {siteCopy.whatThisSiteIs.isNot}
          </p>
        </div>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Aperçu de la couverture" : "Coverage snapshot"}
        </h2>
        <div className="ha-grid-3">
          <div className="ha-card space-y-1">
            <p className="text-ha-muted text-xs">
              {locale === "fr" ? "Sources suivies" : "Sources tracked"}
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(locale, stats?.sourcesTotal ?? null)}
            </p>
          </div>
          <div className="ha-card space-y-1">
            <p className="text-ha-muted text-xs">{locale === "fr" ? "Captures" : "Snapshots"}</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(locale, stats?.snapshotsTotal ?? null)}
            </p>
          </div>
          <div className="ha-card space-y-1">
            <p className="text-ha-muted text-xs">
              {locale === "fr" ? "Pages uniques" : "Unique pages"}
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(locale, stats?.pagesTotal ?? null)}
            </p>
          </div>
        </div>
        <p className="text-ha-muted text-sm">
          {locale === "fr" ? "Date de la dernière capture :" : "Latest capture date:"}{" "}
          {formatDate(locale, stats?.latestCaptureDate ?? null)}.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Couverture par source" : "Per-source coverage"}
        </h2>
        <p className="text-ha-muted text-sm">
          {locale === "fr"
            ? "Les dates de première et dernière capture sont en UTC et reflètent les heures de capture d’archive, pas nécessairement la dernière mise à jour du contenu par la source."
            : "First/last capture dates are UTC and reflect archival capture times, not necessarily the last time a source updated its content."}
        </p>
        {sources && sources.length > 0 ? (
          <div className="ha-grid-2">
            {sources.map((source) => (
              <div key={source.sourceCode} className="ha-card space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{source.sourceName}</h3>
                  <span className="ha-tag">
                    {formatNumber(locale, source.recordCount)}{" "}
                    {locale === "fr" ? "captures" : "snapshots"}
                  </span>
                </div>
                <p className="text-ha-muted text-xs">
                  {locale === "fr" ? "Première capture :" : "First capture:"}{" "}
                  {formatDate(locale, source.firstCapture)}
                </p>
                <p className="text-ha-muted text-xs">
                  {locale === "fr" ? "Dernière capture :" : "Last capture:"}{" "}
                  {formatDate(locale, source.lastCapture)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {source.entryRecordId != null ? (
                    <Link
                      href={`/browse/${source.entryRecordId}`}
                      className="ha-btn-secondary text-xs"
                    >
                      {locale === "fr" ? "Parcourir le site archivé" : "Browse archived site"}
                    </Link>
                  ) : null}
                  <Link
                    href={`/archive?source=${encodeURIComponent(source.sourceCode)}`}
                    className="ha-btn-secondary text-xs"
                  >
                    {locale === "fr" ? "Parcourir les enregistrements" : "Browse records"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ha-callout">
            <p className="text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "La couverture par source est indisponible tant que l’API est hors service."
                : "Per-source coverage is unavailable while the API is down."}
            </p>
          </div>
        )}
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Aperçu de l’utilisation" : "Usage snapshot"}
        </h2>
        {usage?.enabled ? (
          <div className="ha-grid-2">
            <div className="ha-card space-y-1">
              <p className="text-ha-muted text-xs">
                {locale === "fr"
                  ? `Requêtes de recherche (${usage.windowDays} derniers jours)`
                  : `Search requests (last ${usage.windowDays} days)`}
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatNumber(locale, usage.totals.searchRequests)}
              </p>
            </div>
            <div className="ha-card space-y-1">
              <p className="text-ha-muted text-xs">
                {locale === "fr" ? "Vues de détails de capture" : "Snapshot detail views"}
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatNumber(locale, usage.totals.snapshotDetailViews)}
              </p>
            </div>
            <div className="ha-card space-y-1">
              <p className="text-ha-muted text-xs">
                {locale === "fr" ? "Vues de capture brute" : "Raw snapshot views"}
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatNumber(locale, usage.totals.rawSnapshotViews)}
              </p>
            </div>
            <div className="ha-card space-y-1">
              <p className="text-ha-muted text-xs">
                {locale === "fr" ? "Signalements soumis" : "Reports submitted"}
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatNumber(locale, usage.totals.reportSubmissions)}
              </p>
            </div>
          </div>
        ) : (
          <div className="ha-callout">
            <p className="text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Les métriques d’utilisation sont actuellement indisponibles ou désactivées. Activez les décomptes agrégés dans le backend pour afficher cette section."
                : "Usage metrics are currently unavailable or disabled. Enable aggregated usage counts in the backend to display this section."}
            </p>
          </div>
        )}
        <p className="text-ha-muted text-xs">
          {locale === "fr"
            ? "Les métriques d’utilisation sont des décomptes quotidiens agrégés, sans identifiants personnels."
            : "Usage metrics are aggregated daily counts with no personal identifiers."}
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Définitions des métriques" : "Metrics definitions"}
        </h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>
            {locale === "fr"
              ? "Les captures sont des pages individuelles capturées avec un horodatage."
              : "Snapshots are individual captured pages with a timestamped record."}
          </li>
          <li>
            {locale === "fr"
              ? "Les pages sont des groupes d’URL pouvant avoir plusieurs captures au fil du temps."
              : "Pages are URL groups that may have multiple snapshots over time."}
          </li>
          <li>
            {locale === "fr"
              ? "La date de dernière capture est un indicateur de fraîcheur et reflète l’heure de capture (UTC), pas l’heure de mise à jour de la source."
              : "Last capture date is a proxy for freshness and reflects archive capture time (UTC), not source update time."}
          </li>
          <li>
            {locale === "fr"
              ? "Les éditions annuelles sont capturées le 1er janvier (UTC). Les captures ponctuelles sont étiquetées lorsqu’elles surviennent."
              : "Annual editions are captured on Jan 01 (UTC). Ad-hoc captures are labeled when they occur."}
          </li>
          <li>
            {locale === "fr"
              ? "Les décomptes d’utilisation sont des totaux quotidiens agrégés (recherches, vues de capture, signalements)."
              : "Usage counts are aggregated daily totals (search requests, snapshot views, report submissions)."}
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Rapport d’impact mensuel" : "Monthly impact report"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Un court rapport mensuel résume la couverture, la fiabilité et les tendances d’utilisation."
              : "A short monthly report summarizes coverage, reliability, and usage trends."}
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link href="/impact" className="text-ha-accent font-medium hover:text-blue-700">
              {locale === "fr"
                ? "Voir le dernier rapport d’impact"
                : "View the latest impact report"}
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
