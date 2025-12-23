import { render, screen } from "@testing-library/react";

import ExportsPage from "@/app/[locale]/exports/page";

describe("/exports", () => {
  it("renders the exports data dictionary link", async () => {
    const ui = await ExportsPage();
    render(ui);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Research exports & data dictionary",
      }),
    ).toBeInTheDocument();

    const download = screen.getByRole("link", {
      name: "Download the data dictionary (Markdown)",
    });
    expect(download).toHaveAttribute("href", "/exports/healtharchive-data-dictionary.md");
  });

  it("renders the French data dictionary link", async () => {
    const ui = await ExportsPage({ params: Promise.resolve({ locale: "fr" }) });
    render(ui);

    const download = screen.getByRole("link", {
      name: "Télécharger le dictionnaire de données (Markdown, alpha)",
    });
    expect(download).toHaveAttribute("href", "/exports/healtharchive-data-dictionary.fr.md");
  });
});
