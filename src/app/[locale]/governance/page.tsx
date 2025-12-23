import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import NextLink from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { EnglishControlsNotice } from "@/components/policy/EnglishControlsNotice";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy, type SiteCopy } from "@/lib/siteCopy";

function GovernanceEnglishContent({ copy }: { copy: SiteCopy }) {
  return (
    <>
      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading" id="mission">
          Mission & audience
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">{copy.mission.line1}</p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          Our primary audience is researchers, journalists, and educators who need a citable record
          of historical guidance. The archive can also be useful to clinicians and the public, but
          it is always an archival reference - not current guidance.
        </p>
        <div className="ha-callout">
          <h3 className="ha-callout-title">What this is (and is not)</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed sm:text-sm">
            <li>{copy.whatThisSiteIs.is}</li>
            <li>{copy.whatThisSiteIs.isNot}</li>
            <li>{copy.whatThisSiteIs.limitations}</li>
            <li>{copy.whatThisSiteIs.forCurrent}. We always link to the original source URL.</li>
          </ul>
        </div>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="scope">
          Scope & inclusion criteria
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          HealthArchive focuses on Canadian public health sources where guidance changes matter for
          research, accountability, and historical context.
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            We prioritize federal sources such as the Public Health Agency of Canada and Health
            Canada, plus other high-impact public health agencies as capacity allows.
          </li>
          <li>
            Sources must be publicly accessible, stable enough to capture with clear provenance
            labeling, and relevant to public health guidance or surveillance.
          </li>
          <li>
            We explicitly avoid private, user-submitted, or personal-data sources, and we do not
            attempt to archive the entire internet.
          </li>
        </ul>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          Reliability and provenance take priority over expanding coverage. If a source cannot be
          archived responsibly, it stays out of scope.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="cadence">
          Capture cadence policy
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          HealthArchive publishes annual capture editions by default and labels any ad-hoc captures
          explicitly.
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>Annual editions are captured on Jan 01 (UTC) for each source.</li>
          <li>
            Ad-hoc captures may occur after major events or operational needs and are labeled as
            such.
          </li>
          <li>
            Change feeds and digests are edition-aware and should not be read as real-time
            monitoring.
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="provenance">
          Provenance commitments
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          Each snapshot is labeled and stored so that readers can verify what was captured and when.
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>Capture timestamp (UTC).</li>
          <li>Source organization and original URL.</li>
          <li>Permanent snapshot URL for citation.</li>
        </ul>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          Some complex pages (interactive dashboards, third-party embeds) may not replay perfectly.
          The archive reflects what the capture pipeline could observe at the time.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="change-tracking">
          Change tracking policy
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          Change tracking highlights text differences between archived captures so researchers and
          journalists can audit how guidance evolved over time.
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            Change summaries are descriptive (for example: sections added or removed) and never
            interpret meaning.
          </li>
          <li>High-noise changes (layout shifts or boilerplate updates) are labeled explicitly.</li>
          <li>
            Default feeds are edition-aware, reflecting the archive’s annual capture cadence rather
            than implying “real-time” updates.
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="corrections">
          Corrections policy
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          We correct factual errors in metadata, labeling, and replay access when they are reported
          and verified.
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>Examples: wrong capture date, wrong source label, broken replay or raw HTML.</li>
          <li>
            We do not change historical source content, and we do not mediate disputes about what an
            agency published.
          </li>
        </ul>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          We aim to acknowledge correction requests within 7 days. Urgent safety labeling issues are
          prioritized within 48 hours.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="takedown">
          Takedown / opt-out
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          HealthArchive focuses on public-interest sources, but we still review takedown or opt-out
          requests in good faith.
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            Requests must include the original URL, the snapshot URL, and the reason for the
            request.
          </li>
          <li>
            We may temporarily restrict access while reviewing a credible request, especially for
            third-party embedded content.
          </li>
          <li>
            We do not promise removal of public-interest government material unless there is a
            compelling reason.
          </li>
        </ul>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          Use the report form or email to initiate a request.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="advisory">
          Advisory circle
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          HealthArchive is seeking a small advisory circle (2-4 people) to review scope, governance,
          and risk posture.
        </p>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>Digital preservation / library or archival expertise.</li>
          <li>Public health research or methodology experience.</li>
          <li>Science communication or journalism background.</li>
        </ul>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          Advisory participation is quarterly and policy-focused, not operational. If you are
          interested, please reach out via the contact page.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">Questions or concerns?</h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            For corrections, takedown requests, or missing pages, submit a report using the issue
            intake form. For general inquiries, see the contact page.
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

export default async function GovernancePage({
  params,
}: {
  params?: Promise<{ locale: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const siteCopy = getSiteCopy(locale);
  const siteCopyEn = getSiteCopy("en");

  return (
    <PageShell
      eyebrow={locale === "fr" ? "Gouvernance" : "Governance"}
      title={locale === "fr" ? "Gouvernance et politiques" : "Governance & policies"}
      intro={
        locale === "fr"
          ? "HealthArchive.ca est une archive d’intérêt public. Cette page explique comment nous définissons la portée, garantissons la provenance, gérons les corrections et répondons aux demandes de retrait ou d’exclusion."
          : "HealthArchive.ca is a public-interest archive. This page explains how we define scope, guarantee provenance, handle corrections, and respond to takedown or opt-out requests."
      }
    >
      <EnglishControlsNotice locale={locale} />

      {locale === "fr" && (
        <section className="ha-home-hero space-y-5">
          <h2 className="ha-section-heading">Résumé (français, non officiel)</h2>
          <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
            Ce résumé est fourni à titre informatif. Pour le texte officiel, consultez la version
            anglaise (ci-dessous ou via le lien vers l’anglais en haut de la page).
          </p>
          <div className="ha-callout">
            <h3 className="ha-callout-title">Points clés</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed sm:text-sm">
              <li>
                <strong>Mission :</strong> {siteCopy.mission.line1}
              </li>
              <li>
                <strong>Portée :</strong> sources canadiennes de santé publique à forte valeur, avec
                règles d’inclusion/exclusion explicites.
              </li>
              <li>
                <strong>Cadence :</strong> éditions annuelles par défaut, avec captures ponctuelles
                étiquetées.
              </li>
              <li>
                <strong>Provenance :</strong> horodatage (UTC), URL originale, et URL stable de
                capture pour la citation.
              </li>
              <li>
                <strong>Corrections :</strong> correction des erreurs de métadonnées et de
                relecture, sans modification du contenu historique de la source.
              </li>
              <li>
                <strong>Retrait / exclusion :</strong> examen de bonne foi des demandes, avec
                priorité aux enjeux crédibles de sécurité ou de contenu tiers intégré.
              </li>
            </ul>
          </div>
          <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
            Accès rapide au texte officiel (anglais) :{" "}
            <a href="#mission" className="text-ha-accent font-medium hover:text-blue-700">
              Mission
            </a>
            ,{" "}
            <a href="#scope" className="text-ha-accent font-medium hover:text-blue-700">
              Portée
            </a>
            ,{" "}
            <a href="#cadence" className="text-ha-accent font-medium hover:text-blue-700">
              Cadence
            </a>
            ,{" "}
            <a href="#provenance" className="text-ha-accent font-medium hover:text-blue-700">
              Provenance
            </a>
            ,{" "}
            <a href="#corrections" className="text-ha-accent font-medium hover:text-blue-700">
              Corrections
            </a>
            ,{" "}
            <a href="#takedown" className="text-ha-accent font-medium hover:text-blue-700">
              Retrait
            </a>
            .
          </p>
          <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
            Pour signaler un problème ou une demande de retrait :{" "}
            <Link href="/report" className="text-ha-accent font-medium hover:text-blue-700">
              /report
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

      <div lang={locale === "fr" ? "en" : undefined}>
        <GovernanceEnglishContent copy={siteCopyEn} />
      </div>
    </PageShell>
  );
}
