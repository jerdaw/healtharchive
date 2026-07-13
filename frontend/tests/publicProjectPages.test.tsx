import { render, screen } from "@testing-library/react";

import AboutPage from "@/app/[locale]/about/page";
import ChangelogPage from "@/app/[locale]/changelog/page";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { changelogEntriesByLocale } from "@/content/changelog";
import type { Locale } from "@/lib/i18n";

async function renderAbout(locale: Locale) {
  const ui = await AboutPage({ params: Promise.resolve({ locale }) });
  return render(ui);
}

async function renderChangelog(locale: Locale) {
  const ui = await ChangelogPage({ params: Promise.resolve({ locale }) });
  return render(<LocaleProvider locale={locale}>{ui}</LocaleProvider>);
}

describe("public project pages", () => {
  it("keeps the English About route as the independent project summary", async () => {
    await renderAbout("en");

    expect(
      screen.getByRole("heading", { level: 1, name: "Why HealthArchive.ca exists" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/project is independent and non-governmental/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Project status" })).toBeInTheDocument();
  });

  it("keeps the French About route localized and independently framed", async () => {
    await renderAbout("fr");

    expect(
      screen.getByRole("heading", { level: 1, name: "Pourquoi HealthArchive.ca existe" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/projet est indépendant et non gouvernemental/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Statut du projet" })).toBeInTheDocument();
  });

  it("renders every English changelog entry and its deeper-detail links", async () => {
    const { container } = await renderChangelog("en");

    expect(
      screen.getByRole("heading", { level: 1, name: "Project changelog" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("article")).toHaveLength(changelogEntriesByLocale.en.length);
    expect(screen.getByRole("link", { name: "backend repository" })).toHaveAttribute(
      "href",
      "https://github.com/jerdaw/healtharchive",
    );
    expect(screen.getByRole("link", { name: "dataset releases" })).toHaveAttribute(
      "href",
      "https://github.com/jerdaw/healtharchive-datasets/releases",
    );
  });

  it("renders every French changelog entry under the localized heading", async () => {
    const { container } = await renderChangelog("fr");

    expect(
      screen.getByRole("heading", { level: 1, name: "Historique du projet" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("article")).toHaveLength(changelogEntriesByLocale.fr.length);
  });
});
