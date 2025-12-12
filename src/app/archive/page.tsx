import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import {
  getAllTopics,
  searchDemoRecords,
  getSourcesSummary,
  slugifyTopic,
} from "@/data/demo-records";
import type { DemoRecord } from "@/data/demo-records";
import {
  fetchSources,
  fetchTopics,
  searchSnapshots,
  type SearchParams as ApiSearchParams,
} from "@/lib/api";
import { ApiHealthBanner } from "@/components/ApiHealthBanner";

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

type ArchiveSearchParams = {
  q?: string;
  source?: string;
  topic?: string;
  page?: string;
  pageSize?: string;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

type ArchiveListRecord = Omit<DemoRecord, "snapshotPath">;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<ArchiveSearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const source = params.source?.trim() ?? "";
  const topic = params.topic?.trim() ?? "";
  const page = parsePositiveInt(params.page, 1);
  const rawPageSize = parsePositiveInt(params.pageSize, DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(rawPageSize, MAX_PAGE_SIZE);

  // Build source + topic options from backend if available; fall back to demo data.
  let sourceOptions: { value: string; label: string }[] = [
    { value: "phac", label: "Public Health Agency of Canada" },
    { value: "hc", label: "Health Canada" },
  ];
  let topicOptions: { value: string; label: string }[] = getAllTopics().map(
    (t) => ({
      value: slugifyTopic(t) || t,
      label: t,
    }),
  );
  let sourcesFromBackend = false;
  let topicsFromBackend = false;

  // Start with demo search results and project them into a shape that does not
  // depend on `snapshotPath`, so we can reuse the same type for backend
  // results and demo fallback.
  let results: ArchiveListRecord[] = searchDemoRecords({
    q,
    source,
    topic,
  }).map(({ snapshotPath: _ignored, ...rest }) => rest);
  let totalResults = results.length;
  let usingBackend = false;

  try {
    const [apiSources, apiTopics] = await Promise.all([
      fetchSources(),
      fetchTopics(),
    ]);

    if (apiSources.length > 0) {
      sourcesFromBackend = true;
      sourceOptions = apiSources.map((s) => ({
        value: s.sourceCode,
        label: s.sourceName,
      }));
    }

    const canonicalTopics = apiTopics ?? [];
    if (canonicalTopics.length > 0) {
      topicsFromBackend = true;
      topicOptions = canonicalTopics
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((t) => ({ value: t.slug, label: t.label }));
    } else if (apiSources.length > 0) {
      const topicMap = new Map<string, string>();
      apiSources.forEach((s) => {
        s.topics?.forEach((t) => {
          topicMap.set(t.slug, t.label);
        });
      });
      if (topicMap.size > 0) {
        topicsFromBackend = true;
        topicOptions = Array.from(topicMap.entries())
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([slug, label]) => ({ value: slug, label }));
      }
    }
  } catch {
    const demoSources = getSourcesSummary();
    sourceOptions = demoSources.map((s) => ({
      value: s.sourceCode,
      label: s.sourceName,
    }));
    sourcesFromBackend = false;
    topicsFromBackend = false;
  }

  // Attempt to use the backend search API if configured; fall back to the
  // local demo dataset on any error or if the backend URL is not set.
  try {
    const backend = await searchSnapshots({
      q: q || undefined,
      source: source || undefined,
      topic: topic || undefined,
      page,
      pageSize,
    } as ApiSearchParams);
    results = backend.results.map((r) => ({
      id: String(r.id),
      title: r.title ?? "",
      sourceCode: r.sourceCode as "phac" | "hc",
      sourceName: r.sourceName,
      language: r.language ?? "",
      topics: r.topics.map((t) => t.label),
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
  const pageCount = Math.max(
    1,
    Math.ceil(totalResults / paginationSize),
  );
  const effectivePage = Math.min(Math.max(1, page), pageCount);
  const paginatedResults = usingBackend
    ? results
    : results.slice(
        (effectivePage - 1) * paginationSize,
        effectivePage * paginationSize,
      );

  const resultCountText =
    totalResults === 1 ? "1 snapshot" : `${totalResults} snapshots`;

  const buildPageHref = (targetPage: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (source) qs.set("source", source);
    if (topic) qs.set("topic", topic);
    if (targetPage > 1) qs.set("page", String(targetPage));
    if (pageSize !== DEFAULT_PAGE_SIZE) qs.set("pageSize", String(pageSize));
    const queryString = qs.toString();
    return queryString ? `/archive?${queryString}` : "/archive";
  };

  return (
    <PageShell
      eyebrow="Archive explorer (demo)"
      title="Browse & search demo snapshots"
      intro="This is a prototype view showing how the archive explorer will behave. Search and filters are powered by a small demo dataset from selected Public Health Agency of Canada and Health Canada pages."
    >
      <ApiHealthBanner />
      <div className="ha-home-hero grid gap-8 lg:grid-cols-[minmax(0,280px),minmax(0,1fr)] lg:items-start">
        {/* Filters panel */}
        <aside className="ha-card ha-home-panel p-4 sm:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Filters {usingBackend ? "(live API)" : "(demo dataset fallback)"}
          </h2>
          <p className="text-sm leading-relaxed text-ha-muted">
            Adjust these filters and re-run the search on the right. In the full
            archive, more granular options such as date ranges and jurisdictions
            would be available.
          </p>

          <form className="space-y-4" method="get">
            <input type="hidden" name="page" value={String(effectivePage)} />
            <input type="hidden" name="pageSize" value={String(pageSize)} />
            {/* Text search */}
            <div className="space-y-1">
              <label htmlFor="q" className="text-xs font-medium text-slate-800">
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
              <p id="archive-keywords-help" className="text-[11px] text-ha-muted">
                Search across titles, snippets, sources, topics, and language.
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

            {/* Topic select */}
            <div className="space-y-1">
              <label
                htmlFor="topic"
                className="text-xs font-medium text-slate-800"
              >
                Topic
              </label>
              <select
                id="topic"
                name="topic"
                defaultValue={topic}
                className="w-full rounded-lg border border-ha-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
              >
                <option value="">All topics</option>
                {topicOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button type="submit" className="ha-btn-primary ha-btn-glow text-xs">
                Apply filters
              </button>
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
                      matching <span className="font-medium">“{q}”</span>
                    </>
                  )}
                </p>
                {!usingBackend && (
                  <p className="text-[11px] font-medium text-amber-800">
                    Backend unavailable; showing demo data.
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
              <form className="flex flex-col gap-2 sm:flex-row" method="get">
                <label className="sr-only" htmlFor="q2">
                  Search keywords
                </label>
                <input
                  id="q2"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Search within demo snapshots…"
                  className="flex-1 rounded-full border border-ha-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
                />
                {/* Keep filters in sync */}
                <input type="hidden" name="source" value={source} />
                <input type="hidden" name="topic" value={topic} />
                <input type="hidden" name="page" value={String(effectivePage)} />
                <input type="hidden" name="pageSize" value={String(pageSize)} />
                <button
                  type="submit"
                  className="ha-btn-secondary ha-btn-glow text-xs"
                >
                  Search
                </button>
              </form>

              {usingBackend && (
                <form className="flex items-center gap-2" method="get">
                  <input type="hidden" name="q" value={q} />
                  <input type="hidden" name="source" value={source} />
                  <input type="hidden" name="topic" value={topic} />
                  <input type="hidden" name="page" value="1" />
                  <label htmlFor="pageSize" className="text-xs text-ha-muted">
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
                  <button type="submit" className="ha-btn-secondary text-xs">
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
                  No records match the current filters. Try removing some
                  filters, using broader keywords, or{" "}
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
                <article
                  key={record.id}
                  className="ha-card ha-card-elevated p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-900">
                        <Link
                          href={`/snapshot/${record.id}`}
                          className="hover:text-ha-accent"
                        >
                          {record.title}
                        </Link>
                      </h3>
                      <p className="text-xs text-ha-muted">
                        {[
                          record.sourceName,
                          record.captureDate
                            ? `captured ${formatDate(record.captureDate)}`
                            : null,
                          record.language || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Link
                      href={`/snapshot/${record.id}`}
                      className="ha-btn-secondary text-xs"
                    >
                      View snapshot
                    </Link>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-800 sm:text-sm">
                    {record.snippet || "No summary available for this snapshot yet."}
                  </p>
                  <p className="mt-2 text-[11px] text-ha-muted">
                    Original URL:{" "}
                    <span className="break-all">{record.originalUrl}</span>
                  </p>
                  {record.topics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {record.topics.map((t) => (
                        <span key={t} className="ha-badge">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          {pageCount > 1 && (
            <div className="ha-card ha-home-panel flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-ha-muted sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  Page {Math.min(effectivePage, pageCount)} of {pageCount}
                </span>
                {usingBackend && (
                  <span className="text-[11px] text-ha-muted">
                    Showing {(effectivePage - 1) * paginationSize + 1}-
                    {Math.min(effectivePage * paginationSize, totalResults)} of{" "}
                    {totalResults}
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
                  « First
                </Link>
                <Link
                  href={buildPageHref(Math.max(1, effectivePage - 1))}
                  aria-disabled={effectivePage <= 1}
                  className={`ha-btn-secondary text-xs ${
                    effectivePage <= 1 ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  ← Prev
                </Link>
                <Link
                  href={buildPageHref(Math.min(pageCount, effectivePage + 1))}
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
