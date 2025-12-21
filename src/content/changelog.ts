export type ChangelogEntry = {
  date: string;
  title: string;
  items: string[];
};

export const changelogEntries: ChangelogEntry[] = [
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
    title: "Phase 0 narrative and safety copy refresh",
    items: [
      "Standardized the public mission and non-authoritative language site-wide.",
      "Added prominent archive disclaimers to browse and snapshot workflows.",
    ],
  },
];
