import { render, screen } from "@testing-library/react";

import ExportsPage from "@/app/[locale]/exports/page";
import ResearchersPage from "@/app/[locale]/researchers/page";

describe("/exports", () => {
  it("renders the exports data dictionary link", async () => {
    const ui = await ExportsPage({ params: Promise.resolve({ locale: "en" }) });
    const { container } = render(ui);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Research exports & data dictionary",
      }),
    ).toBeTruthy();

    const download = screen.getByRole("link", {
      name: "Download the data dictionary (Markdown)",
    });
    expect(download.getAttribute("href")).toBe("/exports/healtharchive-data-dictionary.md");

    expect(screen.getByRole("link", { name: "Export manifest API" }).getAttribute("href")).toMatch(
      /\/api\/exports$/,
    );
    expect(container.textContent).toContain(
      "change_type, summary, section/line counts, and change ratio.",
    );
    expect(container).toHaveTextContent("capture_backend / capture_fidelity");
    expect(container.querySelector(".ha-home-panel")).toBeNull();
    expect(container.querySelector(".ha-card-inset")).not.toBeNull();
  });

  it("renders the French data dictionary link", async () => {
    const ui = await ExportsPage({ params: Promise.resolve({ locale: "fr" }) });
    const { container } = render(ui);

    const download = screen.getByRole("link", {
      name: "Télécharger le dictionnaire de données (Markdown, alpha)",
    });
    expect(download.getAttribute("href")).toBe("/exports/healtharchive-data-dictionary.fr.md");

    expect(
      screen.getByRole("link", { name: "API du manifeste des exports" }).getAttribute("href"),
    ).toMatch(/\/api\/exports$/);
    expect(container.textContent).toContain(
      "change_type, summary, nombres de sections et de lignes, et ratio de changement.",
    );
    expect(container).toHaveTextContent("capture_backend / capture_fidelity");
    expect(container.textContent).not.toContain("section/line counts");
    expect(container.querySelector(".ha-home-panel")).toBeNull();
    expect(container.querySelector(".ha-card-inset")).not.toBeNull();
  });

  it.each([
    {
      locale: "en",
      status:
        "Accepted target posture: preserve existing releases with checksums, pause scheduled new publication during reuse and governance review, and require explicit maintainer approval and manual dispatch for any future release.",
      rollout:
        "Rollout status as of 2026-08-12: those controls are not yet published. This public status must not be deployed until the datasets repository has published and verified its manual-only workflows, rights notice, and schema guards.",
      obsolete: "Quarterly metadata-only dataset releases",
    },
    {
      locale: "fr",
      status:
        "Position cible acceptée : préserver les publications existantes avec leurs sommes de contrôle, suspendre les nouvelles publications planifiées pendant l’examen de la réutilisation et de la gouvernance, et exiger une approbation explicite du responsable ainsi qu’un lancement manuel pour toute publication future.",
      rollout:
        "État du déploiement au 12 août 2026 : ces contrôles ne sont pas encore publiés. Ce statut public ne doit pas être déployé avant que le dépôt de jeux de données ait publié et vérifié ses flux de travail manuels seulement, son avis sur les droits et ses garde-fous de schéma.",
      obsolete: "publications trimestrielles",
    },
  ] as const)(
    "shows the conditional dataset release status on $locale public surfaces",
    async ({ locale, status, rollout, obsolete }) => {
      for (const Page of [ExportsPage, ResearchersPage]) {
        const ui = await Page({ params: Promise.resolve({ locale }) });
        const { container, unmount } = render(ui);

        expect(container).toHaveTextContent(status);
        expect(container).toHaveTextContent(rollout);
        expect(container).not.toHaveTextContent(obsolete);
        unmount();
      }
    },
  );

  it.each([
    {
      locale: "en",
      bounded: "Coverage is limited to in-scope sources and successful captures.",
      obsolete: ["For bulk or custom exports", "request workflow"],
    },
    {
      locale: "fr",
      bounded: "La couverture est limitée aux sources dans le périmètre et aux captures réussies.",
      obsolete: ["exports en lot ou sur mesure", "processus de demande"],
    },
  ] as const)(
    "does not solicit custom export work on the $locale exports page",
    async ({ locale, bounded, obsolete }) => {
      const ui = await ExportsPage({ params: Promise.resolve({ locale }) });
      const { container } = render(ui);

      expect(container).toHaveTextContent(bounded);
      for (const claim of obsolete) {
        expect(container).not.toHaveTextContent(claim);
      }
    },
  );

  it.each([
    {
      locale: "en",
      bounded:
        "The archive explorer and snapshot viewer support research within the existing, bounded corpus.",
      assessment:
        "Contact does not commit the project to new capture work, broader coverage, or a custom export.",
      capacity:
        "Responses depend on available capacity; no custom export, new capture work, or response time is promised.",
      obsolete: [
        "Coverage is expanding",
        "specific capture coverage",
        "We aim to respond within 7 days",
      ],
    },
    {
      locale: "fr",
      bounded:
        "L’explorateur d’archives et le visualiseur de captures soutiennent la recherche au sein du corpus existant et délimité.",
      assessment:
        "Cette prise de contact n’engage pas le projet à effectuer de nouvelles captures, à élargir la couverture ou à produire une exportation personnalisée.",
      capacity:
        "Toute réponse dépend de la capacité disponible; aucune exportation personnalisée, nouvelle capture ou échéance de réponse n’est promise.",
      obsolete: [
        "La couverture s’élargit",
        "couverture de captures spécifique",
        "Nous visons une réponse sous 7 jours",
      ],
    },
  ] as const)(
    "bounds researcher coverage and contact commitments on $locale",
    async ({ locale, bounded, assessment, capacity, obsolete }) => {
      const ui = await ResearchersPage({ params: Promise.resolve({ locale }) });
      const { container } = render(ui);

      expect(container).toHaveTextContent(bounded);
      expect(container).toHaveTextContent(assessment);
      expect(container).toHaveTextContent(capacity);
      for (const claim of obsolete) {
        expect(container).not.toHaveTextContent(claim);
      }
    },
  );
});
