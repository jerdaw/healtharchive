import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { getApiBaseUrl } from "@/lib/api";

export default function ExportsPage() {
  const apiBase = getApiBaseUrl();
  const manifestUrl = `${apiBase}/api/exports`;
  const datasetReleasesUrl = "https://github.com/jerdaw/healtharchive-datasets/releases";

  return (
    <PageShell
      eyebrow="Exports"
      title="Research exports & data dictionary"
      intro="HealthArchive provides metadata-only exports for research and reproducibility. Exports do not include raw HTML or full diff bodies."
    >
      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">Exports overview</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          Use the export manifest to discover available formats and limits.
        </p>
        <div className="ha-card ha-home-panel p-4 sm:p-5 text-xs text-slate-800 sm:text-sm space-y-2">
          <p className="text-ha-muted">Export manifest</p>
          <a
            className="font-medium text-ha-accent hover:text-blue-700"
            href={manifestUrl}
          >
            {manifestUrl}
          </a>
        </div>
        <div className="ha-callout">
          <h3 className="ha-callout-title">Dataset releases</h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            Quarterly metadata-only dataset releases are published on GitHub with
            checksums.
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link
              className="font-medium text-ha-accent hover:text-blue-700"
              href={datasetReleasesUrl}
            >
              HealthArchive dataset releases
            </Link>
          </p>
        </div>
        <div className="ha-callout">
          <h3 className="ha-callout-title">Download / print</h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            <a
              className="font-medium text-ha-accent hover:text-blue-700"
              href="/exports/healtharchive-data-dictionary.md"
            >
              Download the data dictionary (Markdown)
            </a>
            {" "}or use your browser’s print dialog to save as PDF.
          </p>
        </div>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">Snapshots export (fields)</h2>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            <strong>snapshot_id</strong>: numeric snapshot ID.
          </li>
          <li>
            <strong>source_code / source_name</strong>: source identifiers.
          </li>
          <li>
            <strong>captured_url</strong>: URL captured at crawl time.
          </li>
          <li>
            <strong>normalized_url_group</strong>: canonical grouping key.
          </li>
          <li>
            <strong>capture_timestamp_utc</strong>: UTC timestamp (ISO-8601).
          </li>
          <li>
            <strong>language</strong>, <strong>status_code</strong>, <strong>mime_type</strong>,
            <strong>title</strong>: metadata when available.
          </li>
          <li>
            <strong>job_id / job_name</strong>: edition anchor (if available).
          </li>
          <li>
            <strong>snapshot_url</strong>: stable public URL for citation.
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">Changes export (fields)</h2>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            <strong>change_id</strong>: numeric change event ID.
          </li>
          <li>
            <strong>source_code / source_name</strong>, <strong>normalized_url_group</strong>.
          </li>
          <li>
            <strong>from_snapshot_id / to_snapshot_id</strong> and corresponding UTC timestamps.
          </li>
          <li>
            <strong>change_type</strong>, <strong>summary</strong>, section/line counts, and change ratio.
          </li>
          <li>
            <strong>high_noise</strong> and <strong>diff_truncated</strong> flags.
          </li>
          <li>
            <strong>diff_version</strong>, <strong>normalization_version</strong>, <strong>computed_at_utc</strong>.
          </li>
          <li>
            <strong>compare_url</strong>: stable public URL for the diff view.
          </li>
        </ul>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-5">
        <h2 className="ha-section-heading">Limitations</h2>
        <ul className="list-disc pl-5 text-sm sm:text-base text-ha-muted leading-relaxed space-y-1">
          <li>
            Exports reflect captured content, not real-time source updates.
          </li>
          <li>
            Coverage is limited to in-scope sources and successful captures.
          </li>
          <li>
            Replay fidelity varies by site and asset type.
          </li>
        </ul>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          For bulk or custom exports, see the{" "}
          <Link className="font-medium text-ha-accent hover:text-blue-700" href="/researchers">
            researchers page
          </Link>
          {" "}for the request workflow.
        </p>
      </section>
    </PageShell>
  );
}
