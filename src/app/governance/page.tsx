import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { siteCopy } from "@/lib/siteCopy";

export default function GovernancePage() {
  return (
    <PageShell
      eyebrow="Governance"
      title="Governance & policies"
      intro="HealthArchive.ca is a public-interest archive. This page explains how we define scope, guarantee provenance, handle corrections, and respond to takedown or opt-out requests."
    >
      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading" id="mission">Mission & audience</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {siteCopy.mission.line1}
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          Our primary audience is researchers, journalists, and educators who
          need a citable record of historical guidance. The archive can also be
          useful to clinicians and the public, but it is always an archival
          reference - not current guidance.
        </p>
        <div className="ha-callout">
          <h3 className="ha-callout-title">What this is (and is not)</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed sm:text-sm">
            <li>{siteCopy.whatThisSiteIs.is}</li>
            <li>{siteCopy.whatThisSiteIs.isNot}</li>
            <li>{siteCopy.whatThisSiteIs.limitations}</li>
            <li>
              {siteCopy.whatThisSiteIs.forCurrent}. We always link to the
              original source URL.
            </li>
          </ul>
        </div>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="scope">Scope & inclusion criteria</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          HealthArchive focuses on Canadian public health sources where guidance
          changes matter for research, accountability, and historical context.
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            We prioritize federal sources such as the Public Health Agency of
            Canada and Health Canada, plus other high-impact public health
            agencies as capacity allows.
          </li>
          <li>
            Sources must be publicly accessible, stable enough to capture with
            clear provenance labeling, and relevant to public health guidance or
            surveillance.
          </li>
          <li>
            We explicitly avoid private, user-submitted, or personal-data
            sources, and we do not attempt to archive the entire internet.
          </li>
        </ul>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          Reliability and provenance take priority over expanding coverage. If a
          source cannot be archived responsibly, it stays out of scope.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="cadence">Capture cadence policy</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          HealthArchive publishes annual capture editions by default and labels
          any ad-hoc captures explicitly.
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>Annual editions are captured on Jan 01 (UTC) for each source.</li>
          <li>
            Ad-hoc captures may occur after major events or operational needs
            and are labeled as such.
          </li>
          <li>
            Change feeds and digests are edition-aware and should not be read as
            real-time monitoring.
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="provenance">Provenance commitments</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          Each snapshot is labeled and stored so that readers can verify what
          was captured and when.
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>Capture timestamp (UTC).</li>
          <li>Source organization and original URL.</li>
          <li>Permanent snapshot URL for citation.</li>
        </ul>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          Some complex pages (interactive dashboards, third-party embeds) may not
          replay perfectly. The archive reflects what the capture pipeline could
          observe at the time.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="change-tracking">Change tracking policy</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          Change tracking highlights text differences between archived captures
          so researchers and journalists can audit how guidance evolved over
          time.
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            Change summaries are descriptive (for example: sections added or
            removed) and never interpret meaning.
          </li>
          <li>
            High-noise changes (layout shifts or boilerplate updates) are
            labeled explicitly.
          </li>
          <li>
            Default feeds are edition-aware, reflecting the archive’s annual
            capture cadence rather than implying “real-time” updates.
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="corrections">Corrections policy</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          We correct factual errors in metadata, labeling, and replay access when
          they are reported and verified.
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            Examples: wrong capture date, wrong source label, broken replay or
            raw HTML.
          </li>
          <li>
            We do not change historical source content, and we do not mediate
            disputes about what an agency published.
          </li>
        </ul>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          We aim to acknowledge correction requests within 7 days. Urgent safety
          labeling issues are prioritized within 48 hours.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="takedown">Takedown / opt-out</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          HealthArchive focuses on public-interest sources, but we still review
          takedown or opt-out requests in good faith.
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            Requests must include the original URL, the snapshot URL, and the
            reason for the request.
          </li>
          <li>
            We may temporarily restrict access while reviewing a credible
            request, especially for third-party embedded content.
          </li>
          <li>
            We do not promise removal of public-interest government material
            unless there is a compelling reason.
          </li>
        </ul>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          Use the report form or email to initiate a request.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading" id="advisory">Advisory circle</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          HealthArchive is seeking a small advisory circle (2-4 people) to
          review scope, governance, and risk posture.
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>Digital preservation / library or archival expertise.</li>
          <li>Public health research or methodology experience.</li>
          <li>Science communication or journalism background.</li>
        </ul>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          Advisory participation is quarterly and policy-focused, not operational.
          If you are interested, please reach out via the contact page.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">Questions or concerns?</h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            For corrections, takedown requests, or missing pages, submit a report
            using the issue intake form. For general inquiries, see the contact
            page.
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link
              href="/report"
              className="font-medium text-ha-accent hover:text-blue-700"
            >
              Report an issue
            </Link>
            {" "}or{" "}
            <Link
              href="/contact"
              className="font-medium text-ha-accent hover:text-blue-700"
            >
              Contact the project
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
