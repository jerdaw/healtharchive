import type { Metadata } from "next";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

import { PageShell } from "@/components/layout/PageShell";
import { getApiBaseUrl } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";
import { DATASET_RIGHTS_URL, getSiteCopy } from "@/lib/siteCopy";

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
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getResearchersCopy(locale);
  return buildPageMetadata(locale, "/researchers", copy.title, copy.intro);
}
export default async function ResearchersPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const copy = getResearchersCopy(locale);
  const siteCopy = getSiteCopy(locale);
  const apiBase = getApiBaseUrl();
  const exportsManifestUrl = `${apiBase}/api/exports`;
  const datasetReleasesUrl = "https://github.com/jerdaw/healtharchive-datasets/releases";

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      <section className="ha-content-section-lead space-y-5">
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

      <section className="ha-content-section space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Travailler avec l’archive" : "Working with the archive"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "L’explorateur d’archives et le visualiseur de captures soutiennent la recherche au sein du corpus existant et délimité. La couverture se limite aux sources, aux dates et aux captures réussies déjà archivées; certaines pages ou ressources peuvent manquer ou être incomplètes."
            : "The archive explorer and snapshot viewer support research within the existing, bounded corpus. Coverage is limited to selected sources, dates, and successful captures; some pages or assets may be missing or incomplete."}
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
          {locale === "fr" ? (
            <>
              Les questions visant à savoir si le corpus existant couvre une source ou une date
              peuvent être soumises par la page{" "}
              <Link className="ha-link" href="/contact">
                Contact
              </Link>{" "}
              pour évaluation. Cette prise de contact n’engage pas le projet à effectuer de
              nouvelles captures, à élargir la couverture ou à produire une exportation
              personnalisée.
            </>
          ) : (
            <>
              Questions about whether the existing corpus covers a source or date may be sent
              through the{" "}
              <Link className="ha-link" href="/contact">
                contact page
              </Link>{" "}
              for assessment. Contact does not commit the project to new capture work, broader
              coverage, or a custom export.
            </>
          )}
        </p>
      </section>

      <section className="ha-content-section space-y-5">
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
        <div className="ha-card-inset space-y-2">
          <p className="text-ha-muted">
            {locale === "fr" ? "Manifeste d’exportation" : "Export manifest"}
          </p>
          <a className="ha-link" href={exportsManifestUrl}>
            {exportsManifestUrl}
          </a>
        </div>
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Publications de jeux de données" : "Dataset releases"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {siteCopy.datasetReleases.status}
          </p>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {siteCopy.datasetReleases.rolloutStatus}
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link className="ha-link" href={datasetReleasesUrl}>
              {locale === "fr"
                ? "Publications de jeux de données HealthArchive"
                : "HealthArchive dataset releases"}
            </Link>
            {" · "}
            <Link className="ha-link" href={DATASET_RIGHTS_URL}>
              {siteCopy.datasetReleases.rightsLinkLabel}
            </Link>
          </p>
        </div>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Pour les définitions de champs et les limites, voir "
            : "For field definitions and limitations, see "}
          <Link className="ha-link" href="/exports">
            /exports
          </Link>
          .
        </p>
        <h3 className="ha-callout-title">
          {locale === "fr"
            ? "Renseignements pour une évaluation d’accès"
            : "Information for an access assessment"}
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
          <li>
            {locale === "fr"
              ? "Format existant souhaité (CSV ou JSONL), s’il y a lieu."
              : "Preferred existing format (CSV or JSONL), if relevant."}
          </li>
        </ul>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr" ? (
            <>
              Les questions sur les capacités existantes d’accès en lot ou d’exportation peuvent
              être soumises aux responsables du projet par la page{" "}
              <Link className="ha-link" href="/contact">
                Contact
              </Link>{" "}
              pour évaluation. Toute réponse dépend de la capacité disponible; aucune exportation
              personnalisée, nouvelle capture ou échéance de réponse n’est promise.
            </>
          ) : (
            <>
              Questions about existing bulk-access or export capabilities may be sent to the project
              maintainers through the{" "}
              <Link className="ha-link" href="/contact">
                contact page
              </Link>{" "}
              for assessment. Responses depend on available capacity; no custom export, new capture
              work, or response time is promised.
            </>
          )}
        </p>
      </section>

      <section className="ha-content-section space-y-5">
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
          <Link className="ha-link" href="/cite">
            /cite
          </Link>{" "}
          {locale === "fr"
            ? "pour un document partageable et des conseils de citation pour la vue de comparaison."
            : "for a shareable handout and compare-view citation guidance."}
        </p>
        <div lang="en" className="ha-card-inset space-y-1">
          HealthArchive.ca Project. “&lt;Page title&gt;” (snapshot from &lt; capture date/time&gt;).
          Archived copy of &lt;original agency&gt; web page (&lt;original URL&gt;). Accessed
          &lt;access date&gt;. Available from: &lt;HealthArchive.ca snapshot URL&gt;.
        </div>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Par exemple, pour une capture d’une mise à jour épidémiologique COVID‑19 :"
            : "For example, for a COVID-19 epidemiology update snapshot:"}
        </p>
        <div lang="en" className="ha-card-inset space-y-1">
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
    </PageShell>
  );
}
