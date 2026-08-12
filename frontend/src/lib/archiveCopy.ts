import type { Locale } from "@/lib/i18n";
import { getSiteCopy } from "@/lib/siteCopy";

type CountAndDate = {
  formattedCount: string;
  count: number;
  formattedDate: string;
};

type CaptureRange = {
  formattedCount: string;
  count: number;
  formattedFirstCapture: string;
  formattedLastCapture: string;
};

export type ArchiveCopy = {
  meta: {
    eyebrow: string;
    title: string;
    description: string;
  };
  importantNote: {
    heading: string;
    methodsLead: string;
    methodsLink: string;
  };
  sourceBrowser: {
    heading: string;
    browseAll: string;
    viewSource: (sourceName: string) => string;
    previewAlt: (sourceName: string) => string;
    previewUnavailable: string;
    captureSummary: (values: CountAndDate) => string;
    homepageLabel: string;
    view: string;
    replayTitle: string;
    viewExternal: string;
    search: string;
  };
  results: {
    pageViewLabel: string;
    snapshotViewLabel: string;
    headingSuffix: string;
    viewInfoAriaLabel: string;
    pageViewInfo: string;
    snapshotViewInfo: string;
    searchHeading: string;
    matching: string;
    dateLabel: string;
    anyDate: string;
    count: (formattedCount: string, count: number, noun: string) => string;
    nouns: {
      page: string;
      snapshot: string;
      fallbackSnapshot: string;
    };
  };
  filters: {
    keywords: string;
    keywordsPlaceholder: string;
    search: string;
    source: string;
    allSources: string;
    from: string;
    to: string;
    show: string;
    viewInfoAriaLabel: string;
    viewInfo: string;
    pagesLatest: string;
    allSnapshots: string;
    sort: string;
    relevance: string;
    newest: string;
    perPage: string;
    includeErrors: string;
    includeErrorsInfoAriaLabel: string;
    includeErrorsInfo: string;
    includeDuplicates: string;
    includeDuplicatesInfoAriaLabel: string;
    includeDuplicatesInfo: string;
    apply: string;
    clear: string;
    clearFilters: string;
  };
  feedback: {
    invalidFilters: string;
    offline: string;
    noResultsLead: string;
    resetSearch: string;
    earlyRelease: string;
  };
  pagination: {
    page: (current: number, total: number) => string;
    showing: (first: number, last: number, total: number) => string;
    first: string;
    previous: string;
    next: string;
    last: string;
  };
  fallbackSourceNames: {
    phac: string;
    hc: string;
    cihr: string;
  };
  searchResult: {
    latestCapture: string;
    captured: string;
    noSummary: string;
    view: string;
    details: string;
    metadataAriaLabel: string;
    captures: string;
    allSnapshots: string;
    originalUrl: string;
    copyOriginalUrl: string;
  };
  searchWithin: {
    label: string;
    placeholder: string;
  };
  clipboard: {
    copiedToast: string;
    failedToast: string;
    copiedStatus: string;
    failedStatus: string;
  };
  apiHealth: {
    heading: string;
    beforeApiBase: string;
    betweenSettings: string;
    afterCorsOrigins: string;
  };
  browseBySource: {
    eyebrow: string;
    title: string;
    intro: string;
    sourceSummary: (formattedCount: string, count: number) => string;
    emptyTitle: string;
    emptyBody: string;
    importantNoteHeading: string;
    offlineTitle: string;
    offlineBody: string;
    viewArchivedSite: string;
    viewLatestSnapshot: string;
    previewAlt: (sourceName: string) => string;
    previewUnavailable: string;
    captureRange: (values: CaptureRange) => string;
    browseRecords: string;
  };
};

const commonDescription = (locale: Locale): string => {
  const siteCopy = getSiteCopy(locale);
  return `${siteCopy.workflow.archiveSummary} ${siteCopy.whatThisSiteIs.limitations} ${siteCopy.whatThisSiteIs.forCurrent}.`;
};

