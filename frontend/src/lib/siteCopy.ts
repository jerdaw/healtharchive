import type { Locale } from "@/lib/i18n";

export const DATASET_RIGHTS_URL =
  "https://github.com/jerdaw/healtharchive-datasets/blob/main/RIGHTS.md";

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
    rightsLinkLabel: string;
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
      "Current release posture: existing releases remain available with checksums; scheduled publication is paused, and any future release requires explicit maintainer approval, manual dispatch, and rights/schema review.",
    rolloutStatus:
      "Dataset controls verified on 2026-08-12: the published workflows are manual-only, the rights notice resolves, and exact 15-snapshot / 24-change schema guards are active.",
    rightsLinkLabel: "Dataset provenance and reuse notice",
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
      "Position actuelle des publications : les publications existantes restent disponibles avec leurs sommes de contrôle; la publication planifiée est suspendue, et toute publication future exige une approbation explicite du responsable, un lancement manuel et un examen des droits et du schéma.",
    rolloutStatus:
      "Contrôles des jeux de données vérifiés le 12 août 2026 : les flux de travail publiés sont manuels seulement, l’avis sur les droits est accessible et les garde-fous de schéma exacts de 15 champs de capture et de 24 champs de changement sont actifs.",
    rightsLinkLabel: "Avis sur la provenance et la réutilisation des jeux de données",
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
