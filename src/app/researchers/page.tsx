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
            health guidance on topics such as COVID-19 vaccination, seasonal
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

      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">Working with the demo archive</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          The current demo offers a deliberately small, hand-curated dataset.
          It&apos;s meant to illustrate how a future research-grade interface
          could behave rather than to serve as a full corpus.
        </p>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            A small set of example records from federal health sites (e.g.,
            PHAC, Health Canada).
          </li>
          <li>
            A search interface that filters records by keywords, source, and
            topic.
          </li>
          <li>
            A “browse by source” view summarizing which demo records exist for
            each agency.
          </li>
          <li>
            HTML snapshot stubs that stand in for real archived pages and show
            how replay URLs will be structured.
          </li>
        </ul>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          In the live system, these demo components would be replaced by a real
          index and replay service backed by WARC files and dedicated storage.
        </p>
      </section>

      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">Citing HealthArchive.ca</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          Until formal citation guidance is published, a pragmatic format for
          referencing an archived page from HealthArchive.ca is:
        </p>
        <div className="ha-card ha-home-panel p-4 sm:p-5 text-xs text-slate-800 sm:text-sm space-y-1">
          HealthArchive.ca Project. “&lt;Page title&gt;” (snapshot from &lt;
          capture date&gt;). Archived copy of &lt;original agency&gt; web page
          (&lt;original URL&gt;). Accessed &lt;access date&gt;. Available from:
          &lt;HealthArchive.ca archived URL&gt;.
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          For example, for a COVID-19 epidemiology update snapshot:
        </p>
        <div className="ha-card ha-home-panel p-4 sm:p-5 text-xs text-slate-800 sm:text-sm space-y-1">
          HealthArchive.ca Project. “COVID-19 epidemiology update: Canada”
          (snapshot from 15 Feb 2025). Archived copy of Public Health Agency of
          Canada web page (https://www.canada.ca/...). Accessed 3 Dec 2025.
          Available from: https://healtharchive.ca/snapshot/phac-2025-02-15-covid-epi.
        </div>
      </section>

      <section className="ha-home-hero space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            Planned researcher-focused capabilities (not yet implemented)
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed sm:text-sm">
            <li>
              Snapshot-level version history for individual URLs, exposing a
              timeline of captures for each page.
            </li>
            <li>
              Side-by-side comparison views to highlight textual changes between
              two archived snapshots.
            </li>
            <li>
              Machine-readable exports describing changes over time for selected
              URLs or topics.
            </li>
            <li>
              Lightweight APIs for programmatic querying of snapshot metadata,
              with rate limits and sustainability in mind.
            </li>
          </ul>
          {/* TODO: implement diff generation, comparison UI, and version tracking once the underlying archive is wired up. */}
        </div>
      </section>
    </PageShell>
  );
}
