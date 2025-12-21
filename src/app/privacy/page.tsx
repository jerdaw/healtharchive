import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Privacy"
      title="Privacy"
      intro="HealthArchive.ca is designed to minimize data collection. We do not run user accounts and we do not collect patient information."
    >
      <section className="ha-home-hero space-y-4">
        <h2 className="ha-section-heading">What we collect</h2>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            Basic server logs (for example: IP address, request path, and user
            agent) may be retained for security and operational monitoring.
          </li>
          <li>
            Aggregate usage counts (for example: daily search requests and
            snapshot views) may be recorded without personal identifiers.
          </li>
          <li>
            When you submit a report, we store the details you provide so we can
            investigate and respond.
          </li>
          <li>
            The site stores a local theme preference in your browser so the
            light/dark theme persists between visits.
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">What we do not collect</h2>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>No user accounts or login profiles.</li>
          <li>No advertising trackers or third-party analytics by default.</li>
          <li>No patient or personal health information.</li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Issue report submissions</h2>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          Reports are used only to evaluate metadata errors, broken snapshots,
          missing coverage, or takedown requests. Please do not include personal
          health information in your submission.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          <Link
            href="/report"
            className="font-medium text-ha-accent hover:text-blue-700"
          >
            Report an issue
          </Link>
          .
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Contact</h2>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          If you have privacy questions, contact the project team.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          <Link
            href="/contact"
            className="font-medium text-ha-accent hover:text-blue-700"
          >
            Contact HealthArchive
          </Link>
          .
        </p>
      </section>
    </PageShell>
  );
}
