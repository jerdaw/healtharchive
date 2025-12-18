export type DemoRecord = {
  id: string; // slug used in /snapshot/[id]
  title: string;
  sourceCode: "phac" | "hc";
  sourceName: string;
  language: string;
  captureDate: string; // YYYY-MM-DD
  originalUrl: string;
  snapshotPath: string; // path under /public
  snippet: string;
};

export const demoRecords: DemoRecord[] = [
  {
    id: "phac-2025-02-15-covid-epi",
    title: "COVID-19 epidemiology update: Canada",
    sourceCode: "phac",
    sourceName: "Public Health Agency of Canada",
    language: "English",
    captureDate: "2025-02-15",
    originalUrl:
      "https://www.canada.ca/en/public-health/services/diseases/2019-novel-coronavirus-infection.html",
    snapshotPath: "/demo-archive/phac/2025-02-15-covid-epi.html",
    snippet:
      "National summary of COVID-19 cases, hospitalizations, deaths, and testing across Canada, including key epidemiologic trends.",
  },
  {
    id: "phac-2023-10-01-flu-recs-en",
    title: "National Advisory Committee on Immunization: Seasonal influenza vaccine recommendations",
    sourceCode: "phac",
    sourceName: "Public Health Agency of Canada",
    language: "English",
    captureDate: "2023-10-01",
    originalUrl:
      "https://www.canada.ca/en/public-health/services/immunization/national-advisory-committee-on-immunization-naci.html",
    snapshotPath: "/demo-archive/phac/2023-10-01-flu-recs-en.html",
    snippet:
      "Clinical guidance for seasonal influenza vaccination, including high-risk groups, vaccine types, and programmatic considerations.",
  },
  {
    id: "phac-2023-10-01-flu-recs-fr",
    title:
      "Comité consultatif national de l’immunisation : Recommandations sur le vaccin contre la grippe saisonnière",
    sourceCode: "phac",
    sourceName: "Public Health Agency of Canada",
    language: "French",
    captureDate: "2023-10-01",
    originalUrl:
      "https://www.canada.ca/fr/sante-publique/services/immunisation/comite-consultatif-national-immunisation-ccni.html",
    snapshotPath: "/demo-archive/phac/2023-10-01-flu-recs-fr.html",
    snippet:
      "Version française des recommandations du CCNI sur le vaccin contre la grippe saisonnière.",
  },
  {
    id: "phac-2024-07-10-mpox-update",
    title: "Mpox (monkeypox): Situation update",
    sourceCode: "phac",
    sourceName: "Public Health Agency of Canada",
    language: "English",
    captureDate: "2024-07-10",
    originalUrl:
      "https://www.canada.ca/en/public-health/services/diseases/monkeypox.html",
    snapshotPath: "/demo-archive/phac/2024-07-10-mpox-update.html",
    snippet:
      "Update on mpox activity in Canada, including case counts, epidemiologic links, and vaccination recommendations.",
  },
  {
    id: "phac-2022-12-01-hiv-surveillance",
    title: "HIV in Canada: Surveillance report",
    sourceCode: "phac",
    sourceName: "Public Health Agency of Canada",
    language: "English",
    captureDate: "2022-12-01",
    originalUrl:
      "https://www.canada.ca/en/public-health/services/publications/diseases-conditions/hiv-canada-surveillance-report.html",
    snapshotPath: "/demo-archive/phac/2022-12-01-hiv-surveillance.html",
    snippet:
      "National surveillance report describing trends in HIV diagnoses, transmission categories, and regional patterns.",
  },
  {
    id: "phac-2023-06-15-climate-health",
    title: "Climate change and health: Risks for Canadians",
    sourceCode: "phac",
    sourceName: "Public Health Agency of Canada",
    language: "English",
    captureDate: "2023-06-15",
    originalUrl:
      "https://www.canada.ca/en/public-health/services/publications/healthy-living/climate-change-health-risks.html",
    snapshotPath: "/demo-archive/phac/2023-06-15-climate-health.html",
    snippet:
      "Overview of how climate change is expected to affect health in Canada, including heat, air quality, and vector-borne diseases.",
  },
  {
    id: "hc-2024-11-01-covid-vaccines",
    title: "COVID-19 vaccines: Recommendations and eligibility",
    sourceCode: "hc",
    sourceName: "Health Canada",
    language: "English",
    captureDate: "2024-11-01",
    originalUrl:
      "https://www.canada.ca/en/health-canada/services/drugs-health-products/covid19-industry/vaccines.html",
    snapshotPath: "/demo-archive/hc/2024-11-01-covid-vaccines.html",
    snippet:
      "Regulatory and program information on authorized COVID-19 vaccines in Canada, including eligibility and product monographs.",
  },
  {
    id: "hc-2023-04-20-naloxone",
    title: "Naloxone: Information for Canadians",
    sourceCode: "hc",
    sourceName: "Health Canada",
    language: "English",
    captureDate: "2023-04-20",
    originalUrl:
      "https://www.canada.ca/en/health-canada/services/opioids/naloxone.html",
    snapshotPath: "/demo-archive/hc/2023-04-20-naloxone.html",
    snippet:
      "Guidance for the public and service providers on accessing and using naloxone to temporarily reverse opioid overdoses.",
  },
  {
    id: "hc-2024-03-05-food-recalls",
    title: "Food recall warnings",
    sourceCode: "hc",
    sourceName: "Health Canada",
    language: "English",
    captureDate: "2024-03-05",
    originalUrl:
      "https://recalls-rappels.canada.ca/en/food-recalls-and-safety-alerts",
    snapshotPath: "/demo-archive/hc/2024-03-05-food-recalls.html",
    snippet:
      "Listing of current food recalls and safety alerts issued for products marketed in Canada.",
  },
  {
    id: "hc-2022-09-30-water-quality",
    title: "Guidelines for Canadian drinking water quality",
    sourceCode: "hc",
    sourceName: "Health Canada",
    language: "English",
    captureDate: "2022-09-30",
    originalUrl:
      "https://www.canada.ca/en/health-canada/services/environmental-workplace-health/water-quality/drinking-water/canadian-drinking-water-guidelines.html",
    snapshotPath: "/demo-archive/hc/2022-09-30-water-quality.html",
    snippet:
      "Summary of guideline values and technical documents for drinking water contaminants in Canada.",
  },
];

