import type { Metadata } from "next";

import { PageShell } from "@/components/layout/PageShell";
import { searchDemoRecords, getSourcesSummary } from "@/data/demo-records";
import type { DemoRecord } from "@/data/demo-records";
import {
  fetchSources,
  fetchSourcesLocalized,
  getApiBaseUrl,
  searchSnapshots,
  type SearchParams as ApiSearchParams,
} from "@/lib/api";
import { localeToLanguageTag, type Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";
import { getLocalizedSourceHomepage, getLocalizedSourceName } from "@/lib/sources";
import { ApiHealthBanner } from "@/components/ApiHealthBanner";
import { HoverGlowButton } from "@/components/home/HoverGlowButton";
import { SearchResultCard } from "@/components/archive/SearchResultCard";
import { ArchiveFiltersAutoscroll } from "@/components/archive/ArchiveFiltersAutoscroll";
import { SearchWithinResults } from "@/components/archive/SearchWithinResults";
import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { redirect } from "next/navigation";

type ArchiveSearchParams = {
  q?: string;
  within?: string;
  source?: string;
  from?: string;
  to?: string;
  sort?: string;
  view?: string;
  includeNon2xx?: string;
  includeDuplicates?: string;
  page?: string;
  pageSize?: string;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

type ArchiveListRecord = Omit<DemoRecord, "snapshotPath" | "sourceCode"> & {
  sourceCode: string;
  pageSnapshotsCount?: number | null;
};

type SourceBrowseSummary = {
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

function getArchiveCopy(locale: Locale) {
  const siteCopy = getSiteCopy(locale);
  return {
    eyebrow: locale === "fr" ? "Explorateur d’archives" : "Archive explorer",
    title: locale === "fr" ? "Parcourir et rechercher des captures" : "Browse & search snapshots",
    description: `${siteCopy.workflow.archiveSummary} ${siteCopy.whatThisSiteIs.limitations} ${siteCopy.whatThisSiteIs.forCurrent}.`,
  };
}

export async function generateMetadata({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getArchiveCopy(locale);
  return buildPageMetadata(locale, "/archive", copy.title, copy.description);
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on";
}

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

export default async function ArchivePage({
  params: routeParams,
  searchParams,
}: {
  params?: Promise<{ locale: string }>;
  searchParams: Promise<ArchiveSearchParams>;
}) {
  const locale = await resolveLocale(routeParams);
  const copy = getArchiveCopy(locale);
  const siteCopy = getSiteCopy(locale);
  const params = await searchParams;
  const qRaw = params.q?.trim() ?? "";
  const withinRaw = params.within?.trim() ?? "";

  // Canonicalize: if the user clears one box, treat the remaining keyword(s)
  // as the primary query (no lingering empty `within=` or `q=` in the URL).
  if (!qRaw && withinRaw) {
    const qs = new URLSearchParams();
    qs.set("q", withinRaw);
    if (params.source?.trim()) qs.set("source", params.source.trim());
    if (params.from?.trim()) qs.set("from", params.from.trim());
    if (params.to?.trim()) qs.set("to", params.to.trim());
    if (params.sort?.trim()) qs.set("sort", params.sort.trim());
    if (params.view?.trim()) qs.set("view", params.view.trim());
    if (params.includeNon2xx?.trim()) qs.set("includeNon2xx", params.includeNon2xx.trim());
    if (params.includeDuplicates?.trim())
      qs.set("includeDuplicates", params.includeDuplicates.trim());
    if (params.pageSize?.trim()) qs.set("pageSize", params.pageSize.trim());
    // Reset page on meaningfully changed query.
    redirect(`?${qs.toString()}`);
  }
  if (qRaw && params.within !== undefined && !withinRaw) {
    const qs = new URLSearchParams();
    qs.set("q", qRaw);
    if (params.source?.trim()) qs.set("source", params.source.trim());
    if (params.from?.trim()) qs.set("from", params.from.trim());
    if (params.to?.trim()) qs.set("to", params.to.trim());
    if (params.sort?.trim()) qs.set("sort", params.sort.trim());
    if (params.view?.trim()) qs.set("view", params.view.trim());
    if (params.includeNon2xx?.trim()) qs.set("includeNon2xx", params.includeNon2xx.trim());
    if (params.includeDuplicates?.trim())
      qs.set("includeDuplicates", params.includeDuplicates.trim());
    if (params.pageSize?.trim()) qs.set("pageSize", params.pageSize.trim());
    redirect(`?${qs.toString()}`);
  }

  const q = qRaw;
  const within = withinRaw;
  const qForSearch = q && within ? `(${q}) AND (${within})` : within ? within : q;
  const highlightQuery = [q, within].filter(Boolean).join(" ");
  const source = params.source?.trim() ?? "";
  const fromDate = params.from?.trim() ?? "";
  const toDate = params.to?.trim() ?? "";
  const includeNon2xx = parseBoolean(params.includeNon2xx);
  const includeDuplicatesRaw = parseBoolean(params.includeDuplicates);
  const hasQuery = Boolean(qForSearch);
  const requestedSort = params.sort?.trim().toLowerCase() ?? "";
  const requestedSortValid =
    requestedSort === "newest" || requestedSort === "relevance" ? requestedSort : "";
  const sortUi = requestedSortValid || "relevance";
  const sort = hasQuery ? requestedSortValid || "relevance" : "newest";
  const defaultSort = hasQuery ? "relevance" : "newest";
  const requestedView = params.view?.trim().toLowerCase() ?? "";
  const view = requestedView === "pages" || requestedView === "snapshots" ? requestedView : "pages";
  const defaultView = "pages";
  const includeDuplicates = view === "snapshots" ? includeDuplicatesRaw : false;
  const page = parsePositiveInt(params.page, 1);
  const rawPageSize = parsePositiveInt(params.pageSize, DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(rawPageSize, MAX_PAGE_SIZE);
  const hasActiveSearch = Boolean(
    qForSearch ||
    source ||
    fromDate ||
    toDate ||
    includeNon2xx ||
    includeDuplicates ||
    view !== defaultView ||
    sort !== defaultSort,
  );

  // Build source options from backend if available; fall back to demo data.
  let sourceOptions: { value: string; label: string }[] = [
    {
      value: "phac",
      label: getLocalizedSourceName(
        locale,
        "phac",
        locale === "fr"
          ? "Agence de la santé publique du Canada"
          : "Public Health Agency of Canada",
      ),
    },
    {
      value: "hc",
      label: getLocalizedSourceName(
        locale,
        "hc",
        locale === "fr" ? "Santé Canada" : "Health Canada",
      ),
    },
    {
      value: "cihr",
      label: getLocalizedSourceName(
        locale,
        "cihr",
        locale === "fr"
          ? "Instituts de recherche en santé du Canada"
          : "Canadian Institutes of Health Research",
      ),
    },
  ];
  let sourceSummaries: SourceBrowseSummary[] = [];

  // Start with demo search results. `DemoRecord` is assignable to the
  // `ArchiveListRecord` view used for rendering (it has extra fields).
  let results: ArchiveListRecord[] = searchDemoRecords({
    q: qForSearch,
    source,
    from: fromDate || undefined,
    to: toDate || undefined,
  });
  let totalResults = results.length;
  let usingBackend = false;
  let backendError: string | null = null;

  try {
    const apiSources =
      locale === "fr" ? await fetchSourcesLocalized({ lang: "fr" }) : await fetchSources();

    if (apiSources.length > 0) {
      const filtered = apiSources.filter((s) => s.sourceCode !== "test");
      sourceOptions = filtered.map((s) => ({
        value: s.sourceCode,
        label:
          locale === "fr"
            ? getLocalizedSourceName(locale, s.sourceCode, s.sourceName)
            : s.sourceName,
      }));
      sourceSummaries = filtered.map((s) => ({
        sourceCode: s.sourceCode,
        sourceName:
          locale === "fr"
            ? getLocalizedSourceName(locale, s.sourceCode, s.sourceName)
            : s.sourceName,
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
    }
  } catch {
    const demoSources = getSourcesSummary();
    sourceOptions = demoSources.map((s) => ({
      value: s.sourceCode,
      label:
        locale === "fr" ? getLocalizedSourceName(locale, s.sourceCode, s.sourceName) : s.sourceName,
    }));
    sourceSummaries = demoSources.map((s) => ({
      sourceCode: s.sourceCode,
      sourceName:
        locale === "fr" ? getLocalizedSourceName(locale, s.sourceCode, s.sourceName) : s.sourceName,
      baseUrl: locale === "fr" ? getLocalizedSourceHomepage(locale, s.sourceCode, null) : null,
      description: null,
      recordCount: s.recordCount,
      firstCapture: s.firstCapture,
      lastCapture: s.lastCapture,
      latestRecordId: s.latestRecordId,
      entryRecordId: s.latestRecordId,
      entryBrowseUrl: null,
      entryPreviewUrl: null,
    }));
  }

  // Attempt to use the backend search API; fall back to the bundled offline
  // sample dataset on any error.
  try {
    const baseBackendParams = {
      q: qForSearch || undefined,
      source: source || undefined,
      sort: sort === "relevance" || sort === "newest" ? sort : undefined,
      view: view === "pages" || view === "snapshots" ? view : undefined,
      includeNon2xx: includeNon2xx || undefined,
      includeDuplicates: view === "snapshots" && includeDuplicates ? true : undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      page,
      pageSize,
    } as ApiSearchParams;

    const first = await searchSnapshots(baseBackendParams);
    let backend = first;

    // If the user requested a page beyond the end (common when filters
    // tighten results), refetch the last page so results and pagination
    // stay consistent.
    const backendPageCount = Math.max(1, Math.ceil(backend.total / pageSize));
    const clampedPage = Math.min(page, backendPageCount);
    if (clampedPage !== page) {
      backend = await searchSnapshots({
        ...baseBackendParams,
        page: clampedPage,
      } as ApiSearchParams);
    }

    results = backend.results.map((r) => ({
      id: String(r.id),
      title: r.title ?? "",
      sourceCode: r.sourceCode,
      sourceName: r.sourceName,
      language: r.language ?? "",
      captureDate: r.captureDate,
      originalUrl: r.originalUrl,
      snippet: r.snippet ?? "",
      pageSnapshotsCount: r.pageSnapshotsCount ?? null,
    }));
    totalResults = backend.total;
    usingBackend = true;
  } catch (err) {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number((err as { status?: unknown }).status)
        : null;
    const detail =
      typeof err === "object" && err !== null && "detail" in err
        ? (err as { detail?: unknown }).detail
        : null;

    if (status === 422) {
      let detailText: string | null = null;
      if (typeof detail === "string" && detail.trim()) {
        detailText = detail.trim();
      } else if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        if (typeof first === "object" && first !== null && "msg" in first) {
          const msg = (first as { msg?: unknown }).msg;
          if (typeof msg === "string" && msg.trim()) {
            detailText = msg.trim();
          }
        }
      }

      backendError =
        detailText ??
        (locale === "fr"
          ? "Filtres de recherche invalides. Veuillez vérifier votre plage de dates."
          : "Invalid search filters. Please check your date range.");
      usingBackend = true;
      results = [];
      totalResults = 0;
    } else {
      usingBackend = false;
      totalResults = results.length;
    }
  }

  // Apply simple pagination in fallback mode (demo data).
  const fallbackPageSize = results.length || DEFAULT_PAGE_SIZE;
  const paginationSize = usingBackend ? pageSize : fallbackPageSize;
  const pageCount = Math.max(1, Math.ceil(totalResults / paginationSize));
  const effectivePage = Math.min(Math.max(1, page), pageCount);
  const paginatedResults = usingBackend
    ? results
    : results.slice((effectivePage - 1) * paginationSize, effectivePage * paginationSize);

  const resultNoun =
    locale === "fr"
      ? usingBackend
        ? view === "pages"
          ? "page"
          : "capture"
        : "capture"
      : usingBackend
        ? view === "pages"
          ? "page"
          : "snapshot"
        : "snapshot";
  const formattedTotalResults = new Intl.NumberFormat(localeToLanguageTag(locale)).format(
    totalResults,
  );
  const resultCountText =
    totalResults === 1 ? `1 ${resultNoun}` : `${formattedTotalResults} ${resultNoun}s`;

  const buildPageHref = (targetPage: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (within) qs.set("within", within);
    if (source) qs.set("source", source);
    if (fromDate) qs.set("from", fromDate);
    if (toDate) qs.set("to", toDate);
    if (sort !== defaultSort) qs.set("sort", sort);
    if (view !== defaultView) qs.set("view", view);
    if (includeNon2xx) qs.set("includeNon2xx", "true");
    if (view === "snapshots" && includeDuplicates) qs.set("includeDuplicates", "true");
    if (targetPage > 1) qs.set("page", String(targetPage));
    if (pageSize !== DEFAULT_PAGE_SIZE) qs.set("pageSize", String(pageSize));
    const queryString = qs.toString();
    return queryString ? `/archive?${queryString}` : "/archive";
  };

  const orderedSourceSummaries = [...sourceSummaries].sort((a, b) => {
    const diff = (b.recordCount ?? 0) - (a.recordCount ?? 0);
    if (diff !== 0) return diff;
    return a.sourceName.localeCompare(b.sourceName);
  });

  const apiBaseUrl = getApiBaseUrl();

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} compact hideHeaderVisually>
      <ApiHealthBanner />
      <section className="mb-4">
        <div className="ha-callout">
          <h2 className="ha-callout-title">
            {locale === "fr" ? "Note importante" : "Important note"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {siteCopy.workflow.archiveSummary} {siteCopy.whatThisSiteIs.limitations}{" "}
            {siteCopy.whatThisSiteIs.forCurrent}.
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Pour plus de contexte sur la couverture et les méthodes de capture, voir"
              : "For background on coverage and capture methods, see"}{" "}
            <Link href="/methods" className="text-ha-accent font-medium hover:text-blue-700">
              {locale === "fr" ? "Méthodes et couverture" : "Methods & coverage"}
            </Link>
            .
          </p>
        </div>
      </section>
      {sourceSummaries.length > 0 && (
        <section className="ha-home-panel-gradient ha-home-panel-gradient-compact mb-4 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {locale === "fr" ? "Parcourir les sites archivés" : "Browse archived sites"}
              </h2>
            </div>
            <Link
              href="/archive/browse-by-source"
              className="text-ha-accent text-xs font-medium hover:text-blue-700"
            >
              {locale === "fr" ? "Parcourir toutes les sources →" : "Browse all sources →"}
            </Link>
          </div>

          <div className="overflow-x-auto px-1 pt-0 pb-4">
            <div className="flex gap-3">
              {orderedSourceSummaries.map((summary) => {
                const entryId = summary.entryRecordId;
                const fallbackId = summary.latestRecordId;
                const browseId = entryId ?? fallbackId;

                const previewSrc = summary.entryPreviewUrl
                  ? `${apiBaseUrl}${summary.entryPreviewUrl}`
                  : null;

                return (
                  <article
                    key={summary.sourceCode}
                    className="ha-card ha-card-tight-shadow w-[min(256px,86vw)] flex-shrink-0 overflow-hidden p-0"
                    data-testid={`archive-source-${summary.sourceCode}`}
                  >
                    {previewSrc ? (
                      browseId ? (
                        <Link
                          href={`/snapshot/${browseId}`}
                          className="border-ha-border relative block h-[4.5rem] overflow-hidden border-b bg-white"
                          aria-label={
                            locale === "fr"
                              ? `Voir ${summary.sourceName}`
                              : `View ${summary.sourceName}`
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewSrc}
                            alt={
                              locale === "fr"
                                ? `Aperçu : ${summary.sourceName}`
                                : `${summary.sourceName} preview`
                            }
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover object-top"
                          />
                        </Link>
                      ) : (
                        <div className="border-ha-border relative h-[4.5rem] overflow-hidden border-b bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewSrc}
                            alt={
                              locale === "fr"
                                ? `Aperçu : ${summary.sourceName}`
                                : `${summary.sourceName} preview`
                            }
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover object-top"
                          />
                        </div>
                      )
                    ) : browseId ? (
                      <Link
                        href={`/snapshot/${browseId}`}
                        className="border-ha-border text-ha-muted flex h-[4.5rem] items-center justify-center border-b bg-white px-4 text-xs dark:bg-[#0b0c0d]"
                        aria-label={
                          locale === "fr"
                            ? `Voir ${summary.sourceName}`
                            : `View ${summary.sourceName}`
                        }
                      >
                        {locale === "fr" ? "Aperçu indisponible" : "Preview unavailable"}
                      </Link>
                    ) : (
                      <div className="border-ha-border text-ha-muted flex h-[4.5rem] items-center justify-center border-b bg-white px-4 text-xs dark:bg-[#0b0c0d]">
                        {locale === "fr" ? "Aperçu indisponible" : "Preview unavailable"}
                      </div>
                    )}

                    <div className="pt-2.5 pb-1 sm:pt-3 sm:pb-1">
                      {browseId ? (
                        <Link
                          href={`/snapshot/${browseId}`}
                          className="block truncate text-[13px] font-semibold tracking-tight text-slate-900 hover:underline"
                          title={summary.sourceName}
                        >
                          {summary.sourceName}
                        </Link>
                      ) : (
                        <h3
                          className="truncate text-[13px] font-semibold tracking-tight text-slate-900"
                          title={summary.sourceName}
                        >
                          {summary.sourceName}
                        </h3>
                      )}
                      <p className="text-ha-muted mt-1 text-xs whitespace-nowrap">
                        {locale === "fr"
                          ? `${new Intl.NumberFormat(localeToLanguageTag(locale)).format(
                              summary.recordCount,
                            )} capture${summary.recordCount === 1 ? "" : "s"} · dernière capture : ${formatDate(
                              locale,
                              summary.lastCapture,
                            )}`
                          : `${new Intl.NumberFormat(localeToLanguageTag(locale)).format(
                              summary.recordCount,
                            )} snapshot${summary.recordCount === 1 ? "" : "s"} · latest ${formatDate(
                              locale,
                              summary.lastCapture,
                            )}`}
                      </p>
                      {summary.baseUrl && (
                        <div className="text-ha-muted mt-1.5 flex min-w-0 items-baseline gap-1 text-[11px]">
                          <span className="flex-shrink-0 font-medium text-slate-800">
                            {locale === "fr" ? "Page d’accueil :" : "Homepage:"}
                          </span>
                          {browseId ? (
                            <Link
                              href={`/snapshot/${browseId}`}
                              className="min-w-0 truncate hover:underline"
                              title={summary.baseUrl}
                            >
                              {summary.baseUrl}
                            </Link>
                          ) : (
                            <span className="min-w-0 truncate" title={summary.baseUrl}>
                              {summary.baseUrl}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-3.5 grid grid-cols-3 items-center text-xs font-medium">
                        <div className="text-left">
                          {browseId && (
                            <Link
                              href={`/snapshot/${browseId}`}
                              className="text-ha-accent hover:text-blue-700"
                            >
                              {locale === "fr" ? "Voir" : "View"}
                            </Link>
                          )}
                        </div>
                        <div className="text-center">
                          {summary.entryBrowseUrl && (
                            <a
                              href={summary.entryBrowseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-ha-accent hover:text-blue-700"
                              title={
                                locale === "fr"
                                  ? "Ouvrir la page d’accueil de cette source dans le service de relecture (nouvel onglet)"
                                  : "Open this source homepage in the replay service (new tab)"
                              }
                            >
                              {locale === "fr" ? "Relecture ↗" : "Replay ↗"}
                            </a>
                          )}
                        </div>
                        <div className="text-right">
                          <Link
                            href={`/archive?source=${encodeURIComponent(
                              summary.sourceCode,
                            )}&focus=filters`}
                            scroll={false}
                            className="text-ha-accent hover:text-blue-700"
                          >
                            {locale === "fr" ? "Rechercher" : "Search"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}
      <div className="ha-home-hero grid gap-4 lg:grid-cols-[minmax(0,280px),minmax(0,1fr)] lg:items-start">
        {/* Filters panel */}
        <aside id="archive-filters" className="ha-card ha-home-panel space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="flex items-baseline gap-2 text-sm font-semibold text-slate-900">
              {hasActiveSearch ? (
                <>
                  <span className="text-ha-accent font-semibold">
                    {locale === "fr"
                      ? view === "pages"
                        ? "Pages"
                        : "Captures"
                      : view === "pages"
                        ? "Page"
                        : "Snapshot"}
                  </span>
                  <span className="text-slate-900">
                    {locale === "fr" ? "résultats de recherche" : "search results"}
                  </span>
                  <span className="group relative inline-flex">
                    <button
                      type="button"
                      className="border-ha-border text-ha-muted inline-flex h-4 w-4 items-center justify-center rounded-full border bg-white text-[10px] leading-none font-semibold transition-colors hover:border-[#11588f] hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#11588f]"
                      aria-label={
                        locale === "fr"
                          ? "Info sur les pages et les captures"
                          : "Info about pages vs snapshots"
                      }
                    >
                      i
                    </button>
                    <span className="border-ha-border pointer-events-none absolute top-full left-1/2 z-10 mt-2 w-60 -translate-x-1/2 rounded-lg border bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                      {view === "pages"
                        ? locale === "fr"
                          ? "La vue Pages affiche la dernière capture pour chaque URL (regroupées par URL sans chaînes de requête)."
                          : "Pages view shows the latest capture for each URL (grouped by URL without query strings)."
                        : locale === "fr"
                          ? "La vue Captures affiche chaque capture, y compris plusieurs captures de la même URL au fil du temps."
                          : "Snapshots view shows every capture, including multiple captures of the same URL over time."}
                    </span>
                  </span>
                </>
              ) : locale === "fr" ? (
                "Recherche"
              ) : (
                "Search"
              )}
            </h2>
            <span className="text-ha-muted ml-auto text-right text-xs">
              {resultCountText}
              {q && (
                <>
                  {" "}
                  {locale === "fr" ? "correspondant à" : "matching"}{" "}
                  <span className="font-medium">“{q}”</span>
                </>
              )}
              {within && (
                <>
                  {" "}
                  + <span className="font-medium">“{within}”</span>
                </>
              )}
              {(fromDate || toDate) && (
                <>
                  {" "}
                  · {locale === "fr" ? "Date" : "Date"}:{" "}
                  {fromDate
                    ? formatDate(locale, fromDate)
                    : locale === "fr"
                      ? "Sans limite"
                      : "Any"}{" "}
                  – {toDate ? formatDate(locale, toDate) : locale === "fr" ? "Sans limite" : "Any"}
                </>
              )}
            </span>
          </div>

          <form
            key={`archive-filters:${q}:${source}:${fromDate}:${toDate}:${sort}:${view}:${
              includeNon2xx ? "1" : "0"
            }:${includeDuplicates ? "1" : "0"}:${pageSize}`}
            className="space-y-4"
            method="get"
          >
            <ArchiveFiltersAutoscroll targetId="archive-filters" focusParam="filters" />
            <input type="hidden" name="focus" value="filters" />
            <input type="hidden" name="page" value="1" />
            {within && <input type="hidden" name="within" value={within} />}
            {!usingBackend && <input type="hidden" name="pageSize" value={String(pageSize)} />}
            {!usingBackend && sort !== defaultSort && (
              <input type="hidden" name="sort" value={sort} />
            )}
            {!usingBackend && view !== defaultView && (
              <input type="hidden" name="view" value={view} />
            )}
            {!usingBackend && includeNon2xx && (
              <input type="hidden" name="includeNon2xx" value="true" />
            )}
            {!usingBackend && includeDuplicates && (
              <input type="hidden" name="includeDuplicates" value="true" />
            )}
            {/* Text search */}
            <div className="space-y-1">
              <label htmlFor="q" className="text-xs font-medium text-slate-800">
                {locale === "fr" ? "Mots-clés" : "Keywords"}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder={
                    locale === "fr"
                      ? "p. ex. grippe, https://www.canada.ca/…, covid AND vaccin, -archived, url:covid"
                      : "e.g. influenza, https://www.canada.ca/…, covid AND vaccine, -archived, url:covid"
                  }
                  className="border-ha-border min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-0 outline-none placeholder:text-slate-400 focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                />
                <HoverGlowButton type="submit" className="ha-btn-primary w-full text-xs sm:w-auto">
                  {locale === "fr" ? "Rechercher" : "Search"}
                </HoverGlowButton>
              </div>
            </div>

            {/* Source select */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="source" className="text-xs font-medium text-slate-800">
                  {locale === "fr" ? "Source" : "Source"}
                </label>
                <select
                  id="source"
                  name="source"
                  defaultValue={source}
                  className="border-ha-border h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                >
                  <option value="">{locale === "fr" ? "Toutes les sources" : "All sources"}</option>
                  {sourceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label htmlFor="from" className="text-xs font-medium text-slate-800">
                  {locale === "fr" ? "Du" : "From"}
                </label>
                <input
                  id="from"
                  name="from"
                  type="date"
                  defaultValue={fromDate}
                  className="border-ha-border h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label htmlFor="to" className="text-xs font-medium text-slate-800">
                  {locale === "fr" ? "Au" : "To"}
                </label>
                <input
                  id="to"
                  name="to"
                  type="date"
                  defaultValue={toDate}
                  className="border-ha-border h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                />
              </div>
            </div>
            {usingBackend && (
              <div className="rounded-lg bg-[var(--surface-bg-soft)] py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1">
                    <label htmlFor="view" className="text-ha-muted text-xs font-medium">
                      {locale === "fr" ? "Afficher" : "Show"}
                    </label>
                    <span className="group relative inline-flex">
                      <button
                        type="button"
                        className="border-ha-border text-ha-muted inline-flex h-4 w-4 items-center justify-center rounded-full border bg-white text-[10px] leading-none font-semibold transition-colors hover:border-[#11588f] hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#11588f]"
                        aria-label={
                          locale === "fr"
                            ? "Info sur le regroupement des pages"
                            : "Info about page grouping"
                        }
                      >
                        i
                      </button>
                      <span className="border-ha-border pointer-events-none absolute top-full left-1/2 z-10 mt-2 w-56 -translate-x-1/2 rounded-lg border bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                        {locale === "fr"
                          ? "La vue Pages affiche la dernière capture pour chaque URL. La vue Captures affiche chaque capture."
                          : "Pages view shows the latest capture for each URL. Snapshots view shows every capture."}
                      </span>
                    </span>
                    <select
                      id="view"
                      name="view"
                      defaultValue={view}
                      className="ha-select ha-select-sm"
                    >
                      <option value="pages">
                        {locale === "fr" ? "Pages (dernière)" : "Pages (latest)"}
                      </option>
                      <option value="snapshots">
                        {locale === "fr" ? "Toutes les captures" : "All snapshots"}
                      </option>
                    </select>
                  </div>

                  <div className="inline-flex items-center gap-1 sm:ml-2">
                    <label htmlFor="sort" className="text-ha-muted text-xs font-medium">
                      {locale === "fr" ? "Trier" : "Sort"}
                    </label>
                    <select
                      id="sort"
                      name="sort"
                      defaultValue={sortUi}
                      className="ha-select ha-select-sm"
                    >
                      <option value="relevance">
                        {locale === "fr" ? "Pertinence" : "Relevance"}
                      </option>
                      <option value="newest">{locale === "fr" ? "Plus récent" : "Newest"}</option>
                    </select>
                  </div>

                  <div className="inline-flex items-center gap-1 sm:ml-2">
                    <label htmlFor="pageSize" className="text-ha-muted text-xs font-medium">
                      {locale === "fr" ? "Par page" : "Per page"}
                    </label>
                    <select
                      id="pageSize"
                      name="pageSize"
                      defaultValue={String(pageSize)}
                      className="ha-select ha-select-sm"
                    >
                      {[10, 20, 50].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="inline-flex items-center gap-1 sm:ml-2">
                    <input
                      id="includeNon2xx"
                      type="checkbox"
                      name="includeNon2xx"
                      value="true"
                      defaultChecked={includeNon2xx}
                    />
                    <label htmlFor="includeNon2xx" className="text-ha-muted text-xs font-medium">
                      {locale === "fr" ? "Inclure les erreurs" : "Include errors"}
                    </label>
                    <span className="group relative inline-flex">
                      <button
                        type="button"
                        className="border-ha-border text-ha-muted inline-flex h-4 w-4 items-center justify-center rounded-full border bg-white text-[10px] leading-none font-semibold transition-colors hover:border-[#11588f] hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#11588f]"
                        aria-label={
                          locale === "fr"
                            ? "Info sur l’inclusion des erreurs"
                            : "Info about including errors"
                        }
                      >
                        i
                      </button>
                      <span className="border-ha-border pointer-events-none absolute top-full left-1/2 z-10 mt-2 w-64 -translate-x-1/2 rounded-lg border bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                        {locale === "fr"
                          ? "Inclut les captures dont le code HTTP n’est pas 2xx (ex. 404 ou 500)."
                          : "Includes snapshots with non-2xx HTTP status codes (e.g. 404 or 500)."}
                      </span>
                    </span>
                  </div>
                  {view === "snapshots" && (
                    <label className="text-ha-muted inline-flex items-center gap-1 text-xs font-medium sm:ml-2">
                      <input
                        type="checkbox"
                        name="includeDuplicates"
                        value="true"
                        defaultChecked={includeDuplicates}
                      />
                      {locale === "fr" ? "Inclure les doublons" : "Include duplicates"}
                    </label>
                  )}

                  <button type="submit" className="ha-btn-secondary text-xs sm:ml-2">
                    {locale === "fr" ? "Appliquer" : "Apply"}
                  </button>

                  <Link
                    href="/archive"
                    className="text-ha-muted ml-auto text-xs font-medium hover:text-slate-900"
                  >
                    {locale === "fr" ? "Effacer" : "Clear"}
                  </Link>
                </div>
              </div>
            )}
          </form>

          {backendError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {backendError}{" "}
              <Link
                href="/archive"
                className="font-medium underline underline-offset-2 hover:text-amber-900"
              >
                {locale === "fr" ? "Effacer les filtres" : "Clear filters"}
              </Link>
            </div>
          )}

          {hasActiveSearch && totalResults > 0 && (
            <SearchWithinResults
              q={q}
              within={within}
              source={source}
              fromDate={fromDate}
              toDate={toDate}
              sort={sort}
              view={view}
              includeNon2xx={includeNon2xx}
              includeDuplicates={includeDuplicates}
              pageSize={pageSize}
              defaultSort={defaultSort}
              defaultView={defaultView}
            />
          )}
        </aside>

        {/* Search & results */}
        <section id="archive-results" className="space-y-4">
          <ArchiveFiltersAutoscroll targetId="archive-results" focusParam="results" />
          {!usingBackend && (
            <div className="ha-card ha-home-panel p-4 sm:p-5">
              <p className="text-[11px] font-medium text-amber-800">
                {locale === "fr"
                  ? "API en direct indisponible; affichage d’un échantillon hors ligne limité."
                  : "Live API unavailable; showing a limited offline sample."}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {totalResults === 0 ? (
              <div className="ha-card ha-home-panel p-4 sm:p-5">
                <p className="text-ha-muted text-sm">
                  {locale === "fr"
                    ? "Aucun enregistrement ne correspond aux filtres actuels. Essayez de retirer certains filtres, d’utiliser des mots-clés plus généraux ou de"
                    : "No records match the current filters. Try removing some filters, using broader keywords, or"}{" "}
                  <Link href="/archive" className="text-ha-accent font-medium hover:text-blue-700">
                    {locale === "fr" ? "réinitialiser la recherche" : "resetting the search"}
                  </Link>
                  .
                </p>
              </div>
            ) : (
              paginatedResults.map((record) => (
                <SearchResultCard
                  key={record.id}
                  record={record}
                  view={view as "pages" | "snapshots"}
                  query={highlightQuery}
                  locale={locale}
                />
              ))
            )}
          </div>

          {pageCount > 1 && (
            <div className="ha-card ha-home-panel text-ha-muted flex flex-wrap items-center justify-between gap-3 p-4 text-sm sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  {locale === "fr"
                    ? `Page ${Math.min(effectivePage, pageCount)} sur ${pageCount}`
                    : `Page ${Math.min(effectivePage, pageCount)} of ${pageCount}`}
                </span>
                {usingBackend && (
                  <span className="text-ha-muted text-[11px]">
                    {locale === "fr"
                      ? `Affichage de ${(effectivePage - 1) * paginationSize + 1} à ${Math.min(
                          effectivePage * paginationSize,
                          totalResults,
                        )} sur ${totalResults}`
                      : `Showing ${(effectivePage - 1) * paginationSize + 1}-${Math.min(
                          effectivePage * paginationSize,
                          totalResults,
                        )} of ${totalResults}`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={buildPageHref(1)}
                  aria-disabled={effectivePage <= 1}
                  className={`ha-btn-secondary text-xs ${
                    effectivePage <= 1 ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {locale === "fr" ? "« Première" : "« First"}
                </Link>
                <Link
                  href={buildPageHref(Math.max(1, effectivePage - 1))}
                  aria-disabled={effectivePage <= 1}
                  className={`ha-btn-secondary text-xs ${
                    effectivePage <= 1 ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {locale === "fr" ? "← Préc." : "← Prev"}
                </Link>
                <Link
                  href={buildPageHref(Math.min(pageCount, effectivePage + 1))}
                  aria-disabled={effectivePage >= pageCount}
                  className={`ha-btn-secondary text-xs ${
                    effectivePage >= pageCount ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {locale === "fr" ? "Suiv. →" : "Next →"}
                </Link>
                <Link
                  href={buildPageHref(pageCount)}
                  aria-disabled={effectivePage >= pageCount}
                  className={`ha-btn-secondary text-xs ${
                    effectivePage >= pageCount ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {locale === "fr" ? "Dernière »" : "Last »"}
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      <p className="text-ha-muted text-xs leading-relaxed">
        {locale === "fr"
          ? "Version préliminaire : la couverture et les fonctionnalités sont encore en expansion."
          : "Early release: coverage and features are still expanding."}
      </p>
    </PageShell>
  );
}
