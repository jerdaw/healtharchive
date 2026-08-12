import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getArchiveCopy } from "@/lib/archiveCopy";
import { getHomeCopy } from "@/lib/homeCopy";

describe("capture and coverage claim consistency", () => {
  it("keeps English and French homepage claims bounded and assessment-gated", () => {
    const en = getHomeCopy("en");
    const fr = getHomeCopy("fr");

    expect(en.hero.developmentNote).toContain("Coverage is bounded to the current corpus");
    expect(fr.hero.developmentNote).toContain("La couverture est limitée au corpus actuel");
    expect(en.howItWorks.step1Body).toContain("create the existing corpus");
    expect(fr.howItWorks.step1Body).toContain("créer le corpus existant");
    expect(en.featuredSources.subtitle).toContain("represented in the current archive corpus");
    expect(fr.featuredSources.subtitle).toContain("représentés dans le corpus actuel");

    const enFaq = en.faq.items.map(({ q, a }) => `${q} ${a}`).join(" ");
    const frFaq = fr.faq.items.map(({ q, a }) => `${q} ${a}`).join(" ");
    expect(enFaq).toContain("No future schedule is assumed");
    expect(frFaq).toContain("Aucune cadence future n’est présumée");
    expect(enFaq).toContain("feedback for assessment");
    expect(frFaq).toContain("commentaire aux fins d’évaluation");

    for (const stale of [
      "regular schedule",
      "Coverage and frequency are still expanding",
      "Can I request a page to be archived?",
    ]) {
      expect(enFaq).not.toContain(stale);
    }
    for (const stale of [
      "calendrier régulier",
      "La couverture et la fréquence s’élargissent",
      "Puis-je demander l’archivage d’une page",
    ]) {
      expect(frFaq).not.toContain(stale);
    }
  });

  it("keeps English and French archive copy bounded to available records", () => {
    const en = getArchiveCopy("en");
    const fr = getArchiveCopy("fr");

    expect(en.feedback.earlyRelease).toContain("bounded to the current corpus");
    expect(fr.feedback.earlyRelease).toContain("limitée au corpus actuel");
    expect(en.browseBySource.intro).toContain("bounded current corpus");
    expect(fr.browseBySource.intro).toContain("corpus actuel délimité");
    expect(en.feedback.earlyRelease).not.toContain("still expanding");
    expect(fr.feedback.earlyRelease).not.toContain("encore en expansion");
  });

  it("does not advertise a standing advisory or outside-review campaign", () => {
    const governance = readFileSync(
      resolve(process.cwd(), "src/app/[locale]/governance/page.tsx"),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(governance).toContain("No standing advisory recruitment");
    expect(governance).toContain("without a commitment to begin a review or collaboration");
    expect(governance).not.toContain("is seeking a small advisory circle");
    expect(governance).not.toContain("Advisory participation is quarterly");
  });

  it.each([
    {
      surface: "governance",
      source: "src/app/[locale]/governance/page.tsx",
      stale: [
        "publishes annual capture editions by default",
        "Annual editions are captured on Jan 01",
        "éditions annuelles par défaut",
      ],
    },
    {
      surface: "changes",
      source: "src/app/[locale]/changes/page.tsx",
      stale: ["Annual editions are captured on Jan 01", "capturées le 1er janvier"],
    },
    {
      surface: "digest",
      source: "src/app/[locale]/digest/page.tsx",
      stale: ["Annual editions are captured on Jan 01", "capturées le 1er janvier"],
    },
    {
      surface: "status",
      source: "src/app/[locale]/status/page.tsx",
      stale: ["Annual editions are captured on Jan 01", "capturées le 1er janvier"],
    },
  ] as const)(
    "keeps $surface edition history separate from future capture commitments",
    ({ source, stale }) => {
      const text = readFileSync(resolve(process.cwd(), source), "utf8").replace(/\s+/g, " ");

      expect(text).toContain("separately authorized data-continuity decision");
      expect(text).toContain("décision de continuité des données autorisée séparément");
      for (const claim of stale) {
        expect(text).not.toContain(claim);
      }
    },
  );
});
