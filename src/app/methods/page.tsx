import { PageShell } from "@/components/layout/PageShell";

export default function MethodsPage() {
  return (
    <PageShell
      eyebrow="Methods & coverage"
      title="How HealthArchive.ca is being built"
      intro="This page outlines the emerging approach for capturing, preserving, and replaying public health web content. It reflects an early-stage design and will be expanded as the infrastructure matures."
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
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">Capture methods</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          The live system is intended to use browser-based crawlers and
          standards-based web archive formats. Conceptually, each capture works
          as follows:
        </p>
        <ol className="list-decimal pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            Seed URLs are defined for each target domain and path, including
            rules about what to include or exclude.
          </li>
          <li>
            A browser-based crawler (for example, one compatible with WARC
            output) visits each page, executing JavaScript and recording
            responses.
          </li>
          <li>
            Responses are stored in archive files alongside metadata such as
            capture time, HTTP status, and content type.
          </li>
        </ol>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          For the demo, this is simulated with a small hand-curated dataset and
          static HTML snapshots served from the <code>public/demo-archive</code>{" "}
          directory.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">Storage & replay</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          In a full deployment, the archive would rely on dedicated storage for
          WARC files and a replay engine such as pywb to render historical
          snapshots in a browser. The goals for replay are:
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
          The demo interface is intentionally conservative: it shows that
          snapshot-based replay is possible while acknowledging that the
          underlying infrastructure is still being built.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">Limitations and interpretation</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed sm:text-sm">
            <li>
              <strong>Not official guidance:</strong> Archived content reflects
              what public sites showed at the time of capture. It may be
              incomplete, outdated, or superseded, and should not be treated as
              current clinical guidance.
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
