import { PageShell } from "@/components/layout/PageShell";

export default function ResearchersPage() {
  return (
    <PageShell
      eyebrow="For researchers"
      title="Using HealthArchive.ca for research and analysis"
      intro="This project is being designed so that epidemiologists, health services researchers, policy analysts, and data journalists can reliably reconstruct what Canadian public health sites showed at specific points in time."
    >
      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">Examples of research use cases</h2>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            <strong>Policy and guideline history:</strong> Tracking how public
            health guidance on subjects such as COVID-19 vaccination, seasonal
            influenza, or naloxone distribution has changed over time.
          </li>
          <li>
            <strong>Reproducibility of analyses:</strong> Linking analytic work
            to the exact wording and tables visible on a given date, rather than
            relying on whatever the current version of a page shows.
          </li>
          <li>
            <strong>Media and communication studies:</strong> Examining how
            risk communication, disclaimers, or focus on specific populations
            evolved across different periods.
          </li>
          <li>
            <strong>Audit and accountability:</strong> Comparing archived
            content with later messaging to understand shifts in emphasis,
            framing, or scope.
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">Working with the archive</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          The archive explorer and snapshot viewer are designed to support
          research workflows, but the interface is still evolving. Coverage is
          expanding, and some pages may be missing or incomplete.
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            Keyword search with filters by source.
          </li>
          <li>
            A pages view (latest capture per URL) and a snapshots view (all
            captures).
          </li>
          <li>
            A “browse by source” view summarizing coverage for each source.
          </li>
          <li>
            Snapshot detail pages with capture metadata and the archived HTML
            when available.
          </li>
          <li>
            Change tracking and compare views that highlight descriptive text
            differences between archived captures.
          </li>
        </ul>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          If you need bulk access, reproducible exports, or specific capture
          coverage for a study, please reach out via the contact page.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">Citing HealthArchive.ca</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          Until formal citation guidance is published, a pragmatic format for
          referencing an archived page from HealthArchive.ca is:
        </p>
        <div className="ha-card ha-home-panel p-4 sm:p-5 text-xs text-slate-800 sm:text-sm space-y-1">
          HealthArchive.ca Project. “&lt;Page title&gt;” (snapshot from &lt;
          capture date/time&gt;). Archived copy of &lt;original agency&gt; web
          page (&lt;original URL&gt;). Accessed &lt;access date&gt;. Available
          from: &lt;HealthArchive.ca snapshot URL&gt;.
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          For example, for a COVID-19 epidemiology update snapshot:
        </p>
        <div className="ha-card ha-home-panel p-4 sm:p-5 text-xs text-slate-800 sm:text-sm space-y-1">
          HealthArchive.ca Project. “COVID-19 epidemiology update: Canada”
          (snapshot from 15 Feb 2025). Archived copy of Public Health Agency of
          Canada web page (https://www.canada.ca/...). Accessed 3 Dec 2025.
          Available from: https://healtharchive.ca/snapshot/12345.
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          Snapshot URLs in the live archive typically use a numeric ID (as in
          the example above). When citing, use the exact snapshot URL and
          capture date/time shown on the snapshot detail page you accessed.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          When citing a comparison, include both snapshot URLs (A and B), their
          capture dates, and the HealthArchive compare URL.
        </p>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            Planned researcher-focused capabilities (not yet implemented)
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed sm:text-sm">
            <li>
              Machine-readable exports describing changes over time for selected
              URLs or search queries.
            </li>
            <li>
              Lightweight APIs for programmatic querying of snapshot metadata,
              with rate limits and sustainability in mind.
            </li>
          </ul>
          {/* TODO: add exports + research APIs once change tracking data is stable. */}
        </div>
      </section>
    </PageShell>
  );
}
