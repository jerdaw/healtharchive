import { PageShell } from "@/components/layout/PageShell";

export default function MethodsPage() {
  return (
    <PageShell
      eyebrow="Methods & coverage"
      title="How HealthArchive.ca is being built"
      intro="This page outlines how HealthArchive.ca captures, preserves, indexes, and replays snapshots of public health web content. The project is in development and coverage is still expanding, but the core archive pipeline is already in place."
    >
      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">Scope of the archive (early phase)</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          The initial focus is on federal Canadian public health sites whose
          content directly underpins clinical guidance, surveillance, or
          high-impact public communication. Examples include:
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            Public Health Agency of Canada (e.g., disease pages, surveillance
            reports, immunization guidance).
          </li>
          <li>
            Health Canada (e.g., vaccine and drug pages, environmental and
            product safety information).
          </li>
        </ul>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          Future iterations may consider provincial/territorial sources or
          selected international comparators where appropriate, but the backbone
          will remain Canadian public health information.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          Scope is intentionally constrained and defined with explicit inclusion
          and exclusion rules per source so the project can prioritize reliable
          provenance over breadth.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          The default capture cadence is an annual “edition” captured on{" "}
          <span className="font-medium">Jan 01 (UTC)</span> for each source, with
          occasional ad-hoc captures when major events or operational needs
          justify it. Ad-hoc captures are explicitly labeled so readers can
          distinguish them from the annual edition.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">Capture methods</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          HealthArchive.ca uses browser-based crawling and standards-based web
          archive formats (WARCs). At a high level, each capture works as
          follows:
        </p>
        <ol className="list-decimal pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            Seed URLs are defined for each target domain and path, including
            rules about what to include or exclude.
          </li>
          <li>
            A browser-based crawler visits in-scope pages, executes JavaScript
            where needed, and records responses into web archive files.
          </li>
          <li>
            Responses are stored in archive files alongside metadata such as
            capture time, HTTP status, and content type.
          </li>
        </ol>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          Captures are stored in WARCs and indexed into a searchable database.
          The public site replays archived HTML via the backend and, when
          available, can also offer higher-fidelity browsing through a replay
          service. Replay fidelity varies by site and content type.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          Date range filters in the archive explorer use UTC capture dates.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">Storage & replay</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          The archive relies on dedicated storage for WARC files. When replay is
          enabled, a replay engine such as pywb can render higher-fidelity
          historical snapshots in a browser. The goals for replay are:
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>Preserve the original URL structure where possible.</li>
          <li>
            Clearly label capture timestamps and make it obvious that the view
            is archival, not live.
          </li>
          <li>
            Maintain interactive elements (e.g., dashboards) as faithfully as
            technical constraints allow.
          </li>
        </ul>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          The interface is intentionally conservative: it prioritizes clarity
          that you are viewing archived content. Some interactive dashboards,
          embedded visualizations, or third-party assets may not replay perfectly
          because of JavaScript, API, or hosting constraints.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">Change tracking</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          HealthArchive.ca compares archived captures to highlight text changes
          between editions. This is designed for auditability and citation, not
          interpretation.
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>Changes are computed from archived HTML captures.</li>
          <li>
            Comparisons are descriptive only (for example: sections added,
            removed, or updated) and do not provide guidance.
          </li>
          <li>
            Change feeds are edition-aware by default, reflecting the archive’s
            annual capture cadence.
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">Limitations and interpretation</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed sm:text-sm">
            <li>
              <strong>Not official guidance:</strong> Archived content reflects
              what public sites showed at the time of capture. It may be
              incomplete, outdated, or superseded, and should not be treated as
              current clinical guidance or medical advice.
            </li>
            <li>
              <strong>Sampling and coverage:</strong> Early phases focus on
              specific high-value domains and paths. Coverage gaps and known
              limitations will be documented so that “absence” of an archived
              page is not misinterpreted.
            </li>
            <li>
              <strong>Technical artefacts:</strong> Some interactive dashboards,
              embedded visualizations, or third-party assets may not replay
              perfectly because of JavaScript, API, or hosting constraints.
            </li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
