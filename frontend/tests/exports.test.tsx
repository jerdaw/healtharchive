import { render, screen } from "@testing-library/react";

import ExportsPage from "@/app/[locale]/exports/page";

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
    expect(container.textContent).not.toContain("section/line counts");
    expect(container.querySelector(".ha-home-panel")).toBeNull();
    expect(container.querySelector(".ha-card-inset")).not.toBeNull();
  });
});
