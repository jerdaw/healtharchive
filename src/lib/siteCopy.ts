export const siteCopy = {
  mission: {
    line1:
      "HealthArchive.ca preserves time-stamped snapshots of selected Canadian public health web pages so changes remain auditable and citable.",
    line2:
      "It is an independent, non-governmental archival project — not medical advice and not a substitute for current official guidance.",
  },
  whatThisSiteIs: {
    is: "An archival record of what public health websites displayed at a specific time, with capture dates and citations.",
    isNot: "Current guidance, medical advice, or an official government website.",
    forCurrent:
      "For up-to-date recommendations, always consult the official source website",
    limitations:
      "Archived content may be incomplete, outdated, or superseded.",
  },
  workflow: {
    archiveSummary:
      "Browse and search historical snapshots. This is an archive — not current guidance or medical advice.",
    browseSummary:
      "You are viewing an archived capture — not current guidance or medical advice.",
  },
} as const;

export function buildMetaDescription(): string {
  return `${siteCopy.mission.line1} ${siteCopy.mission.line2}`;
}

export function buildBrowseDisclaimer(args: {
  captureLabel?: string | null;
}): string {
  const capturePart = args.captureLabel ? ` from ${args.captureLabel}` : "";
  return `You are viewing an archived capture${capturePart} — not current guidance or medical advice.`;
}
