import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { fetchChangeCompare } from "@/lib/api";
import { siteCopy } from "@/lib/siteCopy";

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return value;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const toParam = typeof params.to === "string" ? params.to : "";
  const fromParam = typeof params.from === "string" ? params.from : "";

  const toSnapshotId = Number.parseInt(toParam, 10);
  const fromSnapshotId = Number.parseInt(fromParam, 10);

  if (!toSnapshotId || Number.isNaN(toSnapshotId)) {
    return (
      <PageShell
        eyebrow="Compare"
        title="Compare captures"
        intro="Select two archived captures to view descriptive text differences."
      >
        <div className="ha-callout">
          <h2 className="ha-callout-title">Compare unavailable</h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            No snapshot was selected for comparison. Visit a snapshot page to
            choose captures to compare.
          </p>
        </div>
      </PageShell>
    );
  }

  let compare = null;
  try {
    compare = await fetchChangeCompare({
      toSnapshotId,
      fromSnapshotId: Number.isNaN(fromSnapshotId) ? null : fromSnapshotId,
    });
  } catch {
    compare = null;
  }

  return (
    <PageShell
      eyebrow="Compare"
      title="Compare archived captures"
      intro="This view highlights text differences between two archived captures. It does not interpret meaning or provide guidance."
    >
      {!compare && (
        <div className="ha-callout">
          <h2 className="ha-callout-title">Comparison unavailable</h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            The comparison could not be loaded. Ensure change tracking is
            enabled and the selected capture pair has a precomputed diff.
          </p>
        </div>
      )}

      {compare && (
        <section className="space-y-6">
          <div className="ha-callout">
            <h2 className="ha-callout-title">Descriptive changes only</h2>
            <p className="mt-2 text-xs leading-relaxed sm:text-sm">
              This comparison highlights text changes between archived captures.
              It does not interpret the change or provide medical advice.
              {` `}{siteCopy.whatThisSiteIs.forCurrent}
            </p>
          </div>

          <div className="ha-grid-2">
            <div className="ha-card space-y-2">
              <p className="text-xs text-ha-muted">Earlier capture</p>
              {compare.fromSnapshot ? (
                <>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {compare.fromSnapshot.title ?? "Archived snapshot"}
                  </h3>
                  <p className="text-xs text-ha-muted">
                    {formatDate(compare.fromSnapshot.captureDate)}
                  </p>
                  <p className="text-xs text-ha-muted">
                    {compare.fromSnapshot.jobName ?? "Edition capture"}
                  </p>
                  <div className="pt-2">
                    <Link
                      href={`/snapshot/${compare.fromSnapshot.snapshotId}`}
                      className="ha-btn-secondary text-xs"
                    >
                      View snapshot
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-xs text-ha-muted">
                  This is the first archived capture for this page.
                </p>
              )}
            </div>
            <div className="ha-card space-y-2">
              <p className="text-xs text-ha-muted">Later capture</p>
              <h3 className="text-sm font-semibold text-slate-900">
                {compare.toSnapshot.title ?? "Archived snapshot"}
              </h3>
              <p className="text-xs text-ha-muted">
                {formatDate(compare.toSnapshot.captureDate)}
              </p>
              <p className="text-xs text-ha-muted">
                {compare.toSnapshot.jobName ?? "Edition capture"}
              </p>
              <div className="pt-2">
                <Link
                  href={`/snapshot/${compare.toSnapshot.snapshotId}`}
                  className="ha-btn-secondary text-xs"
                >
                  View snapshot
                </Link>
              </div>
            </div>
          </div>

          {compare.event.highNoise && (
            <div className="ha-callout border-amber-300 bg-amber-50 text-amber-900">
              <h3 className="ha-callout-title">High-noise change</h3>
              <p className="mt-2 text-xs leading-relaxed sm:text-sm">
                This change may include layout or boilerplate updates (such as
                navigation or footer adjustments). Treat the diff as
                descriptive, not definitive.
              </p>
            </div>
          )}

          <div className="ha-card space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ha-muted">
              <span className="ha-tag">{compare.event.changeType}</span>
              <span>{compare.event.summary ?? "Archived text updated."}</span>
            </div>
            {compare.diffHtml ? (
              <div
                className="ha-diff"
                dangerouslySetInnerHTML={{ __html: compare.diffHtml }}
              />
            ) : (
              <p className="text-xs text-ha-muted">
                No diff is available for this capture pair. This can happen
                when content is unchanged or stored in a non-HTML format.
              </p>
            )}
            {compare.diffTruncated && (
              <p className="text-xs text-ha-muted">
                Diff output was truncated for readability.
              </p>
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}
