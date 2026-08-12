import { render, screen } from "@testing-library/react";

import AboutPage from "@/app/[locale]/about/page";
import ChangelogPage from "@/app/[locale]/changelog/page";
import MethodsPage from "@/app/[locale]/methods/page";
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

async function renderMethods(locale: Locale) {
  const ui = await MethodsPage({ params: Promise.resolve({ locale }) });
  return render(ui);
}

describe("public project pages", () => {
  it("keeps the English About route as the independent project summary", async () => {
    const { container } = await renderAbout("en");

    expect(
      screen.getByRole("heading", { level: 1, name: "Why HealthArchive.ca exists" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/project is independent and non-governmental/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Project status" })).toBeInTheDocument();
    expect(container).toHaveTextContent("Coverage is bounded to the current corpus");
    expect(container).not.toHaveTextContent("coverage will expand over time");
  });

  it("keeps the French About route localized and independently framed", async () => {
    const { container } = await renderAbout("fr");

    expect(
      screen.getByRole("heading", { level: 1, name: "Pourquoi HealthArchive.ca existe" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/projet est indépendant et non gouvernemental/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Statut du projet" })).toBeInTheDocument();
    expect(container).toHaveTextContent("La couverture est limitée au corpus actuel");
    expect(container).not.toHaveTextContent("la couverture s’élargira avec le temps");
  });

  it.each([
    {
      locale: "en",
      bounded: "Coverage is bounded to the existing corpus",
      cadence: "There is no default future capture cadence",
      editions:
        "reflect labeled editions in the existing corpus rather than committing to a future annual cadence",
      obsolete: ["coverage is still expanding", "The default capture cadence is an annual"],
    },
    {
      locale: "fr",
      bounded: "La couverture est limitée au corpus existant",
      cadence: "Il n’existe aucune cadence de capture future par défaut",
      editions:
        "reflètent les éditions étiquetées du corpus existant, sans engagement envers une future cadence annuelle",
      obsolete: ["la couverture s’élargit encore", "La cadence de capture par défaut est"],
    },
  ] as const)(
    "bounds current and future capture claims on the $locale methods page",
    async ({ locale, bounded, cadence, editions, obsolete }) => {
      const { container } = await renderMethods(locale);

      expect(container).toHaveTextContent(bounded);
      expect(container).toHaveTextContent(cadence);
      expect(container).toHaveTextContent(editions);
      for (const claim of obsolete) {
        expect(container).not.toHaveTextContent(claim);
      }
    },
  );

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
