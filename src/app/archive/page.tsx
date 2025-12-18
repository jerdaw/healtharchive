import { PageShell } from "@/components/layout/PageShell";
import { searchDemoRecords, getSourcesSummary } from "@/data/demo-records";
import type { DemoRecord } from "@/data/demo-records";
import {
    fetchSources,
    getApiBaseUrl,
    searchSnapshots,
    type SearchParams as ApiSearchParams,
} from "@/lib/api";
import { ApiHealthBanner } from "@/components/ApiHealthBanner";
import { HoverGlowButton } from "@/components/home/HoverGlowButton";
import { SearchResultCard } from "@/components/archive/SearchResultCard";
import { ArchiveFiltersAutoscroll } from "@/components/archive/ArchiveFiltersAutoscroll";
import { SearchWithinResults } from "@/components/archive/SearchWithinResults";
import Link from "next/link";

type ArchiveSearchParams = {
    q?: string;
    source?: string;
    from?: string;
    to?: string;
    sort?: string;
    view?: string;
    includeNon2xx?: string;
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

function formatDate(iso: string | undefined | null): string {
    if (!iso) return "Unknown";
    const parts = iso.split("-");
    if (parts.length === 3) {
        const [yearStr, monthStr, dayStr] = parts;
        const year = Number(yearStr);
        const month = Number(monthStr);
        const day = Number(dayStr);
        if (year && month && day) {
            const d = new Date(year, month - 1, day);
            if (!Number.isNaN(d.getTime())) {
                return d.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                });
            }
        }
    }

    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }
    return iso;
}

