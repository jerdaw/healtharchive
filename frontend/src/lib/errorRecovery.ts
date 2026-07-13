import type { Locale } from "@/lib/i18n";
import { pickLocalized, type Localized } from "@/lib/localized";

export type ErrorRecoveryCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  actionsTitle: string;
  explanation: string;
  retry: string;
  home: string;
  boundaryNote: string;
};

const errorRecoveryCopy: Localized<ErrorRecoveryCopy> = {
  en: {
    eyebrow: "Recovery",
    title: "This page could not be displayed",
    intro: "An unexpected error interrupted this page. No archived content has been changed.",
    actionsTitle: "Choose a safe next step",
    explanation:
      "Try loading the page again. If the problem continues, return to the archive home page.",
    retry: "Try again",
    home: "Return home",
    boundaryNote:
      "HealthArchive.ca is an independent archive, not an official government website or a source of current medical guidance.",
  },
  fr: {
    eyebrow: "Récupération",
    title: "Cette page n’a pas pu être affichée",
    intro: "Une erreur inattendue a interrompu cette page. Aucun contenu archivé n’a été modifié.",
    actionsTitle: "Choisissez une prochaine étape sûre",
    explanation:
      "Essayez de charger la page de nouveau. Si le problème persiste, retournez à la page d’accueil des archives.",
    retry: "Réessayer",
    home: "Retour à l’accueil",
    boundaryNote:
      "HealthArchive.ca est une archive indépendante, et non un site gouvernemental officiel ni une source de directives médicales actuelles.",
  },
};

export function getErrorRecoveryCopy(locale: Locale): ErrorRecoveryCopy {
  return pickLocalized(locale, errorRecoveryCopy);
}
