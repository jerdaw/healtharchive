import type { Metadata } from "next";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import NextLink from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { EnglishControlsNotice } from "@/components/policy/EnglishControlsNotice";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy, type SiteCopy } from "@/lib/siteCopy";

function getTermsCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: "Conditions",
      title: "Conditions d’utilisation",
      intro:
        "HealthArchive.ca fournit des captures archivées à des fins de recherche, d’éducation et de référence d’intérêt public. Ces conditions décrivent l’utilisation prévue et les limites du service.",
    };
  }

  return {
    eyebrow: "Terms",
    title: "Terms of use",
    intro:
      "HealthArchive.ca provides archived snapshots for research, education, and public-interest reference. These terms describe the intended use and limitations of the service.",
  };
}

export async function generateMetadata({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getTermsCopy(locale);
  return buildPageMetadata(locale, "/terms", copy.title, copy.intro);
}

function TermsEnglishContent({ copy }: { copy: SiteCopy }) {
  return (
    <>
      <section className="ha-home-hero space-y-4">
        <h2 className="ha-section-heading">Acceptable use</h2>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          HealthArchive.ca is intended for research, journalism, education, and historical
          reference. Use archived content to cite what was published at a specific time, not as a
          substitute for current official guidance.
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>{copy.whatThisSiteIs.is}</li>
          <li>{copy.whatThisSiteIs.isNot}</li>
          <li>For up-to-date recommendations, always consult the official source website.</li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">No medical advice</h2>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          Archived content may be incomplete, outdated, or superseded. Nothing on this site should
          be interpreted as medical advice or current clinical guidance.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Citation and attribution</h2>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          When referencing archived content, include the capture date, original URL, and the
          HealthArchive snapshot link. See the cite page for recommended formats.
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          <NextLink href="/cite" className="text-ha-accent font-medium hover:text-blue-700">
            View citation guidance
          </NextLink>
          .
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Availability</h2>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          The archive is provided on an as-is basis. We do our best to maintain access, but
          availability, completeness, and replay fidelity can vary.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">Questions or corrections</h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            If you spot a metadata error or a broken replay, submit a report so we can review it.
            For other questions, use the contact page.
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <NextLink href="/report" className="text-ha-accent font-medium hover:text-blue-700">
              Report an issue
            </NextLink>{" "}
            or{" "}
            <NextLink href="/contact" className="text-ha-accent font-medium hover:text-blue-700">
              Contact the project
            </NextLink>
            .
          </p>
        </div>
      </section>
    </>
  );
}

export default async function TermsPage({
  params,
}: {
  params?: Promise<{ locale: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const copy = getTermsCopy(locale);
  const siteCopy = getSiteCopy(locale);
  const siteCopyEn = getSiteCopy("en");

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      <EnglishControlsNotice locale={locale} />

      {locale === "fr" && (
        <section className="ha-home-hero space-y-4">
          <h2 className="ha-section-heading">Résumé (français, non officiel)</h2>
          <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
            Ce résumé est fourni à titre informatif. Pour le texte officiel, consultez la version
            anglaise de cette page.
          </p>
          <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
            <li>{siteCopy.whatThisSiteIs.is}</li>
            <li>{siteCopy.whatThisSiteIs.isNot}</li>
            <li>{siteCopy.whatThisSiteIs.limitations}</li>
            <li>{siteCopy.whatThisSiteIs.forCurrent}.</li>
            <li>
              Le service est fourni « tel quel »; la disponibilité et la fidélité de relecture
              peuvent varier.
            </li>
          </ul>
          <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
            Pour citer, incluez la date de capture, l’URL originale et le lien de capture. Voir{" "}
            <Link href="/cite" className="text-ha-accent font-medium hover:text-blue-700">
              /cite
            </Link>
            .
          </p>
        </section>
      )}

      {locale === "fr" && (
        <section className="ha-home-hero ha-home-hero-plain space-y-4" id="official-english">
          <h2 className="ha-section-heading">Texte officiel (anglais)</h2>
          <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
            Le texte ci-dessous est fourni en anglais, car l’anglais fait foi.
          </p>
        </section>
      )}

      <div lang={locale === "fr" ? "en" : undefined} className="space-y-[1.125rem]">
        <TermsEnglishContent copy={siteCopyEn} />
      </div>
    </PageShell>
  );
}
