import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

import { PageShell } from "@/components/layout/PageShell";
import { fetchArchiveStats, fetchUsageMetrics } from "@/lib/api";
import { localeToLanguageTag, type Locale } from "@/lib/i18n";
import { resolveLocale } from "@/lib/resolveLocale";

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

export default async function ImpactPage({
  params,
}: {
  params?: Promise<{ locale?: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const [statsRes, usageRes] = await Promise.allSettled([fetchArchiveStats(), fetchUsageMetrics()]);

  const stats = statsRes.status === "fulfilled" ? statsRes.value : null;
  const usage = usageRes.status === "fulfilled" ? usageRes.value : null;

  const now = new Date();
  const monthLabel = now.toLocaleDateString(localeToLanguageTag(locale), {
    year: "numeric",
    month: "long",
  });

  return (
    <PageShell
      eyebrow={locale === "fr" ? "Rapport d’impact" : "Impact report"}
      title={
        locale === "fr"
          ? `Rapport d’impact mensuel — ${monthLabel}`
          : `Monthly impact report — ${monthLabel}`
      }
      intro={
        locale === "fr"
          ? "Un aperçu mensuel léger de la couverture et de l’utilisation, conçu pour la transparence et la responsabilisation."
          : "A lightweight monthly snapshot of coverage and usage, designed for transparency and accountability."
      }
    >
      <section className="ha-home-hero space-y-4">
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
          {locale === "fr" ? "Mises à jour du projet" : "Project updates"}
        </h2>
        <p className="text-ha-muted text-sm leading-relaxed">
          {locale === "fr"
            ? "Les changements majeurs visibles publiquement (fonctionnalités, politiques, publications de jeux de données) sont consignés dans le journal des changements du projet."
            : "Major public-facing changes (features, policies, and dataset releases) are recorded in the project changelog."}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed">
          <Link href="/changelog" className="text-ha-accent font-medium hover:text-blue-700">
            {locale === "fr" ? "Voir le journal des changements" : "View the changelog"}
          </Link>
          .
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Notes de fiabilité" : "Reliability notes"}
        </h2>
        <p className="text-ha-muted text-sm leading-relaxed">
          {locale === "fr"
            ? "L’état du service et les métriques de couverture en direct sont disponibles sur la page Statut. Ce projet est encore en développement actif; des lacunes intermittentes de couverture ou de fidélité de relecture sont à prévoir à mesure que l’archive s’étend."
            : "Live service health and coverage metrics are available on the status page. This project is still in active development; intermittent gaps in coverage or replay fidelity are expected as the archive expands."}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed">
          <Link href="/status" className="text-ha-accent font-medium hover:text-blue-700">
            {locale === "fr" ? "Voir le statut et les métriques" : "View status & metrics"}
          </Link>
          .
        </p>
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
                ? "Les métriques d’utilisation sont actuellement indisponibles ou désactivées. Activez les décomptes agrégés dans le backend pour inclure cette section dans les futurs rapports."
                : "Usage metrics are currently unavailable or disabled. Enable aggregate counts in the backend to include this section in future reports."}
            </p>
          </div>
        )}
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Comment interpréter l’utilisation" : "How to interpret usage"}
        </h2>
        <p className="text-ha-muted text-sm leading-relaxed">
          {locale === "fr"
            ? "Les chiffres d’utilisation sont des totaux quotidiens agrégés (par exemple : recherches et vues de capture). Ils sont conçus comme un indicateur global d’intérêt et d’utilité, pas comme de l’analytique au niveau des utilisateurs."
            : "Usage numbers are aggregated daily totals (for example: searches and snapshot views). They are intended as a coarse indicator of interest and utility, not as user-level analytics."}
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Priorités à court terme" : "Near-term focus"}
        </h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>
            {locale === "fr"
              ? "Étendre la couverture à d’autres sources canadiennes de santé publique."
              : "Expand coverage across additional Canadian public health sources."}
          </li>
          <li>
            {locale === "fr"
              ? "Améliorer la fiabilité de relecture pour les pages complexes riches en JavaScript."
              : "Improve replay reliability for complex, JavaScript-heavy pages."}
          </li>
          <li>
            {locale === "fr"
              ? "Renforcer la documentation publique, la gouvernance et le soutien bilingue."
              : "Strengthen public-facing documentation, governance, and bilingual support."}
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Besoin de plus de détails?" : "Want more detail?"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Consultez la page Statut pour des métriques de couverture en direct."
              : "See the status page for live coverage metrics."}
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link href="/status" className="text-ha-accent font-medium hover:text-blue-700">
              {locale === "fr" ? "Voir le statut et les métriques" : "View status & metrics"}
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
