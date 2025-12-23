import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

import { PageShell } from "@/components/layout/PageShell";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";

export default async function BriefPage({
  params,
}: {
  params?: Promise<{ locale?: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const siteCopy = getSiteCopy(locale);

  return (
    <PageShell
      eyebrow={locale === "fr" ? "Fiche" : "Brief"}
      title={locale === "fr" ? "Fiche projet (une page)" : "One-page project brief"}
      intro={
        locale === "fr"
          ? "Un résumé adapté aux partenaires de ce qu’est HealthArchive.ca, de ce qu’il fait et de la façon de le décrire sans suggérer une approbation ni des directives médicales."
          : "A partner-friendly summary of what HealthArchive.ca is, what it does, and how to describe it without implying endorsement or medical guidance."
      }
    >
      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">{locale === "fr" ? "En bref" : "At a glance"}</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {siteCopy.mission.line1}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Il s’agit d’un dossier d’archives et d’un outil de suivi des changements. Ce ne sont pas des directives actuelles et ce n’est pas un avis médical."
            : "This is an archival record and change-tracking tool. It is not current guidance and not medical advice."}
        </p>
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Télécharger / imprimer" : "Download / print"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr" ? (
              <>
                <a
                  className="text-ha-accent font-medium hover:text-blue-700"
                  href="/partner-kit/healtharchive-brief.fr.md"
                >
                  Télécharger cette fiche (Markdown, alpha)
                </a>{" "}
                ·{" "}
                <a
                  className="text-ha-accent font-medium hover:text-blue-700"
                  href="/partner-kit/healtharchive-brief.md"
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
                  href="/partner-kit/healtharchive-brief.md"
                >
                  Download this brief (Markdown)
                </a>{" "}
                or use your browser’s print dialog to save as PDF.
              </>
            )}
          </p>
        </div>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Ce que fait le projet" : "What it does"}
        </h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "Capture des pages Web de santé publique sélectionnées, horodatées."
              : "Captures time-stamped snapshots of selected public health web pages."}
          </li>
          <li>
            {locale === "fr"
              ? "Indexe les captures dans une archive consultable."
              : "Indexes snapshots into a searchable archive."}
          </li>
          <li>
            {locale === "fr"
              ? "Fournit un suivi descriptif des changements entre éditions archivées : fil de changements, vues de comparaison et flux RSS."
              : "Provides descriptive change tracking between archived editions: a changes feed, compare views, and RSS feeds."}
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Ce que ce n’est pas" : "What it is not"}
        </h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "Pas une source de directives actuelles."
              : "Not a source of current guidance."}
          </li>
          <li>{locale === "fr" ? "Pas un avis médical." : "Not medical advice."}</li>
          <li>
            {locale === "fr"
              ? "Pas un site gouvernemental officiel."
              : "Not an official government website."}
          </li>
          <li>
            {locale === "fr"
              ? "Pas affilié à, endossé par, ni associé à l’Agence de la santé publique du Canada, à Santé Canada, ni à aucun organisme gouvernemental."
              : "Not affiliated with, endorsed by, or associated with PHAC, Health Canada, or any government agency."}
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Publics visés" : "Intended audiences"}
        </h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            <strong>
              {locale === "fr" ? "Chercheurs et stagiaires :" : "Researchers and trainees:"}
            </strong>{" "}
            {locale === "fr"
              ? "citations reproductibles et contexte historique."
              : "reproducible citations and historical context."}
          </li>
          <li>
            <strong>
              {locale === "fr"
                ? "Journalistes et communicateurs scientifiques :"
                : "Journalists and science communicators:"}
            </strong>{" "}
            {locale === "fr"
              ? "chronologies et changements de formulation."
              : "timelines and wording changes."}
          </li>
          <li>
            <strong>{locale === "fr" ? "Éducateurs :" : "Educators:"}</strong>{" "}
            {locale === "fr"
              ? "enseignement de l’évolution de la communication des preuves au fil du temps."
              : "teaching how evidence communication evolves over time."}
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">{locale === "fr" ? "Liens clés" : "Key links"}</h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr" ? "Accueil" : "Home"}:{" "}
            <a
              className="text-ha-accent font-medium hover:text-blue-700"
              href="https://www.healtharchive.ca/"
            >
              https://www.healtharchive.ca/
            </a>
          </li>
          <li>
            {locale === "fr" ? "Recherche dans l’archive" : "Archive search"}:{" "}
            <Link className="text-ha-accent font-medium hover:text-blue-700" href="/archive">
              /archive
            </Link>
          </li>
          <li>
            {locale === "fr" ? "Fil des changements" : "Changes feed"}:{" "}
            <Link className="text-ha-accent font-medium hover:text-blue-700" href="/changes">
              /changes
            </Link>
          </li>
          <li>
            {locale === "fr" ? "Bulletin et RSS" : "Digest + RSS"}:{" "}
            <Link className="text-ha-accent font-medium hover:text-blue-700" href="/digest">
              /digest
            </Link>
          </li>
          <li>
            {locale === "fr" ? "Méthodes et portée" : "Methods and scope"}:{" "}
            <Link className="text-ha-accent font-medium hover:text-blue-700" href="/methods">
              /methods
            </Link>
          </li>
          <li>
            {locale === "fr" ? "Gouvernance et politiques" : "Governance and policies"}:{" "}
            <Link className="text-ha-accent font-medium hover:text-blue-700" href="/governance">
              /governance
            </Link>
          </li>
          <li>
            {locale === "fr" ? "Statut et métriques" : "Status and metrics"}:{" "}
            <Link className="text-ha-accent font-medium hover:text-blue-700" href="/status">
              /status
            </Link>
          </li>
          <li>
            {locale === "fr" ? "Rapport d’impact mensuel" : "Monthly impact report"}:{" "}
            <Link className="text-ha-accent font-medium hover:text-blue-700" href="/impact">
              /impact
            </Link>
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr"
            ? "Posture de sécurité (langage simple)"
            : "Safety posture (plain-language)"}
        </h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "Le contenu archivé peut être incomplet, périmé ou remplacé."
              : "Archived content can be incomplete, outdated, or superseded."}
          </li>
          <li>
            {locale === "fr"
              ? "Le suivi des changements est descriptif seulement et n’interprète pas le sens."
              : "Change tracking is descriptive only and does not interpret meaning."}
          </li>
          <li>{siteCopy.whatThisSiteIs.forCurrent}.</li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Contact et signalements" : "Contact and reporting"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Pour collaboration, rétroaction, pages manquantes ou corrections, utilisez la page Contact ou soumettez un signalement."
              : "For collaboration, feedback, missing pages, or corrections, use the contact page or submit an issue report."}
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link href="/contact" className="text-ha-accent font-medium hover:text-blue-700">
              {locale === "fr" ? "Contact" : "Contact"}
            </Link>{" "}
            ·{" "}
            <Link href="/report" className="text-ha-accent font-medium hover:text-blue-700">
              {locale === "fr" ? "Signaler un problème" : "Report an issue"}
            </Link>
          </p>
        </div>
      </section>
    </PageShell>
  );
}
