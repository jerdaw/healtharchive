import type { Locale } from "@/lib/i18n";

export type HomeCopy = {
  meta: { title: string };
  hero: {
    eyebrow: string;
    h1Before: string;
    h1Accent: string;
    h1Middle: string;
    h1Suffix: string;
    lede: string;
    ctaPrimary: string;
    ctaSecondary: string;
    inDevelopment: string;
    developmentNote: string;
  };
  projectSnapshot: {
    heading: string;
    liveSubtext: string;
    offlineSubtext: string;
    archivedSnapshots: string;
    snapshotsUnit: string;
    uniquePages: string;
    pagesUnit: string;
    sourcesTracked: string;
    sourcesUnit: string;
    viewStatus: string;
    lastUpdatedLabel: string;
  };
  audience: {
    heading: string;
    subtitle: string;
    clinicians: { title: string; body: string; cta: string };
    researchers: { title: string; body: string; cta: string };
    public: { title: string; body: string; cta: string };
  };
  howItWorks: {
    heading: string;
    subtitle: string;
    step1Title: string;
    step1Body: string;
    step2Title: string;
    step2Body: string;
    step3Title: string;
    step3Body: string;
  };
  featuredSources: {
    heading: string;
    subtitle: string;
    seeAll: string;
    snapshotsLabel: string;
    latestCapture: string;
    browse: string;
    noSources: string;
  };
  exampleStory: {
    heading: string;
    body: string;
    cta: string;
  };
  changeShowcase: {
    heading: string;
    subtitle: string;
    seeAll: string;
    beforeLabel: string;
    afterLabel: string;
    noChanges: string;
    linesAdded: string;
    linesRemoved: string;
  };
  recentActivity: {
    heading: string;
    seeAll: string;
    noActivity: string;
    captured: string;
    changed: string;
  };
  faq: {
    heading: string;
    items: Array<{ q: string; a: string }>;
  };
  bottomCta: {
    heading: string;
    subheading: string;
    cta: string;
  };
  search: {
    placeholder: string;
    button: string;
    bottomCtaAriaLabel: string;
  };
};

