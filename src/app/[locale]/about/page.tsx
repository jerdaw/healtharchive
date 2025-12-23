import { PageShell } from "@/components/layout/PageShell";
import { resolveLocale } from "@/lib/resolveLocale";

export default async function AboutPage({
  params,
}: {
  params?: Promise<{ locale: string }>;
} = {}) {
  const locale = await resolveLocale(params);

  return (
    <PageShell
      eyebrow={locale === "fr" ? "À propos du projet" : "About the project"}
      title={locale === "fr" ? "Pourquoi HealthArchive.ca existe" : "Why HealthArchive.ca exists"}
      intro={
        locale === "fr"
          ? "Ce projet est né de la préoccupation que des informations essentielles de santé publique peuvent changer discrètement ou disparaître en ligne. L’objectif est de créer un dossier indépendant, transparent et citable de ce qui a été publié, et à quel moment."
          : "This project grew out of concern that critical public health information can quietly change or disappear online. The goal is to create an independent, transparent, citable record of what was published and when."
      }
    >
      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">{locale === "fr" ? "Motivation" : "Motivation"}</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "Les cliniciens, les professionnels de santé publique, les chercheurs, les journalistes et le public s’appuient sur les sites Web gouvernementaux pour obtenir des directives et des données. Lorsque le contenu Web est mis à jour, déplacé ou retiré, il peut devenir difficile de reconstituer l’information qui était disponible à un moment précis."
            : "Clinicians, public health practitioners, researchers, journalists, and members of the public rely on government websites for guidance and data. When web content is updated, moved, or removed, it can become difficult to reconstruct what information was available at a particular point in time."}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "HealthArchive.ca vise à répondre à ce problème pour l’information canadienne de santé publique en créant un registre stable, géré de façon indépendante, de pages et de documents clés qui peuvent être cités dans la recherche, le journalisme et la communication publique."
            : "HealthArchive.ca is an attempt to address that problem for Canadian public health information by creating a stable, independently managed record of key pages and documents that can be referenced in research, journalism, and public communication."}
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr"
            ? "Indépendance et non‑partisanerie"
            : "Independence and non-partisanship"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "Le projet est indépendant et non gouvernemental. Il ne parle au nom d’aucun organisme de santé publique et ne vise ni à remplacer les sources officielles ni à offrir des conseils médicaux. Son objectif est de préserver des informations auparavant publiques d’une manière qui soutient la transparence, la responsabilité et la recherche."
            : "The project is independent and non-governmental. It does not speak for any public health agency, and it does not aim to replace official sources or to offer medical advice. Its focus is on preserving previously public information in a way that supports transparency, accountability, and research."}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Le projet vise également à maintenir un ton non partisan : l’existence d’une archive ne devrait pas être interprétée comme une déclaration sur les intentions ou les motivations d’une organisation ou d’un gouvernement en particulier."
            : "The project also aims to maintain a non-partisan tone: the existence of an archive should not be read as a statement about the intentions or motivations of any particular organization or government."}
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Statut du projet" : "Project status"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "HealthArchive.ca est en développement. Le site capture et indexe déjà des instantanés provenant de sources canadiennes de santé publique sélectionnées, et la couverture s’élargira avec le temps. Les fonctionnalités de recherche, de relecture et de curation évoluent et peuvent changer à mesure que l’archive mûrit."
            : "HealthArchive.ca is in development. The site is already capturing and indexing snapshots from selected Canadian public health sources, and coverage will expand over time. Search, replay, and curation features are evolving and may change as the archive matures."}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "À mesure que le projet mûrit, les méthodes, la gouvernance et les plans de durabilité seront documentés plus en détail, avec une discussion explicite de la portée, des limites et des risques."
            : "As the project matures, the methods, governance, and sustainability plans will be documented in more detail, with explicit discussion of scope, limitations, and risks."}
        </p>
      </section>
    </PageShell>
  );
}
