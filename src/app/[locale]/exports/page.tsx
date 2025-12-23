import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

import { PageShell } from "@/components/layout/PageShell";
import { getApiBaseUrl } from "@/lib/api";
import { resolveLocale } from "@/lib/resolveLocale";

export default async function ExportsPage({
  params,
}: {
  params?: Promise<{ locale?: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const apiBase = getApiBaseUrl();
  const manifestUrl = `${apiBase}/api/exports`;
  const datasetReleasesUrl = "https://github.com/jerdaw/healtharchive-datasets/releases";

  return (
    <PageShell
      eyebrow={locale === "fr" ? "Exports" : "Exports"}
      title={
        locale === "fr"
          ? "Exports de recherche et dictionnaire de données"
          : "Research exports & data dictionary"
      }
      intro={
        locale === "fr"
          ? "HealthArchive fournit des exports de métadonnées (sans HTML brut) pour la recherche et la reproductibilité. Les exports n’incluent pas l’HTML brut ni le corps complet des diffs."
          : "HealthArchive provides metadata-only exports for research and reproducibility. Exports do not include raw HTML or full diff bodies."
      }
    >
      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Aperçu des exports" : "Exports overview"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "Utilisez le manifeste des exports pour découvrir les formats et limites disponibles."
            : "Use the export manifest to discover available formats and limits."}
        </p>
        <div className="ha-card ha-home-panel space-y-2 p-4 text-xs text-slate-800 sm:p-5 sm:text-sm">
          <p className="text-ha-muted">
            {locale === "fr" ? "Manifeste des exports" : "Export manifest"}
          </p>
          <a className="text-ha-accent font-medium hover:text-blue-700" href={manifestUrl}>
            {manifestUrl}
          </a>
        </div>
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Publications de jeux de données" : "Dataset releases"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Des publications trimestrielles de jeux de données (métadonnées seulement) sont publiées sur GitHub avec des sommes de contrôle."
              : "Quarterly metadata-only dataset releases are published on GitHub with checksums."}
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link
              className="text-ha-accent font-medium hover:text-blue-700"
              href={datasetReleasesUrl}
            >
              {locale === "fr"
                ? "Publications de jeux de données HealthArchive"
                : "HealthArchive dataset releases"}
            </Link>
          </p>
        </div>
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Télécharger / imprimer" : "Download / print"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr" ? (
              <>
                <a
                  className="text-ha-accent font-medium hover:text-blue-700"
                  href="/exports/healtharchive-data-dictionary.fr.md"
                >
                  Télécharger le dictionnaire de données (Markdown, alpha)
                </a>{" "}
                ·{" "}
                <a
                  className="text-ha-accent font-medium hover:text-blue-700"
                  href="/exports/healtharchive-data-dictionary.md"
                >
                  Version anglaise (officielle)
                </a>{" "}
                · ou utilisez la boîte de dialogue d’impression de votre navigateur pour enregistrer
                en PDF.
              </>
            ) : (
              <>
                <a
                  className="text-ha-accent font-medium hover:text-blue-700"
                  href="/exports/healtharchive-data-dictionary.md"
                >
                  Download the data dictionary (Markdown)
                </a>{" "}
                or use your browser’s print dialog to save as PDF.
              </>
            )}
          </p>
        </div>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Export des captures (champs)" : "Snapshots export (fields)"}
        </h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            <strong>snapshot_id</strong>:{" "}
            {locale === "fr" ? "ID numérique de capture." : "numeric snapshot ID."}
          </li>
          <li>
            <strong>source_code / source_name</strong>:{" "}
            {locale === "fr" ? "identifiants de source." : "source identifiers."}
          </li>
          <li>
            <strong>captured_url</strong>:{" "}
            {locale === "fr" ? "URL capturée au moment du crawl." : "URL captured at crawl time."}
          </li>
          <li>
            <strong>normalized_url_group</strong>:{" "}
            {locale === "fr" ? "clé de regroupement canonique." : "canonical grouping key."}
          </li>
          <li>
            <strong>capture_timestamp_utc</strong>:{" "}
            {locale === "fr" ? "horodatage UTC (ISO-8601)." : "UTC timestamp (ISO-8601)."}
          </li>
          <li>
            <strong>language</strong>, <strong>status_code</strong>, <strong>mime_type</strong>,
            <strong>title</strong>:{" "}
            {locale === "fr" ? "métadonnées lorsque disponibles." : "metadata when available."}
          </li>
          <li>
            <strong>job_id / job_name</strong>:{" "}
            {locale === "fr"
              ? "ancre d’édition (si disponible)."
              : "edition anchor (if available)."}
          </li>
          <li>
            <strong>snapshot_url</strong>:{" "}
            {locale === "fr"
              ? "URL publique stable pour citation."
              : "stable public URL for citation."}
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Export des changements (champs)" : "Changes export (fields)"}
        </h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            <strong>change_id</strong>:{" "}
            {locale === "fr"
              ? "ID numérique d’événement de changement."
              : "numeric change event ID."}
          </li>
          <li>
            <strong>source_code / source_name</strong>, <strong>normalized_url_group</strong>.
          </li>
          <li>
            <strong>from_snapshot_id / to_snapshot_id</strong>{" "}
            {locale === "fr"
              ? "et horodatages UTC correspondants."
              : "and corresponding UTC timestamps."}
          </li>
          <li>
            <strong>change_type</strong>, <strong>summary</strong>, section/line counts, and change
            {locale === "fr" ? " ratio de changement." : " ratio."}
          </li>
          <li>
            {locale === "fr" ? "indicateurs " : ""}
            <strong>high_noise</strong>
            {locale === "fr" ? " et " : " and "}
            <strong>diff_truncated</strong>
            {locale === "fr" ? "." : " flags."}
          </li>
          <li>
            <strong>diff_version</strong>, <strong>normalization_version</strong>,{" "}
            <strong>computed_at_utc</strong>.
          </li>
          <li>
            <strong>compare_url</strong>:{" "}
            {locale === "fr"
              ? "URL publique stable pour la vue de diff."
              : "stable public URL for the diff view."}
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">{locale === "fr" ? "Limites" : "Limitations"}</h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "Les exports reflètent le contenu capturé, pas des mises à jour en temps réel."
              : "Exports reflect captured content, not real-time source updates."}
          </li>
          <li>
            {locale === "fr"
              ? "La couverture est limitée aux sources dans le périmètre et aux captures réussies."
              : "Coverage is limited to in-scope sources and successful captures."}
          </li>
          <li>
            {locale === "fr"
              ? "La fidélité de relecture varie selon le site et le type d’actif."
              : "Replay fidelity varies by site and asset type."}
          </li>
        </ul>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Pour des exports en lot ou sur mesure, voir la "
            : "For bulk or custom exports, see the "}{" "}
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/researchers">
            {locale === "fr" ? "page Recherche" : "researchers page"}
          </Link>{" "}
          {locale === "fr" ? "pour le processus de demande." : "for the request workflow."}
        </p>
      </section>
    </PageShell>
  );
}
