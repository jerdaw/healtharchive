import type { Locale } from "@/lib/i18n";

export type ChangelogEntry = {
  date: string;
  title: string;
  items: string[];
};

export const changelogEntriesByLocale: Record<Locale, ChangelogEntry[]> = {
  en: [
    {
      date: "2025-12-22",
      title: "Dataset releases",
      items: [
        "Published automated quarterly, metadata-only dataset releases with checksums (GitHub Releases).",
        "Linked dataset releases from the exports page.",
      ],
    },
    {
      date: "2025-12-22",
      title: "Change tracking and comparison",
      items: [
        "Launched edition-aware change tracking feeds and comparison views.",
        "Added snapshot timelines to support capture-to-capture comparisons.",
        "Published a public digest page with RSS feeds for change events.",
      ],
    },
    {
      date: "2025-12-21",
      title: "Status metrics and impact reporting",
      items: [
        "Launched the public status and metrics page.",
        "Added aggregate usage counts for privacy-preserving reporting.",
        "Published the monthly impact report baseline.",
      ],
    },
    {
      date: "2025-12-21",
      title: "Governance and issue intake rollout",
      items: [
        "Published governance, terms, privacy, and report-an-issue pages.",
        "Added a structured issue intake flow with backend storage.",
        "Linked policy pages from the site footer for visibility.",
      ],
    },
    {
      date: "2025-12-16",
      title: "Narrative and safety copy refresh",
      items: [
        "Standardized the public mission and non-authoritative language site-wide.",
        "Added prominent archive disclaimers to browse and snapshot workflows.",
      ],
    },
  ],
  fr: [
    {
      date: "2025-12-22",
      title: "Publications de jeux de données",
      items: [
        "Publication automatisée de versions trimestrielles de jeux de données (métadonnées uniquement) avec sommes de contrôle (GitHub Releases).",
        "Ajout de liens vers les versions des jeux de données depuis la page des exportations.",
      ],
    },
    {
      date: "2025-12-22",
      title: "Suivi des changements et comparaison",
      items: [
        "Lancement de flux de suivi des changements et de vues de comparaison tenant compte des éditions.",
        "Ajout de chronologies de captures pour permettre des comparaisons capture à capture.",
        "Publication d’une page de synthèse publique avec des flux RSS pour les événements de changement.",
      ],
    },
    {
      date: "2025-12-21",
      title: "Indicateurs de statut et rapport d’impact",
      items: [
        "Lancement de la page publique de statut et de métriques.",
        "Ajout de compteurs d’utilisation agrégés pour un reporting respectueux de la vie privée.",
        "Publication du référentiel du rapport d’impact mensuel.",
      ],
    },
    {
      date: "2025-12-21",
      title: "Déploiement de la gouvernance et du signalement",
      items: [
        "Publication des pages de gouvernance, conditions d’utilisation, confidentialité et signalement.",
        "Ajout d’un flux de signalement structuré avec stockage côté backend.",
        "Ajout de liens vers les politiques dans le pied de page du site.",
      ],
    },
    {
      date: "2025-12-16",
      title: "Actualisation du texte narratif et de sécurité",
      items: [
        "Standardisation du texte public sur la mission et le caractère non autoritaire du site.",
        "Ajout d’avertissements d’archive plus visibles dans les parcours de navigation et de consultation des captures.",
      ],
    },
  ],
};
