import { PageShell } from "@/components/layout/PageShell";
import {
    searchDemoRecords,
    getSourcesSummary,
} from "@/data/demo-records";
import type { DemoRecord } from "@/data/demo-records";
import {
    fetchSources,
    searchSnapshots,
    type SearchParams as ApiSearchParams,
} from "@/lib/api";
import { ApiHealthBanner } from "@/components/ApiHealthBanner";
import { HoverGlowButton } from "@/components/home/HoverGlowButton";
import { SearchResultCard } from "@/components/archive/SearchResultCard";
import Link from "next/link";

type ArchiveSearchParams = {
    q?: string;
    source?: string;
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
            : "snapshots";
    const defaultView = "snapshots";
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
    });
    let totalResults = results.length;
    let usingBackend = false;

    try {
        const apiSources = await fetchSources();

        if (apiSources.length > 0) {
            const filtered = apiSources.filter((s) => s.sourceCode !== "test");
            sourceOptions = filtered
                .map((s) => ({
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
            }));
    }

    // Attempt to use the backend search API; fall back to the bundled offline
    // sample dataset on any error.
    try {
        const backend = await searchSnapshots({
            q: q || undefined,
            source: source || undefined,
            sort: sort === "relevance" || sort === "newest" ? sort : undefined,
            view: view === "pages" || view === "snapshots" ? view : undefined,
            includeNon2xx: includeNon2xx || undefined,
            page,
            pageSize,
        } as ApiSearchParams);
        results = backend.results.map((r) => ({
            id: String(r.id),
            title: r.title ?? "",
            sourceCode: r.sourceCode,
            sourceName: r.sourceName,
            language: r.language ?? "",
            captureDate: r.captureDate,
            originalUrl: r.originalUrl,
            snippet: r.snippet ?? "",
        }));
        totalResults = backend.total;
        usingBackend = true;
    } catch {
        usingBackend = false;
        totalResults = results.length;
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

    const resultNoun = view === "pages" ? "page" : "snapshot";
    const resultCountText =
        totalResults === 1
            ? `1 ${resultNoun}`
            : `${totalResults} ${resultNoun}s`;

    const buildPageHref = (targetPage: number) => {
        const qs = new URLSearchParams();
        if (q) qs.set("q", q);
        if (source) qs.set("source", source);
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

    return (
        <PageShell
            eyebrow="Archive explorer"
            title="Browse & search snapshots"
            intro="Browse and search archived snapshots by keyword and source. This is an early release — coverage and features are still expanding."
        >
            <ApiHealthBanner />
            {sourceSummaries.length > 0 && (
                <section className="ha-home-panel-gradient mb-6 space-y-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Browse archived sites
                            </h2>
                            <p className="text-xs leading-relaxed text-ha-muted">
                                Jump into a source’s archived website and
                                follow links within that backup.
                            </p>
                        </div>
                        <Link
                            href="/archive/browse-by-source"
                            className="text-xs font-medium text-ha-accent hover:text-blue-700"
                        >
                            Browse all sources →
                        </Link>
                    </div>

                    <div className="-mx-1 overflow-x-auto px-1 pb-1">
                        <div className="flex gap-3">
                            {orderedSourceSummaries.map((summary) => {
                                const entryId = summary.entryRecordId;
                                const fallbackId = summary.latestRecordId;
                                const browseId = entryId ?? fallbackId;
                                const browseLabel = entryId
                                    ? "Browse archived site"
                                    : "Browse latest capture";

                                const previewUrl =
                                    summary.entryBrowseUrl ?? undefined;

                                return (
                                    <article
                                        key={summary.sourceCode}
                                        className="ha-card ha-card-elevated w-[min(360px,85vw)] flex-shrink-0 overflow-hidden p-0"
                                        data-testid={`archive-source-${summary.sourceCode}`}
                                    >
                                        {previewUrl ? (
                                            <div className="relative h-24 overflow-hidden border-b border-ha-border bg-white">
                                                <div className="pointer-events-none absolute inset-0 origin-top-left scale-[0.18]">
                                                    <iframe
                                                        title={`${summary.sourceName} preview`}
                                                        src={previewUrl}
                                                        loading="lazy"
                                                        sandbox=""
                                                        className="h-[540px] w-[1000px] border-0"
                                                    />
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/35 to-transparent dark:from-[#0b0c0d]/90 dark:via-[#0b0c0d]/35" />
                                            </div>
                                        ) : (
                                            <div className="flex h-24 items-center justify-center border-b border-ha-border bg-white px-4 text-xs text-ha-muted dark:bg-[#0b0c0d]">
                                                Preview unavailable
                                            </div>
                                        )}

                                        <div className="p-4 sm:p-5">
                                            <h3 className="text-sm font-semibold text-slate-900">
                                                {summary.sourceName}
                                            </h3>
                                            <p className="mt-1 text-xs text-ha-muted">
                                                {summary.recordCount} snapshot
                                                {summary.recordCount === 1
                                                    ? ""
                                                    : "s"}{" "}
                                                · latest capture{" "}
                                                {formatDate(summary.lastCapture)}
                                            </p>
                                            {summary.baseUrl && (
                                                <p className="mt-2 break-all text-[11px] text-ha-muted">
                                                    <span className="font-medium text-slate-800">
                                                        Homepage:
                                                    </span>{" "}
                                                    {summary.baseUrl}
                                                </p>
                                            )}

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {browseId && (
                                                    <Link
                                                        href={`/browse/${browseId}`}
                                                        className="ha-btn-primary text-xs"
                                                    >
                                                        {browseLabel}
                                                    </Link>
                                                )}
                                                {summary.entryBrowseUrl && (
                                                    <a
                                                        href={
                                                            summary.entryBrowseUrl
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="ha-btn-secondary text-xs"
                                                    >
                                                        Open in replay ↗
                                                    </a>
                                                )}
                                                <Link
                                                    href={`/archive?source=${summary.sourceCode}`}
                                                    className="ha-btn-secondary text-xs"
                                                >
                                                    Search this source
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
            <div className="ha-home-hero grid gap-8 lg:grid-cols-[minmax(0,280px),minmax(0,1fr)] lg:items-start">
                {/* Filters panel */}
                <aside className="ha-card ha-home-panel p-4 sm:p-5 space-y-3">
                    <h2 className="text-sm font-semibold text-slate-900">
                        Filters
                    </h2>
                    <p className="text-sm leading-relaxed text-ha-muted">
                        Adjust these filters and re-run the search on the right.
                        In the full archive, more granular options such as date
                        ranges and jurisdictions would be available.
                    </p>

                    <form className="space-y-4" method="get">
                        <input
                            type="hidden"
                            name="page"
                            value={String(effectivePage)}
                        />
                        <input
                            type="hidden"
                            name="pageSize"
                            value={String(pageSize)}
                        />
                        {sort !== defaultSort && (
                            <input type="hidden" name="sort" value={sort} />
                        )}
                        {view !== defaultView && (
                            <input type="hidden" name="view" value={view} />
                        )}
                        {includeNon2xx && (
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
                            <input
                                id="q"
                                name="q"
                                type="search"
                                defaultValue={q}
                                placeholder="e.g. influenza, naloxone, HIV"
                                aria-describedby="archive-keywords-help"
                                className="w-full rounded-lg border border-ha-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                            />
                            <p
                                id="archive-keywords-help"
                                className="text-[11px] text-ha-muted"
                            >
                                Search across titles, snippets, sources, and
                                language.
                            </p>
                        </div>

                        {/* Source select */}
                        <div className="space-y-1">
                            <label
                                htmlFor="source"
                                className="text-xs font-medium text-slate-800"
                            >
                                Source
                            </label>
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

                        <div className="flex items-center justify-between gap-2 pt-1">
                            <HoverGlowButton
                                type="submit"
                                className="ha-btn-primary text-xs"
                            >
                                Apply filters
                            </HoverGlowButton>
                            <Link
                                href="/archive"
                                className="text-xs font-medium text-ha-muted hover:text-slate-900"
                            >
                                Clear
                            </Link>
                        </div>
                    </form>
                </aside>

                {/* Search & results */}
                <section className="space-y-4">
                    <div className="ha-card ha-home-panel p-4 sm:p-5 space-y-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Search results
                                </h2>
                                <p className="text-xs text-ha-muted">
                                    {resultCountText}
                                    {q && (
                                        <>
                                            {" "}
                                            matching{" "}
                                            <span className="font-medium">
                                                “{q}”
                                            </span>
                                        </>
                                    )}
                                </p>
                                {!usingBackend && (
                                    <p className="text-[11px] font-medium text-amber-800">
                                        Live API unavailable; showing a limited
                                        offline sample.
                                    </p>
                                )}
                            </div>
                            <Link
                                href="/archive/browse-by-source"
                                className="text-xs font-medium text-ha-accent hover:text-blue-700"
                            >
                                Browse by source instead →
                            </Link>
                        </div>

                        <div className="mt-4 space-y-3">
                            <form
                                className="flex flex-col gap-2 sm:flex-row"
                                method="get"
                            >
                                <label className="sr-only" htmlFor="q2">
                                    Search keywords
                                </label>
                                <input
                                    id="q2"
                                    name="q"
                                    type="search"
                                    defaultValue={q}
                                    placeholder="Search within results…"
                                    className="flex-1 rounded-full border border-ha-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                                />
                                {/* Keep filters in sync */}
                                <input
                                    type="hidden"
                                    name="source"
                                    value={source}
                                />
                                {sort !== defaultSort && (
                                    <input
                                        type="hidden"
                                        name="sort"
                                        value={sort}
                                    />
                                )}
                                {view !== defaultView && (
                                    <input
                                        type="hidden"
                                        name="view"
                                        value={view}
                                    />
                                )}
                                {includeNon2xx && (
                                    <input
                                        type="hidden"
                                        name="includeNon2xx"
                                        value="true"
                                    />
                                )}
                                <input
                                    type="hidden"
                                    name="page"
                                    value={String(effectivePage)}
                                />
                                <input
                                    type="hidden"
                                    name="pageSize"
                                    value={String(pageSize)}
                                />
                                <HoverGlowButton
                                    type="submit"
                                    className="ha-btn-primary text-xs"
                                >
                                    Search
                                </HoverGlowButton>
                            </form>

                            {usingBackend && (
                                <form
                                    className="flex flex-wrap items-center gap-2"
                                    method="get"
                                >
                                    <input type="hidden" name="q" value={q} />
                                    <input
                                        type="hidden"
                                        name="source"
                                        value={source}
                                    />
                                    <input
                                        type="hidden"
                                        name="page"
                                        value="1"
                                    />
                                    <label
                                        htmlFor="view"
                                        className="text-xs text-ha-muted"
                                    >
                                        Show
                                    </label>
                                    <select
                                        id="view"
                                        name="view"
                                        defaultValue={view}
                                        className="rounded-lg border border-ha-border bg-white px-2 py-1 text-xs text-slate-900 shadow-sm outline-none focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                                    >
                                        <option value="snapshots">
                                            All snapshots
                                        </option>
                                        <option value="pages">Pages (latest)</option>
                                    </select>
                                    <label
                                        htmlFor="sort"
                                        className="text-xs text-ha-muted"
                                    >
                                        Sort
                                    </label>
                                    <select
                                        id="sort"
                                        name="sort"
                                        defaultValue={sort}
                                        className="rounded-lg border border-ha-border bg-white px-2 py-1 text-xs text-slate-900 shadow-sm outline-none focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                                    >
                                        <option value="relevance">Relevance</option>
                                        <option value="newest">Newest</option>
                                    </select>
                                    <label
                                        htmlFor="pageSize"
                                        className="text-xs text-ha-muted"
                                    >
                                        Results per page
                                    </label>
                                    <select
                                        id="pageSize"
                                        name="pageSize"
                                        defaultValue={String(pageSize)}
                                        className="rounded-lg border border-ha-border bg-white px-2 py-1 text-xs text-slate-900 shadow-sm outline-none focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                                    >
                                        {[10, 20, 50].map((size) => (
                                            <option key={size} value={size}>
                                                {size}
                                            </option>
                                        ))}
                                    </select>
                                    <label className="flex items-center gap-1 text-xs text-ha-muted">
                                        <input
                                            type="checkbox"
                                            name="includeNon2xx"
                                            value="true"
                                            defaultChecked={includeNon2xx}
                                        />
                                        Include error pages
                                    </label>
                                    <button
                                        type="submit"
                                        className="ha-btn-secondary text-xs"
                                    >
                                        Apply
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

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
        </PageShell>
    );
}