const archiveCopyEn: Omit<ArchiveCopy, "meta"> & {
  meta: Omit<ArchiveCopy["meta"], "description">;
} = {
  meta: {
    eyebrow: "Archive explorer",
    title: "Browse & search snapshots",
  },
  importantNote: {
    heading: "Important note",
    methodsLead: "For background on coverage and capture methods, see",
    methodsLink: "Methods & coverage",
  },
  sourceBrowser: {
    heading: "Browse archived sites",
    browseAll: "Browse all sources →",
    viewSource: (sourceName) => `View ${sourceName}`,
    previewAlt: (sourceName) => `${sourceName} preview`,
    previewUnavailable: "Preview unavailable",
    captureSummary: ({ formattedCount, count, formattedDate }) =>
      `${formattedCount} snapshot${count === 1 ? "" : "s"} · latest ${formattedDate}`,
    homepageLabel: "Homepage:",
    view: "View",
    replayTitle: "Open this source homepage in the replay service (new tab)",
    viewExternal: "View ↗",
    search: "Search",
  },
  results: {
    pageViewLabel: "Page",
    snapshotViewLabel: "Snapshot",
    headingSuffix: "search results",
    viewInfoAriaLabel: "Info about pages vs snapshots",
    pageViewInfo:
      "Pages view shows the latest capture for each URL (grouped by URL without query strings).",
    snapshotViewInfo:
      "Snapshots view shows every capture, including multiple captures of the same URL over time.",
    searchHeading: "Search",
    matching: "matching",
    dateLabel: "Date",
    anyDate: "Any",
    count: (formattedCount, count, noun) =>
      count === 1 ? `1 ${noun}` : `${formattedCount} ${noun}s`,
    nouns: { page: "page", snapshot: "snapshot", fallbackSnapshot: "snapshot" },
  },
  filters: {
    keywords: "Keywords",
    keywordsPlaceholder:
      "e.g. influenza, https://www.canada.ca/…, covid AND vaccine, -archived, url:covid",
    search: "Search",
    source: "Source",
    allSources: "All sources",
    from: "From",
    to: "To",
    show: "Show",
    viewInfoAriaLabel: "Info about page grouping",
    viewInfo:
      "Pages view shows the latest capture for each URL. Snapshots view shows every capture.",
    pagesLatest: "Pages (latest)",
    allSnapshots: "All snapshots",
    sort: "Sort",
    relevance: "Relevance",
    newest: "Newest",
    perPage: "Per page",
    includeErrors: "Include errors",
    includeErrorsInfoAriaLabel: "Info about including errors",
    includeErrorsInfo: "Includes snapshots with non-2xx HTTP status codes (e.g. 404 or 500).",
    includeDuplicates: "Include duplicates",
    includeDuplicatesInfoAriaLabel: "Info about including duplicates",
    includeDuplicatesInfo:
      "Also shows repeated identical captures (same URL + same content), often taken on the same day.",
    apply: "Apply",
    clear: "Clear",
    clearFilters: "Clear filters",
  },
  feedback: {
    invalidFilters: "Invalid search filters. Please check your date range.",
    offline: "Live API unavailable; showing a limited offline sample.",
    noResultsLead:
      "No records match the current filters. Try removing some filters, using broader keywords, or",
    resetSearch: "resetting the search",
    earlyRelease:
      "Early release: coverage is bounded to the current corpus, and features may change.",
  },
  pagination: {
    page: (current, total) => `Page ${current} of ${total}`,
    showing: (first, last, total) => `Showing ${first}-${last} of ${total}`,
    first: "« First",
    previous: "← Prev",
    next: "Next →",
    last: "Last »",
  },
  fallbackSourceNames: {
    phac: "Public Health Agency of Canada",
    hc: "Health Canada",
    cihr: "Canadian Institutes of Health Research",
  },
  searchResult: {
    latestCapture: "Latest capture",
    captured: "Captured",
    noSummary: "No summary is available for this snapshot yet.",
    view: "View",
    details: "Details",
    metadataAriaLabel: "Result metadata",
    captures: "Captures",
    allSnapshots: "All snapshots",
    originalUrl: "Original URL",
    copyOriginalUrl: "Copy original URL",
  },
  searchWithin: {
    label: "Search within results",
    placeholder: "Add keywords to narrow the current list…",
  },
  clipboard: {
    copiedToast: "Copied",
    failedToast: "Copy failed",
    copiedStatus: "Copied to clipboard.",
    failedStatus: "Copy failed.",
  },
  apiHealth: {
    heading: "Backend unreachable",
    beforeApiBase: "The API health check failed. Make sure ",
    betweenSettings: " points to a running backend and that the backend's ",
    afterCorsOrigins: " setting allows this frontend origin.",
  },
  browseBySource: {
    eyebrow: "Archive explorer",
    title: "Browse records by source",
    intro:
      "Browse the bounded current corpus by source and jump into an archived site or the full record list. Features may change.",
    sourceSummary: (formattedCount, count) =>
      `Showing ${formattedCount} source${count === 1 ? "" : "s"}.`,
    emptyTitle: "No sources available",
    emptyBody: "No archive sources are available in this view yet.",
    importantNoteHeading: "Important note",
    offlineTitle: "Live API unavailable",
    offlineBody: "Showing a limited offline sample while the live API is unavailable.",
    viewArchivedSite: "View archived site",
    viewLatestSnapshot: "View latest snapshot",
    previewAlt: (sourceName) => `${sourceName} preview`,
    previewUnavailable: "Preview unavailable",
    captureRange: ({ formattedCount, count, formattedFirstCapture, formattedLastCapture }) =>
      `${formattedCount} snapshot${count === 1 ? "" : "s"} captured between ${formattedFirstCapture} and ${formattedLastCapture}.`,
    browseRecords: "Browse records",
  },
};