export type SearchParams = {
  q?: string;
  source?: string;
  from?: string; // YYYY-MM-DD (inclusive)
  to?: string; // YYYY-MM-DD (inclusive)
};

function normalize(str: string): string {
  return str.toLowerCase();
}

export function searchDemoRecords(params: SearchParams): DemoRecord[] {
  const q = params.q?.trim();
  const source = params.source?.trim();
  const from = params.from?.trim();
  const to = params.to?.trim();
  const tokens =
    q?.match(/[a-z0-9]+/gi)?.map((t) => t.toLowerCase()).filter((t) => t.length >= 3) ??
    [];

  return demoRecords.filter((record) => {
    if (source && record.sourceCode !== source) return false;
    if (from && record.captureDate < from) return false;
    if (to && record.captureDate > to) return false;

    if (!q) return true;

    const haystack = normalize(
      [
        record.title,
        record.snippet,
        record.sourceName,
        record.language,
        record.originalUrl,
      ].join(" "),
    );

    if (tokens.length === 0) return haystack.includes(normalize(q));
    return tokens.every((t) => haystack.includes(t));
  });
}

export type SourceSummary = {
  sourceCode: string;
  sourceName: string;
  recordCount: number;
  firstCapture: string;
  lastCapture: string;
  latestRecordId: string | null;
};

export function getSourcesSummary(): SourceSummary[] {
  const map = new Map<string, SourceSummary>();

  for (const r of demoRecords) {
    const existing = map.get(r.sourceCode);
    if (!existing) {
      map.set(r.sourceCode, {
        sourceCode: r.sourceCode,
        sourceName: r.sourceName,
        recordCount: 1,
        firstCapture: r.captureDate,
        lastCapture: r.captureDate,
        latestRecordId: r.id,
      });
    } else {
      existing.recordCount += 1;
      if (r.captureDate < existing.firstCapture) {
        existing.firstCapture = r.captureDate;
      }
      if (r.captureDate > existing.lastCapture) {
        existing.lastCapture = r.captureDate;
        existing.latestRecordId = r.id;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.sourceName.localeCompare(b.sourceName),
  );
}

export function getRecordById(id: string): DemoRecord | undefined {
  return demoRecords.find((r) => r.id === id);
}
