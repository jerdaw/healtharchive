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
import { localeToLanguageTag, type Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";
import { getLocalizedSourceHomepage, getLocalizedSourceName } from "@/lib/sources";

function formatDate(locale: Locale, iso: string | undefined | null): string {
  if (!iso) return locale === "fr" ? "Inconnu" : "Unknown";
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (year && month && day) {
      const d = new Date(year, month - 1, day);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(localeToLanguageTag(locale), {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
  }
  const parsed = new Date(iso);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(localeToLanguageTag(locale), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return iso;
}

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

function getBrowseBySourceCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: "Explorateur d’archives",
      title: "Parcourir les sources",
      intro:
        "Parcourez la couverture par source et accédez à un site archivé ou à la liste complète des enregistrements. La couverture et les fonctionnalités sont encore en expansion.",
    };
  }

  return {
    eyebrow: "Archive explorer",
    title: "Browse records by source",
    intro:
      "Browse coverage by source and jump into an archived site or the full record list. Coverage and features are still expanding.",
  };
}

export async function generateMetadata({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getBrowseBySourceCopy(locale);
  return buildPageMetadata(locale, "/archive/browse-by-source", copy.title, copy.intro);
}

export default async function BrowseBySourcePage({
  params,
}: {
  params?: Promise<{ locale: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const copy = getBrowseBySourceCopy(locale);
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
        locale === "fr" ? getLocalizedSourceHomepage(locale, s.sourceCode, s.baseUrl) : s.baseUrl,
      description: s.description,
      recordCount: s.recordCount,
      firstCapture: s.firstCapture,
      lastCapture: s.lastCapture,
      latestRecordId: s.latestRecordId,
      entryRecordId: s.entryRecordId,
      entryBrowseUrl: s.entryBrowseUrl,
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
        <h2 className="ha-callout-title">
          {locale === "fr" ? "Note importante" : "Important note"}
        </h2>
        <p className="mt-2 text-xs leading-relaxed sm:text-sm">
          {siteCopy.workflow.archiveSummary} {siteCopy.whatThisSiteIs.limitations}{" "}
          {siteCopy.whatThisSiteIs.forCurrent}.
        </p>
      </div>
      {!usingBackend && (
        <div className="ha-callout mb-6">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "API en direct indisponible" : "Live API unavailable"}
          </h3>
          <p className="text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Affichage d’un échantillon hors ligne limité pendant que l’API en direct est indisponible."
              : "Showing a limited offline sample while the live API is unavailable."}
          </p>
        </div>
      )}
      <div className="ha-grid-2">
        {summaries.map((source) => {
          const entryId = source.entryRecordId;
          const fallbackId = source.latestRecordId;
          const browseId = entryId ?? fallbackId;
          const browseLabel = entryId
            ? locale === "fr"
              ? "Parcourir le site archivé"
              : "Browse archived site"
            : locale === "fr"
              ? "Parcourir la capture la plus récente"
              : "Browse latest capture";
          const previewSrc = source.entryPreviewUrl
            ? `${apiBaseUrl}${source.entryPreviewUrl}`
            : null;

          return (
            <article
              key={source.sourceCode}
              className="ha-card ha-card-elevated overflow-hidden p-0"
            >
              {previewSrc ? (
                <div className="border-ha-border relative h-28 overflow-hidden border-b bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt={
                      locale === "fr"
                        ? `Aperçu : ${source.sourceName}`
                        : `${source.sourceName} preview`
                    }
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/35 to-transparent dark:from-[#0b0c0d]/90 dark:via-[#0b0c0d]/35" />
                </div>
              ) : (
                <div className="border-ha-border text-ha-muted flex h-28 items-center justify-center border-b bg-white px-4 text-xs dark:bg-[#0b0c0d]">
                  {locale === "fr" ? "Aperçu indisponible" : "Preview unavailable"}
                </div>
              )}

              <div className="p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-slate-900">{source.sourceName}</h2>
                <p className="text-ha-muted mt-1 text-xs">
                  {locale === "fr"
                    ? `${new Intl.NumberFormat(localeToLanguageTag(locale)).format(
                        source.recordCount,
                      )} capture${source.recordCount === 1 ? "" : "s"} capturée${
                        source.recordCount === 1 ? "" : "s"
                      } entre le ${formatDate(locale, source.firstCapture)} et le ${formatDate(
                        locale,
                        source.lastCapture,
                      )}.`
                    : `${new Intl.NumberFormat(localeToLanguageTag(locale)).format(
                        source.recordCount,
                      )} snapshot${source.recordCount === 1 ? "" : "s"} captured between ${formatDate(
                        locale,
                        source.firstCapture,
                      )} and ${formatDate(locale, source.lastCapture)}.`}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {browseId && (
                    <Link href={`/browse/${browseId}`} className="ha-btn-primary text-xs">
                      {browseLabel}
                    </Link>
                  )}
                  {source.entryBrowseUrl && (
                    <a
                      href={source.entryBrowseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ha-btn-secondary text-xs"
                    >
                      {locale === "fr" ? "Ouvrir dans le lecteur ↗" : "Open in replay ↗"}
                    </a>
                  )}
                  <Link
                    href={`/archive?source=${source.sourceCode}`}
                    className="ha-btn-secondary text-xs"
                  >
                    {locale === "fr" ? "Parcourir les enregistrements" : "Browse records"}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
