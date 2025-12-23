import type { Metadata } from "next";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

import { PageShell } from "@/components/layout/PageShell";
import { getApiBaseUrl } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";

function getResearchersCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: "Pour les chercheurs",
      title: "Utiliser HealthArchive.ca pour la recherche et l’analyse",
      intro:
        "Ce projet est conçu pour que les épidémiologistes, chercheurs en services de santé, analystes de politiques et journalistes de données puissent reconstituer de façon fiable ce que les sites canadiens de santé publique montraient à des moments précis.",
    };
  }

  return {
    eyebrow: "For researchers",
    title: "Using HealthArchive.ca for research and analysis",
    intro:
      "This project is being designed so that epidemiologists, health services researchers, policy analysts, and data journalists can reliably reconstruct what Canadian public health sites showed at specific points in time.",
  };
}

export async function generateMetadata({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getResearchersCopy(locale);
  return buildPageMetadata(locale, "/researchers", copy.title, copy.intro);
}
export default async function ResearchersPage({
  params,
}: {
  params?: Promise<{ locale: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const copy = getResearchersCopy(locale);
  const apiBase = getApiBaseUrl();
  const exportsManifestUrl = `${apiBase}/api/exports`;

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr"
            ? "Exemples de cas d’usage en recherche"
            : "Examples of research use cases"}
        </h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr" ? (
              <>
                <strong>Historique des politiques et lignes directrices :</strong> Suivre
                l’évolution des directives de santé publique sur des sujets comme la vaccination
                contre la COVID‑19, la grippe saisonnière ou la distribution de naloxone.
              </>
            ) : (
              <>
                <strong>Policy and guideline history:</strong> Tracking how public health guidance
                on subjects such as COVID-19 vaccination, seasonal influenza, or naloxone
                distribution has changed over time.
              </>
            )}
          </li>
          <li>
            {locale === "fr" ? (
              <>
                <strong>Reproductibilité des analyses :</strong> Relier un travail analytique au
                libellé exact et aux tableaux visibles à une date donnée, plutôt que de dépendre de
                la version actuelle d’une page.
              </>
            ) : (
              <>
                <strong>Reproducibility of analyses:</strong> Linking analytic work to the exact
                wording and tables visible on a given date, rather than relying on whatever the
                current version of a page shows.
              </>
            )}
          </li>
          <li>
            {locale === "fr" ? (
              <>
                <strong>Études médiatiques et de communication :</strong> Examiner comment la
                communication des risques, les avertissements ou l’attention à certaines populations
                ont évolué au fil des périodes.
              </>
            ) : (
              <>
                <strong>Media and communication studies:</strong> Examining how risk communication,
                disclaimers, or focus on specific populations evolved across different periods.
              </>
            )}
          </li>
          <li>
            {locale === "fr" ? (
              <>
                <strong>Audit et responsabilité :</strong> Comparer le contenu archivé à des
                messages ultérieurs pour comprendre des changements d’accent, de cadrage ou de
                portée.
              </>
            ) : (
              <>
                <strong>Audit and accountability:</strong> Comparing archived content with later
                messaging to understand shifts in emphasis, framing, or scope.
              </>
            )}
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Travailler avec l’archive" : "Working with the archive"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "L’explorateur d’archives et le visualiseur de captures sont conçus pour soutenir des flux de recherche, mais l’interface évolue encore. La couverture s’élargit, et certaines pages peuvent manquer ou être incomplètes."
            : "The archive explorer and snapshot viewer are designed to support research workflows, but the interface is still evolving. Coverage is expanding, and some pages may be missing or incomplete."}
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "Recherche par mots‑clés avec filtres par source."
              : "Keyword search with filters by source."}
          </li>
          <li>
            {locale === "fr"
              ? "Une vue « pages » (dernière capture par URL) et une vue « captures » (toutes les captures)."
              : "A pages view (latest capture per URL) and a snapshots view (all captures)."}
          </li>
          <li>
            {locale === "fr"
              ? "Une vue « parcourir par source » résumant la couverture de chaque source."
              : "A “browse by source” view summarizing coverage for each source."}
          </li>
          <li>
            {locale === "fr"
              ? "Des pages de détail de capture avec métadonnées et HTML archivé lorsque disponible."
              : "Snapshot detail pages with capture metadata and the archived HTML when available."}
          </li>
          <li>
            {locale === "fr"
              ? "Des vues de suivi des changements et de comparaison qui mettent en évidence des différences textuelles descriptives entre captures archivées."
              : "Change tracking and compare views that highlight descriptive text differences between archived captures."}
          </li>
        </ul>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Si vous avez besoin d’un accès en lot, d’exportations reproductibles ou d’une couverture de captures spécifique pour une étude, veuillez nous contacter via la page Contact."
            : "If you need bulk access, reproducible exports, or specific capture coverage for a study, please reach out via the contact page."}
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr"
            ? "Accès pour la recherche et exportations"
            : "Research access & exports"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "HealthArchive fournit des exportations de métadonnées uniquement, destinées à la recherche. Les exportations n’incluent pas le HTML brut ni les corps de diff complets."
            : "HealthArchive provides metadata-only exports for research. Exports do not include raw HTML or full diff bodies."}
        </p>
        <div className="ha-card ha-home-panel space-y-2 p-4 text-xs text-slate-800 sm:p-5 sm:text-sm">
          <p className="text-ha-muted">
            {locale === "fr" ? "Manifeste d’exportation" : "Export manifest"}
          </p>
          <a className="text-ha-accent font-medium hover:text-blue-700" href={exportsManifestUrl}>
            {exportsManifestUrl}
          </a>
        </div>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Pour les définitions de champs et les limites, voir "
            : "For field definitions and limitations, see "}
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/exports">
            /exports
          </Link>
          .
        </p>
        <h3 className="text-sm font-semibold text-slate-900">
          {locale === "fr" ? "Liste de vérification pour une demande" : "Request checklist"}
        </h3>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "Sources et plages de dates nécessaires."
              : "Sources and date ranges needed."}
          </li>
          <li>
            {locale === "fr"
              ? "Regroupement au niveau capture vs page."
              : "Snapshot-level vs page-level grouping."}
          </li>
          <li>
            {locale === "fr"
              ? "Changements entre éditions vs au sein d’une même édition."
              : "Edition-to-edition vs within-edition changes."}
          </li>
          <li>
            {locale === "fr"
              ? "Usage prévu (article, projet de cours, journalisme)."
              : "Intended use (paper, class project, journalism)."}
          </li>
        </ul>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Pour des exportations en lot ou des demandes personnalisées, contactez les responsables du projet."
            : "For bulk exports or custom requests, contact the project maintainers."}
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Citer HealthArchive.ca" : "Citing HealthArchive.ca"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "Des conseils de citation sont disponibles sur la page de citation. Un format pragmatique pour référencer une page archivée depuis HealthArchive.ca est :"
            : "Citation guidance is available on the cite page. A pragmatic format for referencing an archived page from HealthArchive.ca is:"}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr" ? "Voir " : "See "}
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/cite">
            /cite
          </Link>{" "}
          {locale === "fr"
            ? "pour un document partageable et des conseils de citation pour la vue de comparaison."
            : "for a shareable handout and compare-view citation guidance."}
        </p>
        <div
          lang="en"
          className="ha-card ha-home-panel space-y-1 p-4 text-xs text-slate-800 sm:p-5 sm:text-sm"
        >
          HealthArchive.ca Project. “&lt;Page title&gt;” (snapshot from &lt; capture date/time&gt;).
          Archived copy of &lt;original agency&gt; web page (&lt;original URL&gt;). Accessed
          &lt;access date&gt;. Available from: &lt;HealthArchive.ca snapshot URL&gt;.
        </div>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Par exemple, pour une capture d’une mise à jour épidémiologique COVID‑19 :"
            : "For example, for a COVID-19 epidemiology update snapshot:"}
        </p>
        <div
          lang="en"
          className="ha-card ha-home-panel space-y-1 p-4 text-xs text-slate-800 sm:p-5 sm:text-sm"
        >
          HealthArchive.ca Project. “COVID-19 epidemiology update: Canada” (snapshot from 15 Feb
          2025). Archived copy of Public Health Agency of Canada web page
          (https://www.canada.ca/...). Accessed 3 Dec 2025. Available from:
          https://healtharchive.ca/snapshot/12345.
        </div>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Les URL de capture dans l’archive en direct utilisent généralement un identifiant numérique (comme dans l’exemple ci-dessus). Pour citer, utilisez l’URL exacte de la capture et la date/heure de capture affichées sur la page de détail de la capture que vous avez consultée."
            : "Snapshot URLs in the live archive typically use a numeric ID (as in the example above). When citing, use the exact snapshot URL and capture date/time shown on the snapshot detail page you accessed."}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Lors de la citation d’une comparaison, incluez les deux URL de capture (A et B), leurs dates de capture, ainsi que l’URL de comparaison HealthArchive."
            : "When citing a comparison, include both snapshot URLs (A and B), their capture dates, and the HealthArchive compare URL."}
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr"
              ? "Fonctionnalités prévues pour la recherche (pas encore mises en œuvre)"
              : "Planned researcher-focused capabilities (not yet implemented)"}
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed sm:text-sm">
            <li>
              {locale === "fr"
                ? "Versions de jeux de données (mensuelles ou trimestrielles) avec sommes de contrôle."
                : "Versioned dataset releases (monthly or quarterly) with checksums."}
            </li>
            <li>
              {locale === "fr"
                ? "Exportations personnalisées plus volumineuses préparées hors ligne pour des études ou projets de cours."
                : "Larger custom exports prepared offline for specific studies or course projects."}
            </li>
          </ul>
          {/* TODO: add dataset release cadence + bulk export workflow once stable. */}
        </div>
      </section>
    </PageShell>
  );
}