const homeCopyEn: HomeCopy = {
  meta: {
    title: "HealthArchive.ca – Independent archive of Canadian public health information",
  },
  hero: {
    eyebrow: "Preserving the Canadian public health record",
    h1Before: "See what Canadian public health websites",
    h1Accent: "used to say",
    h1Middle: "even",
    h1Suffix: "they change.",
    lede: "Government health pages change without warning\u2009—\u2009guidance is updated, tables are revised, dashboards disappear. HealthArchive.ca captures and preserves what was there, so you can find it, cite it, and track what changed.",
    ctaPrimary: "Search the archive",
    ctaSecondary: "How it works",
    inDevelopment: "In development",
    developmentNote:
      "Coverage and features are expanding; archived content may be incomplete, outdated, or superseded.",
  },
  projectSnapshot: {
    heading: "Project snapshot",
    liveSubtext: "Live metrics from the archive backend.",
    offlineSubtext: "Showing a limited offline sample while the live API is unavailable.",
    archivedSnapshots: "Archived snapshots",
    snapshotsUnit: "snapshots",
    uniquePages: "Unique pages",
    pagesUnit: "pages",
    sourcesTracked: "Sources tracked",
    sourcesUnit: "sources",
    viewStatus: "View live status \u2192",
    lastUpdatedLabel: "Last capture",
  },
  audience: {
    heading: "Who is this for?",
    subtitle:
      "Anyone who needs to know what a Canadian public health website said at a specific point in time.",
    clinicians: {
      title: "Clinicians & public health practitioners",
      body: "Guidance changes, but you need to know what it said last year. Find and cite past recommendations on COVID-19 vaccination, influenza, naloxone, and more.",
      cta: "Search health guidance \u2192",
    },
    researchers: {
      title: "Researchers & data journalists",
      body: "Need to prove what a page said on a specific date? Link your analysis to the exact wording, tables, and dashboards that were published\u2009\u2014\u2009not what\u2019s there now.",
      cta: "Explore the data \u2192",
    },
    public: {
      title: "Members of the public",
      body: "Curious what officials said about a health topic last year? See how public health messaging has evolved, while keeping official sites as your go-to for current guidance.",
      cta: "Browse the archive \u2192",
    },
  },
  howItWorks: {
    heading: "How it works",
    subtitle:
      "HealthArchive uses modern web-archiving tools to capture, index, and replay public health pages.",
    step1Title: "Capture",
    step1Body:
      "We crawl selected public health websites on a regular schedule, preserving full-page snapshots in the WARC archival format.",
    step2Title: "Index",
    step2Body:
      "Each capture is time-stamped, language-detected, and indexed so it can be searched by keyword, source, or date range.",
    step3Title: "Search & cite",
    step3Body:
      "You search the archive, view snapshots as they appeared, compare versions side-by-side, and get a permanent, citable link.",
  },
  featuredSources: {
    heading: "Sources we track",
    subtitle: "Federal public health websites currently being archived.",
    seeAll: "See all sources \u2192",
    snapshotsLabel: "snapshots",
    latestCapture: "Latest capture",
    browse: "Browse \u2192",
    noSources: "No sources available.",
  },
  exampleStory: {
    heading: "When guidance changes, the record should remain",
    body: "In 2024, public health agencies updated their mpox guidance pages. The previous versions\u2009\u2014\u2009with different risk categories and recommendations\u2009\u2014\u2009are no longer on the live sites. But they\u2019re preserved in HealthArchive, citable and searchable.",
    cta: "See the archived snapshot \u2192",
  },
  changeShowcase: {
    heading: "Track what changed",
    subtitle:
      "HealthArchive detects text changes between captures and shows you exactly what was added, removed, or revised.",
    seeAll: "View all changes \u2192",
    beforeLabel: "Previous version",
    afterLabel: "Updated version",
    noChanges: "No recent changes available.",
    linesAdded: "lines added",
    linesRemoved: "lines removed",
  },
  recentActivity: {
    heading: "Recent activity",
    seeAll: "View full feed \u2192",
    noActivity: "No recent activity available.",
    captured: "captured",
    changed: "change detected",
  },
  faq: {
    heading: "Frequently asked questions",
    items: [
      {
        q: "Is this an official government website?",
        a: "No. HealthArchive.ca is an independent, volunteer-led project. It is not affiliated with, endorsed by, or associated with any government agency. For current guidance, always consult the official source website.",
      },
      {
        q: "How often are pages captured?",
        a: "Capture frequency depends on the source and available resources. Major federal sources are currently captured on a regular schedule. Coverage and frequency are still expanding.",
      },
      {
        q: "Can I request a page to be archived?",
        a: "Yes. Use the Contact page to suggest new pages or sources for inclusion. We prioritize Canadian public health content.",
      },
      {
        q: "How do I cite a snapshot?",
        a: "Each archived snapshot has a permanent URL and a copy-citation button. You can cite it like any web resource, including the capture date and the HealthArchive URL.",
      },
      {
        q: "How is this different from the Wayback Machine?",
        a: "The Wayback Machine archives broadly across the entire web. HealthArchive focuses specifically on Canadian public health content, with purpose-built change tracking, structured search, and citation-ready links.",
      },
      {
        q: "Is HealthArchive open source?",
        a: "Yes. The frontend and backend code are available on GitHub. Contributions and feedback are welcome.",
      },
    ],
  },
  bottomCta: {
    heading: "Start searching",
    subheading:
      "Find the exact version of any archived page\u2009\u2014\u2009by keyword, source, or date.",
    cta: "or browse all sources \u2192",
  },
  search: {
    placeholder: "Search archived health pages\u2026",
    button: "Search",
    bottomCtaAriaLabel: "Search the archive from the bottom of the page",
  },
};

