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
});
