import type { Metadata } from "next";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import NextLink from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { EnglishControlsNotice } from "@/components/policy/EnglishControlsNotice";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";

function getPrivacyCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: "Confidentialité",
      title: "Confidentialité",
      intro:
        "HealthArchive.ca est conçu pour minimiser la collecte de données. Il n’y a pas de comptes utilisateurs, et nous ne collectons pas de renseignements médicaux personnels.",
    };
  }

  return {
    eyebrow: "Privacy",
    title: "Privacy",
    intro:
      "HealthArchive.ca is designed to minimize data collection. There are no user accounts, and we do not collect personal health information.",
  };
}

export async function generateMetadata({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getPrivacyCopy(locale);
  return buildPageMetadata(locale, "/privacy", copy.title, copy.intro);
}

function PrivacyEnglishContent() {
  return (
    <>
      <section className="ha-home-hero space-y-4">
        <h2 className="ha-section-heading">What we collect</h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            Basic server logs (for example: IP address, request path, and user agent) may be
            retained for security, abuse prevention, and operational monitoring.
          </li>
          <li>
            Aggregate usage counts (for example: daily search requests and snapshot views) may be
            recorded without personal identifiers.
          </li>
          <li>
            When you submit a report, we store the details you provide so we can investigate and
            respond.
          </li>
          <li>
            The site stores a local theme preference in your browser so the light/dark theme
            persists between visits.
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">What we do not collect</h2>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>No user accounts or login profiles.</li>
          <li>No advertising trackers or third-party analytics by default.</li>
          <li>No patient or personal health information.</li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Issue report submissions</h2>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          Reports are used only to evaluate metadata errors, broken snapshots, missing coverage, or
          takedown requests. Please do not include personal health information in your submission.
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          <NextLink href="/report" className="text-ha-accent font-medium hover:text-blue-700">
            Report an issue
          </NextLink>
          .
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Contact</h2>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          If you have privacy questions, contact the project team.
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          <NextLink href="/contact" className="text-ha-accent font-medium hover:text-blue-700">
            Contact HealthArchive
          </NextLink>
          .
        </p>
      </section>
    </>
  );
}

export default async function PrivacyPage({
  params,
}: {
  params?: Promise<{ locale: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const copy = getPrivacyCopy(locale);

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      <EnglishControlsNotice locale={locale} />

      {locale === "fr" && (
        <section className="ha-home-hero space-y-4">
          <h2 className="ha-section-heading">Résumé (français, non officiel)</h2>
          <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
            Ce résumé est fourni à titre informatif. Pour la version officielle, consultez la
            version anglaise.
          </p>
          <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
            <li>
              Journaux serveur de base (p. ex. adresse IP, chemin de requête, agent utilisateur) à
              des fins de sécurité et d’exploitation.
            </li>
            <li>
              Comptes d’utilisation agrégés (p. ex. requêtes de recherche quotidiennes) sans
              identifiants personnels.
            </li>
            <li>Détails fournis lors d’un signalement, afin de pouvoir enquêter et répondre.</li>
            <li>Préférence locale de thème (clair/sombre) stockée dans votre navigateur.</li>
            <li>
              Aucun compte utilisateur, aucun traqueur publicitaire et aucune information médicale
              personnelle.
            </li>
          </ul>
          <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
            Pour plus d’informations, vous pouvez{" "}
            <Link href="/contact" className="text-ha-accent font-medium hover:text-blue-700">
              contacter le projet
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
        <PrivacyEnglishContent />
      </div>
    </PageShell>
  );
}
