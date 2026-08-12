import type { Metadata } from "next";

import { PageShell } from "@/components/layout/PageShell";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";

function getMethodsCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: "Méthodes et couverture",
      title: "Comment HealthArchive.ca est développé",
      intro:
        "Cette page décrit comment les instantanés du corpus actuel de contenu Web de santé publique de HealthArchive.ca ont été capturés et sont préservés, indexés et relus. La couverture est limitée au corpus existant; toute future capture ou extension nécessite une décision de continuité des données autorisée séparément.",
    };
  }

  return {
    eyebrow: "Methods & coverage",
    title: "How HealthArchive.ca is being built",
    intro:
      "This page outlines how snapshots in HealthArchive.ca’s current public health web corpus were captured and are preserved, indexed, and replayed. Coverage is bounded to the existing corpus; any future capture or expansion requires a separately authorized data-continuity decision.",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getMethodsCopy(locale);
  return buildPageMetadata(locale, "/methods", copy.title, copy.intro);
}

export default async function MethodsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const copy = getMethodsCopy(locale);

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      <section className="ha-content-section-lead space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Portée actuelle de l’archive" : "Current archive scope"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "La phase initiale se concentre sur des sites fédéraux canadiens de santé publique dont le contenu soutient directement les directives cliniques, la surveillance ou des communications publiques à fort impact. Exemples :"
            : "The initial focus is on federal Canadian public health sites whose content directly underpins clinical guidance, surveillance, or high-impact public communication. Examples include:"}
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "Agence de la santé publique du Canada (p. ex. pages sur les maladies, rapports de surveillance, directives d’immunisation)."
              : "Public Health Agency of Canada (e.g., disease pages, surveillance reports, immunization guidance)."}
          </li>
          <li>
            {locale === "fr"
              ? "Santé Canada (p. ex. pages sur les vaccins et les médicaments, informations sur la sécurité environnementale et des produits)."
              : "Health Canada (e.g., vaccine and drug pages, environmental and product safety information)."}
          </li>
        </ul>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Les sources provinciales, territoriales et internationales se trouvent hors de la portée actuelle. L’examen de toute source supplémentaire nécessiterait une décision de continuité des données autorisée séparément; aucune extension n’est présumée."
            : "Provincial, territorial, and international sources are outside the current scope. Considering any additional source would require a separately authorized data-continuity decision; no expansion is assumed."}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "La portée est volontairement limitée et définie, source par source, par des règles explicites d’inclusion et d’exclusion afin que le projet privilégie une provenance fiable plutôt que l’ampleur."
            : "Scope is intentionally constrained and defined with explicit inclusion and exclusion rules per source so the project can prioritize reliable provenance over breadth."}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Le corpus existant comprend des éditions annuelles étiquetées et, lorsque pertinent, des captures ponctuelles explicitement étiquetées. Il n’existe aucune cadence de capture future par défaut : toute nouvelle campagne annuelle ou ponctuelle nécessite une décision de continuité des données autorisée séparément."
            : "The existing corpus includes labeled annual editions and, where applicable, explicitly labeled ad-hoc captures. There is no default future capture cadence: any new annual or ad-hoc campaign requires a separately authorized data-continuity decision."}
        </p>
      </section>

      <section className="ha-content-section space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Méthodes de capture" : "Capture methods"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "HealthArchive.ca utilise une exploration Web basée sur un navigateur et des formats d’archives Web normalisés (WARC). À haut niveau, chaque capture fonctionne ainsi :"
            : "HealthArchive.ca uses browser-based crawling and standards-based web archive formats (WARCs). At a high level, each capture works as follows:"}
        </p>
        <ol className="text-ha-muted list-decimal space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "Des URL de départ sont définies pour chaque domaine et chemin cibles, avec des règles précises sur ce qu’il faut inclure ou exclure."
              : "Seed URLs are defined for each target domain and path, including rules about what to include or exclude."}
          </li>
          <li>
            {locale === "fr"
              ? "Un robot d’exploration basé sur un navigateur visite les pages dans le périmètre, exécute JavaScript lorsque nécessaire et enregistre les réponses dans des fichiers d’archives Web."
              : "A browser-based crawler visits in-scope pages, executes JavaScript where needed, and records responses into web archive files."}
          </li>
          <li>
            {locale === "fr"
              ? "Les réponses sont stockées dans des fichiers d’archives avec des métadonnées telles que l’heure de capture, le statut HTTP et le type de contenu."
              : "Responses are stored in archive files alongside metadata such as capture time, HTTP status, and content type."}
          </li>
        </ol>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Les captures sont stockées dans des WARC et indexées dans une base de données consultable. Le site public relit le HTML archivé via le backend et, lorsque disponible, peut offrir une navigation de meilleure fidélité via un service de relecture. La fidélité de relecture varie selon le site et le type de contenu."
            : "Captures are stored in WARCs and indexed into a searchable database. The public site replays archived HTML via the backend and, when available, can also offer higher-fidelity browsing through a replay service. Replay fidelity varies by site and content type."}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Les filtres de plage de dates dans l’explorateur d’archives utilisent des dates de capture en UTC."
            : "Date range filters in the archive explorer use UTC capture dates."}
        </p>
      </section>

      <section className="ha-content-section space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Stockage et relecture" : "Storage & replay"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "L’archive s’appuie sur un stockage dédié pour les fichiers WARC. Lorsque la relecture est activée, un moteur tel que pywb peut rendre des instantanés historiques de meilleure fidélité dans un navigateur. Les objectifs de la relecture sont :"
            : "The archive relies on dedicated storage for WARC files. When replay is enabled, a replay engine such as pywb can render higher-fidelity historical snapshots in a browser. The goals for replay are:"}
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "Préserver la structure des URL originales lorsque possible."
              : "Preserve the original URL structure where possible."}
          </li>
          <li>
            {locale === "fr"
              ? "Étiqueter clairement les horodatages de capture et rendre évident que la vue est archivistique, pas en direct."
              : "Clearly label capture timestamps and make it obvious that the view is archival, not live."}
          </li>
          <li>
            {locale === "fr"
              ? "Conserver les éléments interactifs (p. ex. tableaux de bord) aussi fidèlement que les contraintes techniques le permettent."
              : "Maintain interactive elements (e.g., dashboards) as faithfully as technical constraints allow."}
          </li>
        </ul>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "L’interface est volontairement conservatrice : elle privilégie la clarté que vous consultez du contenu archivé. Certains tableaux de bord interactifs, visualisations intégrées ou ressources tierces peuvent ne pas se relire parfaitement en raison de contraintes JavaScript, d’API ou d’hébergement."
            : "The interface is intentionally conservative: it prioritizes clarity that you are viewing archived content. Some interactive dashboards, embedded visualizations, or third-party assets may not replay perfectly because of JavaScript, API, or hosting constraints."}
        </p>
      </section>

      <section className="ha-content-section space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Suivi des changements" : "Change tracking"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "HealthArchive.ca compare des captures archivées afin de mettre en évidence les changements de texte entre éditions. Cela est conçu pour la vérifiabilité et la citation, et non pour l’interprétation."
            : "HealthArchive.ca compares archived captures to highlight text changes between editions. This is designed for auditability and citation, not interpretation."}
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "Les changements sont calculés à partir de captures HTML archivées."
              : "Changes are computed from archived HTML captures."}
          </li>
          <li>
            {locale === "fr"
              ? "Les comparaisons sont uniquement descriptives (par exemple : sections ajoutées, retirées ou mises à jour) et ne fournissent pas de recommandations."
              : "Comparisons are descriptive only (for example: sections added, removed, or updated) and do not provide guidance."}
          </li>
          <li>
            {locale === "fr"
              ? "Les flux de changements tiennent compte des éditions par défaut et reflètent les éditions étiquetées du corpus existant, sans engagement envers une future cadence annuelle."
              : "Change feeds are edition-aware by default and reflect labeled editions in the existing corpus rather than committing to a future annual cadence."}
          </li>
        </ul>
      </section>

      <section className="ha-content-section space-y-5">
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Limites et interprétation" : "Limitations and interpretation"}
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed sm:text-sm">
            <li>
              {locale === "fr" ? (
                <>
                  <strong>Pas des directives officielles :</strong> Le contenu archivé reflète ce
                  que les sites publics montraient au moment de la capture. Il peut être incomplet,
                  périmé ou remplacé, et ne doit pas être traité comme des directives cliniques
                  actuelles ni comme un avis médical.
                </>
              ) : (
                <>
                  <strong>Not official guidance:</strong> Archived content reflects what public
                  sites showed at the time of capture. It may be incomplete, outdated, or
                  superseded, and should not be treated as current clinical guidance or medical
                  advice.
                </>
              )}
            </li>
            <li>
              {locale === "fr" ? (
                <>
                  <strong>Échantillonnage et couverture :</strong> Les premières phases se
                  concentrent sur des domaines et des chemins spécifiques à forte valeur. Les
                  lacunes de couverture et les limites connues seront documentées afin que l’«
                  absence » d’une page archivée ne soit pas mal interprétée.
                </>
              ) : (
                <>
                  <strong>Sampling and coverage:</strong> Early phases focus on specific high-value
                  domains and paths. Coverage gaps and known limitations will be documented so that
                  “absence” of an archived page is not misinterpreted.
                </>
              )}
            </li>
            <li>
              {locale === "fr" ? (
                <>
                  <strong>Artefacts techniques :</strong> Certains tableaux de bord interactifs,
                  visualisations intégrées ou ressources tierces peuvent ne pas se relire
                  parfaitement en raison de contraintes JavaScript, d’API ou d’hébergement.
                </>
              ) : (
                <>
                  <strong>Technical artefacts:</strong> Some interactive dashboards, embedded
                  visualizations, or third-party assets may not replay perfectly because of
                  JavaScript, API, or hosting constraints.
                </>
              )}
            </li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