const archiveCopyFr: Omit<ArchiveCopy, "meta"> & {
  meta: Omit<ArchiveCopy["meta"], "description">;
} = {
  meta: {
    eyebrow: "Explorateur d’archives",
    title: "Parcourir et rechercher des captures",
  },
  importantNote: {
    heading: "Note importante",
    methodsLead: "Pour plus de contexte sur la couverture et les méthodes de capture, voir",
    methodsLink: "Méthodes et couverture",
  },
  sourceBrowser: {
    heading: "Parcourir les sites archivés",
    browseAll: "Parcourir toutes les sources →",
    viewSource: (sourceName) => `Voir ${sourceName}`,
    previewAlt: (sourceName) => `Aperçu : ${sourceName}`,
    previewUnavailable: "Aperçu indisponible",
    captureSummary: ({ formattedCount, count, formattedDate }) =>
      `${formattedCount} capture${count === 1 ? "" : "s"} · dernière capture : ${formattedDate}`,
    homepageLabel: "Page d’accueil :",
    view: "Voir",
    replayTitle:
      "Ouvrir la page d’accueil de cette source dans le service de relecture (nouvel onglet)",
    viewExternal: "Voir ↗",
    search: "Rechercher",
  },
  results: {
    pageViewLabel: "Pages",
    snapshotViewLabel: "Captures",
    headingSuffix: "résultats de recherche",
    viewInfoAriaLabel: "Info sur les pages et les captures",
    pageViewInfo:
      "La vue Pages affiche la dernière capture pour chaque URL (regroupées par URL sans chaînes de requête).",
    snapshotViewInfo:
      "La vue Captures affiche chaque capture, y compris plusieurs captures de la même URL au fil du temps.",
    searchHeading: "Recherche",
    matching: "correspondant à",
    dateLabel: "Date",
    anyDate: "Sans limite",
    count: (formattedCount, count, noun) =>
      count === 1 ? `1 ${noun}` : `${formattedCount} ${noun}s`,
    nouns: { page: "page", snapshot: "capture", fallbackSnapshot: "capture" },
  },
  filters: {
    keywords: "Mots-clés",
    keywordsPlaceholder:
      "p. ex. grippe, https://www.canada.ca/…, covid AND vaccin, -archived, url:covid",
    search: "Rechercher",
    source: "Source",
    allSources: "Toutes les sources",
    from: "Du",
    to: "Au",
    show: "Afficher",
    viewInfoAriaLabel: "Info sur le regroupement des pages",
    viewInfo:
      "La vue Pages affiche la dernière capture pour chaque URL. La vue Captures affiche chaque capture.",
    pagesLatest: "Pages (dernière)",
    allSnapshots: "Toutes les captures",
    sort: "Trier",
    relevance: "Pertinence",
    newest: "Plus récent",
    perPage: "Par page",
    includeErrors: "Inclure les erreurs",
    includeErrorsInfoAriaLabel: "Info sur l’inclusion des erreurs",
    includeErrorsInfo: "Inclut les captures dont le code HTTP n’est pas 2xx (ex. 404 ou 500).",
    includeDuplicates: "Inclure les doublons",
    includeDuplicatesInfoAriaLabel: "Info sur l’inclusion des doublons",
    includeDuplicatesInfo:
      "Affiche aussi des captures identiques répétées (même URL + même contenu), souvent prises le même jour.",
    apply: "Appliquer",
    clear: "Effacer",
    clearFilters: "Effacer les filtres",
  },
  feedback: {
    invalidFilters: "Filtres de recherche invalides. Veuillez vérifier votre plage de dates.",
    offline: "API en direct indisponible; affichage d’un échantillon hors ligne limité.",
    noResultsLead:
      "Aucun enregistrement ne correspond aux filtres actuels. Essayez de retirer certains filtres, d’utiliser des mots-clés plus généraux ou de",
    resetSearch: "réinitialiser la recherche",
    earlyRelease:
      "Version préliminaire : la couverture est limitée au corpus actuel et les fonctionnalités peuvent changer.",
  },
  pagination: {
    page: (current, total) => `Page ${current} sur ${total}`,
    showing: (first, last, total) => `Affichage de ${first} à ${last} sur ${total}`,
    first: "« Première",
    previous: "← Préc.",
    next: "Suiv. →",
    last: "Dernière »",
  },
  fallbackSourceNames: {
    phac: "Agence de la santé publique du Canada",
    hc: "Santé Canada",
    cihr: "Instituts de recherche en santé du Canada",
  },
  searchResult: {
    latestCapture: "Dernière capture",
    captured: "Capturée",
    noSummary: "Aucun résumé n’est encore disponible pour cette capture.",
    view: "Voir",
    details: "Détails",
    metadataAriaLabel: "Métadonnées du résultat",
    captures: "Captures",
    allSnapshots: "Toutes les captures",
    originalUrl: "URL d’origine",
    copyOriginalUrl: "Copier l’URL d’origine",
  },
  searchWithin: {
    label: "Rechercher dans les résultats",
    placeholder: "Ajouter des mots-clés pour affiner la liste actuelle…",
  },
  clipboard: {
    copiedToast: "Copié",
    failedToast: "Échec de la copie",
    copiedStatus: "Copié dans le presse-papiers.",
    failedStatus: "Échec de la copie.",
  },
  apiHealth: {
    heading: "Backend inaccessible",
    beforeApiBase: "La vérification de santé de l’API a échoué. Assurez-vous que ",
    betweenSettings: " pointe vers un backend en cours d’exécution et que le paramètre ",
    afterCorsOrigins: " du backend autorise l’origine de ce frontend.",
  },
  browseBySource: {
    eyebrow: "Explorateur d’archives",
    title: "Parcourir les sources",
    intro:
      "Parcourez le corpus actuel délimité par source et accédez à un site archivé ou à la liste complète des enregistrements. Les fonctionnalités peuvent changer.",
    sourceSummary: (formattedCount, count) =>
      `Affichage de ${formattedCount} source${count === 1 ? "" : "s"}.`,
    emptyTitle: "Aucune source disponible",
    emptyBody: "Aucune source d’archive n’est encore disponible dans cette vue.",
    importantNoteHeading: "Note importante",
    offlineTitle: "API en direct indisponible",
    offlineBody:
      "Affichage d’un échantillon hors ligne limité pendant que l’API en direct est indisponible.",
    viewArchivedSite: "Voir le site archivé",
    viewLatestSnapshot: "Voir la capture la plus récente",
    previewAlt: (sourceName) => `Aperçu : ${sourceName}`,
    previewUnavailable: "Aperçu indisponible",
    captureRange: ({ formattedCount, count, formattedFirstCapture, formattedLastCapture }) => {
      const suffix = count === 1 ? "" : "s";
      return `${formattedCount} capture${suffix} capturée${suffix} entre le ${formattedFirstCapture} et le ${formattedLastCapture}.`;
    },
    browseRecords: "Parcourir les enregistrements",
  },
};

export function getArchiveCopy(locale: Locale): ArchiveCopy {
  const copy = locale === "fr" ? archiveCopyFr : archiveCopyEn;
  return {
    ...copy,
    meta: {
      ...copy.meta,
      description: commonDescription(locale),
    },
  };
}
