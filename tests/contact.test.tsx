import { render, screen } from "@testing-library/react";

import ContactPage from "@/app/[locale]/contact/page";

describe("/contact", () => {
  it("shows the configured email addresses", async () => {
    const ui = await ContactPage();
    render(ui);

    const primary = screen.getByRole("link", {
      name: "contact@healtharchive.ca",
    });
    expect(primary).toHaveAttribute("href", "mailto:contact@healtharchive.ca");
  });
});
