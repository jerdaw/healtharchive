import { render, screen } from "@testing-library/react";

import BriefPage from "@/app/[locale]/brief/page";

describe("/brief", () => {
  it("renders a one-page brief with a downloadable markdown link", async () => {
    const ui = await BriefPage();
    render(ui);

    expect(
      screen.getByRole("heading", { level: 1, name: "One-page project brief" }),
    ).toBeInTheDocument();

    const download = screen.getByRole("link", {
      name: "Download this brief (Markdown)",
    });
    expect(download).toHaveAttribute("href", "/partner-kit/healtharchive-brief.md");
  });

  it("renders the French brief download link", async () => {
    const ui = await BriefPage({ params: Promise.resolve({ locale: "fr" }) });
    render(ui);

    const download = screen.getByRole("link", {
      name: "Télécharger cette fiche (Markdown, alpha)",
    });
    expect(download).toHaveAttribute("href", "/partner-kit/healtharchive-brief.fr.md");
  });
});