const homeCopyFr: HomeCopy = {
  meta: {
    title:
      "HealthArchive.ca \u2013 Archive ind\u00e9pendante d\u2019information de sant\u00e9 publique au Canada",
  },
  hero: {
    eyebrow: "Pr\u00e9server le dossier de sant\u00e9 publique canadien",
    h1Before: "Voyez ce que les sites Web de sant\u00e9 publique au Canada",
    h1Accent: "disaient autrefois",
    h1Middle: "m\u00eame",
    h1Suffix: "qu\u2019ils changent.",
    lede: "Les pages de sant\u00e9 gouvernementales changent sans pr\u00e9avis\u2009\u2014\u2009les directives sont mises \u00e0 jour, les tableaux r\u00e9vis\u00e9s, les tableaux de bord disparaissent. HealthArchive.ca capture et pr\u00e9serve ce qui s\u2019y trouvait, pour que vous puissiez le retrouver, le citer et suivre ce qui a chang\u00e9.",
    ctaPrimary: "Rechercher dans l\u2019archive",
    ctaSecondary: "Comment \u00e7a marche",
    inDevelopment: "En d\u00e9veloppement",
    developmentNote:
      "La couverture et les fonctionnalit\u00e9s s\u2019\u00e9largissent; le contenu archiv\u00e9 peut \u00eatre incomplet, p\u00e9rim\u00e9 ou remplac\u00e9.",
  },
  projectSnapshot: {
    heading: "Aper\u00e7u du projet",
    liveSubtext: "M\u00e9triques en direct depuis le backend de l\u2019archive.",
    offlineSubtext:
      "Affichage d\u2019un \u00e9chantillon hors ligne limit\u00e9 pendant que l\u2019API en direct est indisponible.",
    archivedSnapshots: "Captures archiv\u00e9es",
    snapshotsUnit: "captures",
    uniquePages: "Pages uniques",
    pagesUnit: "pages",
    sourcesTracked: "Sources suivies",
    sourcesUnit: "sources",
    viewStatus: "Voir le statut en direct \u2192",
    lastUpdatedLabel: "Derni\u00e8re capture",
  },
  audience: {
    heading: "\u00c0 qui s\u2019adresse ce site ?",
    subtitle:
      "Toute personne ayant besoin de savoir ce qu\u2019un site de sant\u00e9 publique canadien affichait \u00e0 un moment pr\u00e9cis.",
    clinicians: {
      title: "Cliniciens et praticiens de sant\u00e9 publique",
      body: "Les directives changent, mais vous devez savoir ce qu\u2019elles disaient l\u2019an dernier. Trouvez et citez les recommandations pass\u00e9es sur la vaccination COVID-19, la grippe, la naloxone et plus.",
      cta: "Rechercher les directives \u2192",
    },
    researchers: {
      title: "Chercheurs et journalistes de donn\u00e9es",
      body: "Besoin de prouver ce qu\u2019une page affichait \u00e0 une date pr\u00e9cise\u00a0? Reliez votre analyse au libell\u00e9 exact, aux tableaux et tableaux de bord publi\u00e9s\u2009\u2014\u2009pas \u00e0 ce qui s\u2019y trouve aujourd\u2019hui.",
      cta: "Explorer les donn\u00e9es \u2192",
    },
    public: {
      title: "Grand public",
      body: "Curieux de savoir ce que les responsables disaient sur un sujet de sant\u00e9 l\u2019an dernier\u00a0? Voyez comment les messages de sant\u00e9 publique ont \u00e9volu\u00e9, tout en gardant les sites officiels comme source principale.",
      cta: "Parcourir l\u2019archive \u2192",
    },
  },
  howItWorks: {
    heading: "Comment \u00e7a marche",
    subtitle:
      "HealthArchive utilise des outils modernes d\u2019archivage Web pour capturer, indexer et relire des pages de sant\u00e9 publique.",
    step1Title: "Capturer",
    step1Body:
      "Nous parcourons des sites de sant\u00e9 publique s\u00e9lectionn\u00e9s selon un calendrier r\u00e9gulier, en pr\u00e9servant des captures compl\u00e8tes au format d\u2019archivage WARC.",
    step2Title: "Indexer",
    step2Body:
      "Chaque capture est horodat\u00e9e, sa langue est d\u00e9tect\u00e9e et elle est index\u00e9e pour permettre la recherche par mot-cl\u00e9, source ou plage de dates.",
    step3Title: "Rechercher et citer",
    step3Body:
      "Vous recherchez dans l\u2019archive, consultez les captures telles qu\u2019elles apparaissaient, comparez les versions c\u00f4te \u00e0 c\u00f4te et obtenez un lien permanent citable.",
  },
  featuredSources: {
    heading: "Sources que nous suivons",
    subtitle: "Sites Web f\u00e9d\u00e9raux de sant\u00e9 publique actuellement archiv\u00e9s.",
    seeAll: "Voir toutes les sources \u2192",
    snapshotsLabel: "captures",
    latestCapture: "Derni\u00e8re capture",
    browse: "Parcourir \u2192",
    noSources: "Aucune source disponible.",
  },
  exampleStory: {
    heading: "Quand les directives changent, le dossier doit rester",
    body: "En 2024, les agences de sant\u00e9 publique ont mis \u00e0 jour leurs pages sur la variole simienne (mpox). Les versions pr\u00e9c\u00e9dentes\u2009\u2014\u2009avec des cat\u00e9gories de risque et des recommandations diff\u00e9rentes\u2009\u2014\u2009ne sont plus sur les sites officiels. Mais elles sont pr\u00e9serv\u00e9es dans HealthArchive, citables et consultables.",
    cta: "Voir la capture archiv\u00e9e \u2192",
  },
  changeShowcase: {
    heading: "Suivre ce qui a chang\u00e9",
    subtitle:
      "HealthArchive d\u00e9tecte les changements de texte entre les captures et vous montre exactement ce qui a \u00e9t\u00e9 ajout\u00e9, supprim\u00e9 ou r\u00e9vis\u00e9.",
    seeAll: "Voir tous les changements \u2192",
    beforeLabel: "Version pr\u00e9c\u00e9dente",
    afterLabel: "Version mise \u00e0 jour",
    noChanges: "Aucun changement r\u00e9cent disponible.",
    linesAdded: "lignes ajout\u00e9es",
    linesRemoved: "lignes supprim\u00e9es",
  },
  recentActivity: {
    heading: "Activit\u00e9 r\u00e9cente",
    seeAll: "Voir le fil complet \u2192",
    noActivity: "Aucune activit\u00e9 r\u00e9cente disponible.",
    captured: "captur\u00e9",
    changed: "changement d\u00e9tect\u00e9",
  },
  faq: {
    heading: "Questions fr\u00e9quentes",
    items: [
      {
        q: "Est-ce un site gouvernemental officiel\u00a0?",
        a: "Non. HealthArchive.ca est un projet ind\u00e9pendant et b\u00e9n\u00e9vole. Il n\u2019est pas affili\u00e9, endoss\u00e9 ni associ\u00e9 \u00e0 un organisme gouvernemental. Pour les directives actuelles, consultez toujours le site officiel de la source.",
      },
      {
        q: "\u00c0 quelle fr\u00e9quence les pages sont-elles captur\u00e9es\u00a0?",
        a: "La fr\u00e9quence de capture d\u00e9pend de la source et des ressources disponibles. Les principales sources f\u00e9d\u00e9rales sont actuellement captur\u00e9es selon un calendrier r\u00e9gulier. La couverture et la fr\u00e9quence s\u2019\u00e9largissent.",
      },
      {
        q: "Puis-je demander l\u2019archivage d\u2019une page\u00a0?",
        a: "Oui. Utilisez la page Contact pour sugg\u00e9rer de nouvelles pages ou sources. Nous priorisons le contenu canadien de sant\u00e9 publique.",
      },
      {
        q: "Comment citer une capture\u00a0?",
        a: "Chaque capture archiv\u00e9e poss\u00e8de un URL permanent et un bouton de copie de citation. Vous pouvez la citer comme toute ressource Web, en incluant la date de capture et l\u2019URL HealthArchive.",
      },
      {
        q: "En quoi est-ce diff\u00e9rent du Wayback Machine\u00a0?",
        a: "Le Wayback Machine archive largement sur tout le Web. HealthArchive se concentre sp\u00e9cifiquement sur le contenu canadien de sant\u00e9 publique, avec un suivi des changements, une recherche structur\u00e9e et des liens pr\u00eats \u00e0 citer.",
      },
      {
        q: "HealthArchive est-il open source\u00a0?",
        a: "Oui. Le code du frontend et du backend est disponible sur GitHub. Les contributions et commentaires sont les bienvenus.",
      },
    ],
  },
  bottomCta: {
    heading: "Commencez votre recherche",
    subheading:
      "Trouvez la version exacte de toute page archiv\u00e9e\u2009\u2014\u2009par mot-cl\u00e9, source ou date.",
    cta: "ou parcourir toutes les sources \u2192",
  },
  search: {
    placeholder: "Rechercher dans les pages archiv\u00e9es\u2026",
    button: "Rechercher",
    bottomCtaAriaLabel: "Rechercher dans l\u2019archive depuis le bas de la page",
  },
};

export function getHomeCopy(locale: Locale): HomeCopy {
  return locale === "fr" ? homeCopyFr : homeCopyEn;
}
