import { render, screen } from "@testing-library/react";

import GovernancePage from "@/app/[locale]/governance/page";
import PrivacyPage from "@/app/[locale]/privacy/page";
import TermsPage from "@/app/[locale]/terms/page";

describe("policy pages", () => {
  it("shows the English-governs notice on /terms", async () => {
    const ui = await TermsPage();
    render(ui);

    expect(screen.getByRole("heading", { level: 1, name: "Terms of use" })).toBeInTheDocument();
    expect(screen.getByTestId("english-controls-notice")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "English version governs" })).toBeInTheDocument();
  });

  it("shows the English-governs notice on /privacy", async () => {
    const ui = await PrivacyPage();
    render(ui);

    expect(screen.getByRole("heading", { level: 1, name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByTestId("english-controls-notice")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "English version governs" })).toBeInTheDocument();
  });

  it("shows the English-governs notice on /governance", async () => {
    const ui = await GovernancePage();
    render(ui);

    expect(
      screen.getByRole("heading", { level: 1, name: "Governance & policies" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("english-controls-notice")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "English version governs" })).toBeInTheDocument();
  });
});
