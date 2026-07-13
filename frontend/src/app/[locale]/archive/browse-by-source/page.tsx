import type { Metadata } from "next";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { PageShell } from "@/components/layout/PageShell";
import { getSourcesSummary } from "@/data/demo-records";
import {
  fetchSources,
  fetchSourcesLocalized,
  getApiBaseUrl,
  type SourceSummary as ApiSourceSummary,
} from "@/lib/api";
import { getArchiveCopy } from "@/lib/archiveCopy";
import { formatDate, formatNumber } from "@/lib/format";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";
import { getLocalizedSourceHomepage, getLocalizedSourceName } from "@/lib/sources";

type SourceSummaryLike = {
  sourceCode: string;
  sourceName: string;
  baseUrl?: string | null;
  description?: string | null;
  recordCount: number;
  firstCapture: string;
  lastCapture: string;
  latestRecordId: number | string | null;
  entryRecordId: number | string | null;
  entryBrowseUrl?: string | null;
  entryPreviewUrl?: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getArchiveCopy(locale).browseBySource;
  return buildPageMetadata(locale, "/archive/browse-by-source", copy.title, copy.intro);
}

export default async function BrowseBySourcePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const copy = getArchiveCopy(locale).browseBySource;
  const siteCopy = getSiteCopy(locale);

  let summaries: SourceSummaryLike[] = getSourcesSummary().map((s) => ({
    ...s,
    sourceName:
      locale === "fr" ? getLocalizedSourceName(locale, s.sourceCode, s.sourceName) : s.sourceName,
    baseUrl: locale === "fr" ? getLocalizedSourceHomepage(locale, s.sourceCode, null) : null,
    entryRecordId: s.latestRecordId,
    entryBrowseUrl: null,
    entryPreviewUrl: null,
  }));
  let usingBackend = false;

  // Try backend /api/sources first; fall back to the demo summary on error.
  try {
    const apiSummaries =
      locale === "fr" ? await fetchSourcesLocalized({ lang: "fr" }) : await fetchSources();
    summaries = apiSummaries.map((s: ApiSourceSummary) => ({
      sourceCode: s.sourceCode,
      sourceName:
        locale === "fr" ? getLocalizedSourceName(locale, s.sourceCode, s.sourceName) : s.sourceName,
      baseUrl:
        locale === "fr"
          ? getLocalizedSourceHomepage(locale, s.sourceCode, s.baseUrl ?? null)
          : (s.baseUrl ?? null),
      description: s.description ?? null,
      recordCount: s.recordCount,
      firstCapture: s.firstCapture,
      lastCapture: s.lastCapture,
      latestRecordId: s.latestRecordId,
      entryRecordId: s.entryRecordId ?? null,
      entryBrowseUrl: s.entryBrowseUrl ?? null,
      entryPreviewUrl: s.entryPreviewUrl ?? null,
    }));
    summaries = summaries.filter((s) => s.sourceCode !== "test");
    summaries = summaries.sort((a, b) => {
      const diff = (b.recordCount ?? 0) - (a.recordCount ?? 0);
      if (diff !== 0) return diff;
      return a.sourceName.localeCompare(b.sourceName);
    });
    usingBackend = true;
  } catch {
    // Keep demo summaries if backend is unavailable.
    usingBackend = false;
  }

  const apiBaseUrl = getApiBaseUrl();

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      <div className="ha-callout mb-6">
        <h2 className="ha-callout-title">{copy.importantNoteHeading}</h2>
        <p className="mt-2 text-xs leading-relaxed sm:text-sm">
          {siteCopy.workflow.archiveSummary} {siteCopy.whatThisSiteIs.limitations}{" "}
          {siteCopy.whatThisSiteIs.forCurrent}.
        </p>
      </div>
      {!usingBackend && (
        <div className="ha-callout mb-6">
          <h3 className="ha-callout-title">{copy.offlineTitle}</h3>
          <p className="text-xs leading-relaxed sm:text-sm">{copy.offlineBody}</p>
        </div>
      )}
      <p className="text-ha-muted mb-4 text-sm">
        {copy.sourceSummary(formatNumber(locale, summaries.length), summaries.length)}
      </p>
      {summaries.length === 0 && (
        <div className="ha-callout">
          <h2 className="ha-callout-title">{copy.emptyTitle}</h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">{copy.emptyBody}</p>
        </div>
      )}
      {summaries.length > 0 && (
        <div className="ha-grid-2">
          {summaries.map((source) => {
            const entryId = source.entryRecordId;
            const fallbackId = source.latestRecordId;
            const browseId = entryId ?? fallbackId;
            const browseLabel = entryId ? copy.viewArchivedSite : copy.viewLatestSnapshot;
            const previewSrc = source.entryPreviewUrl
              ? `${apiBaseUrl}${source.entryPreviewUrl}`
              : null;
            const sourceHeadingId = `source-${source.sourceCode}-title`;

            return (
              <article
                key={source.sourceCode}
                aria-labelledby={sourceHeadingId}
                className="ha-card ha-card-elevated overflow-hidden p-0"
              >
                {previewSrc ? (
                  <div className="border-ha-border relative h-28 overflow-hidden border-b bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewSrc}
                      alt={copy.previewAlt(source.sourceName)}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/35 to-transparent dark:from-[#0b0c0d]/90 dark:via-[#0b0c0d]/35" />
                  </div>
                ) : (
                  <div className="border-ha-border text-ha-muted flex h-28 items-center justify-center border-b bg-white px-4 text-xs dark:bg-[#0b0c0d]">
                    {copy.previewUnavailable}
                  </div>
                )}

                <div className="p-4 sm:p-5">
                  <h2 id={sourceHeadingId} className="text-sm font-semibold text-slate-900">
                    {source.sourceName}
                  </h2>
                  <p className="text-ha-muted mt-1 text-xs">
                    {copy.captureRange({
                      formattedCount: formatNumber(locale, source.recordCount),
                      count: source.recordCount,
                      formattedFirstCapture: formatDate(locale, source.firstCapture),
                      formattedLastCapture: formatDate(locale, source.lastCapture),
                    })}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {source.entryBrowseUrl ? (
                      <a href={source.entryBrowseUrl} className="ha-btn-primary text-xs">
                        {browseLabel}
                      </a>
                    ) : browseId ? (
                      <Link href={`/browse/${browseId}`} className="ha-btn-primary text-xs">
                        {browseLabel}
                      </Link>
                    ) : null}
                    <Link
                      href={`/archive?source=${source.sourceCode}`}
                      className="ha-btn-secondary text-xs"
                    >
                      {copy.browseRecords}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
