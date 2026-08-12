import type { Locale } from "@/lib/i18n";

/** Base shape for per-page bilingual copy (eyebrow, title, intro). */
export type PageCopyBase = { eyebrow: string; title: string; intro: string };

export type SiteCopy = {
  mission: {
    line1: string;
    line2: string;
  };
  whatThisSiteIs: {
    is: string;
    isNot: string;
    forCurrent: string;
    limitations: string;
  };
  workflow: {
    archiveSummary: string;
    browseSummary: string;
  };
  datasetReleases: {
    status: string;
    rolloutStatus: string;
  };
};

const siteCopyEn = {
  mission: {
    line1:
      "HealthArchive.ca preserves time-stamped snapshots of selected Canadian public health web pages so changes remain auditable and citable.",
    line2:
      "It is an independent, non-governmental archival project — not an official government website, not medical advice, and not a substitute for current official guidance.",
  },
  whatThisSiteIs: {
    is: "A citable archival record of what public health websites displayed at a specific time, with capture dates and stable snapshot links.",
    isNot: "Current guidance, medical advice, or an official government website.",
    forCurrent: "For up-to-date recommendations, always consult the official source website",
    limitations: "Archived content may be incomplete, outdated, or superseded.",
  },
  workflow: {
    archiveSummary:
      "Browse and search historical snapshots. This is an archive — not current guidance or medical advice.",
    browseSummary: "You are viewing an archived capture — not current guidance or medical advice.",
  },
  datasetReleases: {
    status:
      "Accepted target posture: preserve existing releases with checksums, pause scheduled new publication during reuse and governance review, and require explicit maintainer approval and manual dispatch for any future release.",
    rolloutStatus:
      "Rollout status as of 2026-08-12: those controls are not yet published. This public status must not be deployed until the datasets repository has published and verified its manual-only workflows, rights notice, and schema guards.",
  },
} as const satisfies SiteCopy;

const siteCopyFr = {
  mission: {
    line1:
      "HealthArchive.ca préserve des captures horodatées de pages Web de santé publique canadiennes sélectionnées afin que les changements restent vérifiables et citables.",
    line2:
      "Il s’agit d’un projet d’archivage indépendant et non gouvernemental — pas un site gouvernemental officiel, pas un avis médical et pas un substitut aux directives officielles actuelles.",
  },
  whatThisSiteIs: {
    is: "Un dossier d’archives citable de ce que les sites de santé publique affichaient à un moment précis, avec des dates de capture et des liens de capture stables.",
    isNot: "Des directives actuelles, un avis médical ou un site gouvernemental officiel.",
    forCurrent: "Pour des recommandations à jour, consultez toujours le site officiel de la source",
    limitations: "Le contenu archivé peut être incomplet, périmé ou remplacé.",
  },
  workflow: {
    archiveSummary:
      "Parcourez et recherchez des captures historiques. Ceci est une archive — pas des directives actuelles ni un avis médical.",
    browseSummary:
      "Vous consultez une capture archivée — pas des directives actuelles ni un avis médical.",
  },
  datasetReleases: {
    status:
      "Position cible acceptée : préserver les publications existantes avec leurs sommes de contrôle, suspendre les nouvelles publications planifiées pendant l’examen de la réutilisation et de la gouvernance, et exiger une approbation explicite du responsable ainsi qu’un lancement manuel pour toute publication future.",
    rolloutStatus:
      "État du déploiement au 12 août 2026 : ces contrôles ne sont pas encore publiés. Ce statut public ne doit pas être déployé avant que le dépôt de jeux de données ait publié et vérifié ses flux de travail manuels seulement, son avis sur les droits et ses garde-fous de schéma.",
  },
} as const satisfies SiteCopy;

export function getSiteCopy(locale: Locale): SiteCopy {
  return locale === "fr" ? siteCopyFr : siteCopyEn;
}

export function buildMetaDescription(locale: Locale): string {
  const copy = getSiteCopy(locale);
  return `${copy.mission.line1} ${copy.mission.line2}`;
}

export function buildBrowseDisclaimer(
  locale: Locale,
  args: { captureLabel?: string | null },
): string {
  if (locale === "fr") {
    const capturePart = args.captureLabel ? ` du ${args.captureLabel}` : "";
    return `Vous consultez une capture archivée${capturePart} — pas des directives actuelles ni un avis médical.`;
  }

  const capturePart = args.captureLabel ? ` from ${args.captureLabel}` : "";
  return `You are viewing an archived capture${capturePart} — not current guidance or medical advice.`;
}