export default async function ArchivePage({
    searchParams,
}: {
    searchParams: Promise<ArchiveSearchParams>;
}) {
    const params = await searchParams;
    const q = params.q?.trim() ?? "";
    const source = params.source?.trim() ?? "";
    const fromDate = params.from?.trim() ?? "";
    const toDate = params.to?.trim() ?? "";
    const includeNon2xx = parseBoolean(params.includeNon2xx);
    const requestedSort = params.sort?.trim().toLowerCase() ?? "";
    const sort =
        requestedSort === "newest" || requestedSort === "relevance"
            ? requestedSort
            : q
            ? "relevance"
            : "newest";
    const defaultSort = q ? "relevance" : "newest";
    const requestedView = params.view?.trim().toLowerCase() ?? "";
    const view =
        requestedView === "pages" || requestedView === "snapshots"
            ? requestedView
            : "pages";
    const defaultView = "pages";
    const page = parsePositiveInt(params.page, 1);
    const rawPageSize = parsePositiveInt(params.pageSize, DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(rawPageSize, MAX_PAGE_SIZE);

    // Build source options from backend if available; fall back to demo data.
    let sourceOptions: { value: string; label: string }[] = [
        { value: "phac", label: "Public Health Agency of Canada" },
        { value: "hc", label: "Health Canada" },
    ];
    let sourceSummaries: SourceBrowseSummary[] = [];

    // Start with demo search results. `DemoRecord` is assignable to the
    // `ArchiveListRecord` view used for rendering (it has extra fields).
    let results: ArchiveListRecord[] = searchDemoRecords({
        q,
        source,
        from: fromDate || undefined,
        to: toDate || undefined,
    });
    let totalResults = results.length;
    let usingBackend = false;
    let backendError: string | null = null;

    try {
        const apiSources = await fetchSources();

        if (apiSources.length > 0) {
            const filtered = apiSources.filter((s) => s.sourceCode !== "test");
            sourceOptions = filtered.map((s) => ({
                value: s.sourceCode,
                label: s.sourceName,
            }));
            sourceSummaries = filtered.map((s) => ({
                sourceCode: s.sourceCode,
                sourceName: s.sourceName,
                baseUrl: s.baseUrl,
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
            label: s.sourceName,
        }));
        sourceSummaries = demoSources.map((s) => ({
            sourceCode: s.sourceCode,
            sourceName: s.sourceName,
            baseUrl: null,
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
            q: q || undefined,
            source: source || undefined,
            sort: sort === "relevance" || sort === "newest" ? sort : undefined,
            view: view === "pages" || view === "snapshots" ? view : undefined,
            includeNon2xx: includeNon2xx || undefined,
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
        const backendPageCount = Math.max(
            1,
            Math.ceil(backend.total / pageSize)
        );
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
                "Invalid search filters. Please check your date range.";
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
        : results.slice(
              (effectivePage - 1) * paginationSize,
              effectivePage * paginationSize
          );

    const resultNoun = usingBackend
        ? view === "pages"
            ? "page"
            : "snapshot"
        : "snapshot";
    const formattedTotalResults = new Intl.NumberFormat(undefined).format(
        totalResults
    );
    const resultCountText =
        totalResults === 1
            ? `1 ${resultNoun}`
            : `${formattedTotalResults} ${resultNoun}s`;

    const buildPageHref = (targetPage: number) => {
        const qs = new URLSearchParams();
        if (q) qs.set("q", q);
        if (source) qs.set("source", source);
        if (fromDate) qs.set("from", fromDate);
        if (toDate) qs.set("to", toDate);
        if (sort !== defaultSort) qs.set("sort", sort);
        if (view !== defaultView) qs.set("view", view);
        if (includeNon2xx) qs.set("includeNon2xx", "true");
        if (targetPage > 1) qs.set("page", String(targetPage));
        if (pageSize !== DEFAULT_PAGE_SIZE)
            qs.set("pageSize", String(pageSize));
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
        <PageShell
            eyebrow="Archive explorer"
            title="Browse & search snapshots"
            compact
            hideHeaderVisually
        >
            <ApiHealthBanner />
            {sourceSummaries.length > 0 && (
                <section className="ha-home-panel-gradient ha-home-panel-gradient-compact mb-4 space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Browse archived sites
                            </h2>
                        </div>
                        <Link
                            href="/archive/browse-by-source"
                            className="text-xs font-medium text-ha-accent hover:text-blue-700"
                        >
                            Browse all sources →
                        </Link>
                    </div>

                    <div className="overflow-x-auto px-1 pb-4 pt-0">
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
                                        className="ha-card ha-card-tight-shadow w-[min(360px,86vw)] flex-shrink-0 overflow-hidden p-0"
                                        data-testid={`archive-source-${summary.sourceCode}`}
                                    >
                                        {previewSrc ? (
                                            browseId ? (
                                                <Link
                                                    href={`/browse/${browseId}`}
                                                    className="relative block h-[6rem] overflow-hidden border-b border-ha-border bg-white"
                                                    aria-label={`View ${summary.sourceName}`}
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={previewSrc}
                                                        alt={`${summary.sourceName} preview`}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="h-full w-full object-cover object-top"
                                                    />
                                                </Link>
                                            ) : (
                                                <div className="relative h-[6rem] overflow-hidden border-b border-ha-border bg-white">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={previewSrc}
                                                        alt={`${summary.sourceName} preview`}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="h-full w-full object-cover object-top"
                                                    />
                                                </div>
                                            )
                                        ) : browseId ? (
                                            <Link
                                                href={`/browse/${browseId}`}
                                                className="flex h-[6rem] items-center justify-center border-b border-ha-border bg-white px-4 text-xs text-ha-muted dark:bg-[#0b0c0d]"
                                                aria-label={`View ${summary.sourceName}`}
                                            >
                                                Preview unavailable
                                            </Link>
                                        ) : (
                                            <div className="flex h-[6rem] items-center justify-center border-b border-ha-border bg-white px-4 text-xs text-ha-muted dark:bg-[#0b0c0d]">
                                                Preview unavailable
                                            </div>
                                        )}

                                        <div className="p-3 sm:p-4">
                                            {browseId ? (
                                                <Link
                                                    href={`/browse/${browseId}`}
                                                    className="inline-block text-sm font-semibold text-slate-900 hover:underline"
                                                >
                                                    {summary.sourceName}
                                                </Link>
                                            ) : (
                                                <h3 className="text-sm font-semibold text-slate-900">
                                                    {summary.sourceName}
                                                </h3>
                                            )}
                                            <p className="mt-1 text-xs text-ha-muted whitespace-nowrap">
                                                {summary.recordCount.toLocaleString()}{" "}
                                                snapshot
                                                {summary.recordCount === 1
                                                    ? ""
                                                    : "s"}{" "}
                                                · latest{" "}
                                                {formatDate(
                                                    summary.lastCapture
                                                )}
                                            </p>
                                            {summary.baseUrl && (
                                                <div className="mt-2 flex min-w-0 items-baseline gap-1 text-[11px] text-ha-muted">
                                                    <span className="flex-shrink-0 font-medium text-slate-800">
                                                        Homepage:
                                                    </span>
                                                    {browseId ? (
                                                        <Link
                                                            href={`/browse/${browseId}`}
                                                            className="min-w-0 truncate hover:underline"
                                                            title={
                                                                summary.baseUrl
                                                            }
                                                        >
                                                            {summary.baseUrl}
                                                        </Link>
                                                    ) : (
                                                        <span
                                                            className="min-w-0 truncate"
                                                            title={
                                                                summary.baseUrl
                                                            }
                                                        >
                                                            {summary.baseUrl}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="mt-3 flex flex-wrap gap-2 sm:flex-nowrap">
                                                {browseId && (
                                                    <Link
                                                        href={`/browse/${browseId}`}
                                                        className="ha-btn-primary"
                                                    >
                                                        View
                                                    </Link>
                                                )}
                                                {summary.entryBrowseUrl && (
                                                    <a
                                                        href={
                                                            summary.entryBrowseUrl
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="ha-btn-secondary"
                                                        title="Open this source homepage in the replay service (new tab)"
                                                    >
                                                        Replay ↗
                                                    </a>
                                                )}
                                                <Link
                                                    href={`/archive?source=${encodeURIComponent(
                                                        summary.sourceCode
                                                    )}&focus=filters`}
                                                    scroll={false}
                                                    className="ha-btn-secondary"
                                                >
                                                    Search
                                                </Link>
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
                <aside
                    id="archive-filters"
                    className="ha-card ha-home-panel p-4 sm:p-5 space-y-3"
                >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="text-sm font-semibold text-slate-900">
                            Search
                        </h2>
                        <span className="text-xs text-ha-muted">
                            {resultCountText}
                            {q && (
                                <>
                                    {" "}
                                    matching{" "}
                                    <span className="font-medium">“{q}”</span>
                                </>
                            )}
                            {(fromDate || toDate) && (
                                <>
                                    {" "}
                                    · Date:{" "}
                                    {fromDate ? formatDate(fromDate) : "Any"} –{" "}
                                    {toDate ? formatDate(toDate) : "Any"}
                                </>
                            )}
                        </span>
                    </div>

                    <form
                        key={`archive-filters:${q}:${source}:${fromDate}:${toDate}:${sort}:${view}:${
                            includeNon2xx ? "1" : "0"
                        }:${pageSize}`}
                        className="space-y-4"
                        method="get"
                    >
                        <ArchiveFiltersAutoscroll targetId="archive-filters" />
                        <input
                            type="hidden"
                            name="page"
                            value="1"
                        />
                        {!usingBackend && (
                            <input
                                type="hidden"
                                name="pageSize"
                                value={String(pageSize)}
                            />
                        )}
                        {!usingBackend && sort !== defaultSort && (
                            <input type="hidden" name="sort" value={sort} />
                        )}
                        {!usingBackend && view !== defaultView && (
                            <input type="hidden" name="view" value={view} />
                        )}
                        {!usingBackend && includeNon2xx && (
                            <input
                                type="hidden"
                                name="includeNon2xx"
                                value="true"
                            />
                        )}
                        {/* Text search */}
                        <div className="space-y-1">
                            <label
                                htmlFor="q"
                                className="text-xs font-medium text-slate-800"
                            >
                                Keywords
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id="q"
                                    name="q"
                                    type="search"
                                    defaultValue={q}
                                    placeholder="e.g. influenza, https://www.canada.ca/…, covid AND vaccine, -archived, url:covid"
                                    className="min-w-0 flex-1 rounded-lg border border-ha-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                                />
                                <HoverGlowButton
                                    type="submit"
                                    className="ha-btn-primary text-xs whitespace-nowrap"
                                >
                                    Search
                                </HoverGlowButton>
                            </div>
                        </div>

                        {/* Source select */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                            <div className="space-y-1 sm:col-span-2">
                                <div className="flex items-baseline justify-between gap-2">
                                    <label
                                        htmlFor="source"
                                        className="text-xs font-medium text-slate-800"
                                    >
                                        Source
                                    </label>
                                </div>
                                <select
                                    id="source"
                                    name="source"
                                    defaultValue={source}
                                    className="w-full rounded-lg border border-ha-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                                >
                                    <option value="">All sources</option>
                                    {sourceOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1 sm:col-span-1">
                                <label
                                    htmlFor="from"
                                    className="text-xs font-medium text-slate-800"
                                >
                                    From
                                </label>
                                <input
                                    id="from"
                                    name="from"
                                    type="date"
                                    defaultValue={fromDate}
                                    className="w-full rounded-lg border border-ha-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                                />
                            </div>
                            <div className="space-y-1 sm:col-span-1">
                                <label
                                    htmlFor="to"
                                    className="text-xs font-medium text-slate-800"
                                >
                                    To
                                </label>
                                <input
                                    id="to"
                                    name="to"
                                    type="date"
                                    defaultValue={toDate}
                                    className="w-full rounded-lg border border-ha-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                                />
                            </div>
                        </div>
                        {usingBackend && (
                            <div className="rounded-lg bg-white/60 px-3 py-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="inline-flex items-center gap-1">
                                        <label
                                            htmlFor="view"
                                            className="text-[11px] font-medium text-ha-muted"
                                        >
                                            Show
                                        </label>
                                        <span className="group relative inline-flex">
                                            <button
                                                type="button"
                                                className="relative -top-[1px] text-[10px] font-semibold leading-none text-ha-muted transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#11588f] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                                                aria-label="Info about page grouping"
                                            >
                                                i
                                            </button>
                                            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-lg border border-ha-border bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-700 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                                                Pages shows the latest capture per page. All snapshots shows every capture.
                                            </span>
                                        </span>
                                        <select
                                            id="view"
                                            name="view"
                                            defaultValue={view}
                                            className="ha-select ha-select-sm"
                                        >
                                            <option value="pages">
                                                Pages (latest)
                                            </option>
                                            <option value="snapshots">
                                                All snapshots
                                            </option>
                                        </select>
                                    </div>

                                    <div className="inline-flex items-center gap-1">
                                        <label
                                            htmlFor="sort"
                                            className="text-[11px] font-medium text-ha-muted"
                                        >
                                            Sort
                                        </label>
                                        <select
                                            id="sort"
                                            name="sort"
                                            defaultValue={sort}
                                            className="ha-select ha-select-sm"
                                        >
                                            <option value="relevance">
                                                Relevance
                                            </option>
                                            <option value="newest">Newest</option>
                                        </select>
                                    </div>

                                    <div className="inline-flex items-center gap-1">
                                        <label
                                            htmlFor="pageSize"
                                            className="text-[11px] font-medium text-ha-muted"
                                        >
                                            Per page
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

                                    <label className="inline-flex items-center gap-1 text-[11px] font-medium text-ha-muted">
                                        <input
                                            type="checkbox"
                                            name="includeNon2xx"
                                            value="true"
                                            defaultChecked={includeNon2xx}
                                        />
                                        Include errors
                                    </label>

                                    <button
                                        type="submit"
                                        className="ha-btn-secondary text-xs !rounded-lg !px-3 !py-1.5"
                                    >
                                        Apply
                                    </button>

                                    <Link
                                        href="/archive"
                                        className="ml-auto text-xs font-medium text-ha-muted hover:text-slate-900"
                                    >
                                        Clear
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
                                Clear filters
                            </Link>
                        </div>
                    )}

                    <SearchWithinResults
                        q={q}
                        source={source}
                        fromDate={fromDate}
                        toDate={toDate}
                        sort={sort}
                        view={view}
                        includeNon2xx={includeNon2xx}
                        pageSize={pageSize}
                        defaultSort={defaultSort}
                        defaultView={defaultView}
                    />
                </aside>

                {/* Search & results */}
                <section className="space-y-4">
                    {!usingBackend && (
                        <div className="ha-card ha-home-panel p-4 sm:p-5">
                            <p className="text-[11px] font-medium text-amber-800">
                                Live API unavailable; showing a limited offline
                                sample.
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {totalResults === 0 ? (
                            <div className="ha-card ha-home-panel p-4 sm:p-5">
                                <p className="text-sm text-ha-muted">
                                    No records match the current filters. Try
                                    removing some filters, using broader
                                    keywords, or{" "}
                                    <Link
                                        href="/archive"
                                        className="font-medium text-ha-accent hover:text-blue-700"
                                    >
                                        resetting the search
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
                                    query={q}
                                />
                            ))
                        )}
                    </div>

                    {pageCount > 1 && (
                        <div className="ha-card ha-home-panel flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-ha-muted sm:p-5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span>
                                    Page {Math.min(effectivePage, pageCount)} of{" "}
                                    {pageCount}
                                </span>
                                {usingBackend && (
                                    <span className="text-[11px] text-ha-muted">
                                        Showing{" "}
                                        {(effectivePage - 1) * paginationSize +
                                            1}
                                        -
                                        {Math.min(
                                            effectivePage * paginationSize,
                                            totalResults
                                        )}{" "}
                                        of {totalResults}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={buildPageHref(1)}
                                    aria-disabled={effectivePage <= 1}
                                    className={`ha-btn-secondary text-xs ${
                                        effectivePage <= 1
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }`}
                                >
                                    « First
                                </Link>
                                <Link
                                    href={buildPageHref(
                                        Math.max(1, effectivePage - 1)
                                    )}
                                    aria-disabled={effectivePage <= 1}
                                    className={`ha-btn-secondary text-xs ${
                                        effectivePage <= 1
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }`}
                                >
                                    ← Prev
                                </Link>
                                <Link
                                    href={buildPageHref(
                                        Math.min(pageCount, effectivePage + 1)
                                    )}
                                    aria-disabled={effectivePage >= pageCount}
                                    className={`ha-btn-secondary text-xs ${
                                        effectivePage >= pageCount
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }`}
                                >
                                    Next →
                                </Link>
                                <Link
                                    href={buildPageHref(pageCount)}
                                    aria-disabled={effectivePage >= pageCount}
                                    className={`ha-btn-secondary text-xs ${
                                        effectivePage >= pageCount
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }`}
                                >
                                    Last »
                                </Link>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <p className="text-xs leading-relaxed text-ha-muted">
                Early release: coverage and features are still expanding.
            </p>
        </PageShell>
    );
}
