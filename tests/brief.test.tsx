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
});
