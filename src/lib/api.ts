export type SourceSummary = {
  sourceCode: string;
  sourceName: string;
  baseUrl: string | null;
  description: string | null;
  recordCount: number;
  firstCapture: string;
  lastCapture: string;
  latestRecordId: number | null;
  entryRecordId: number | null;
  entryBrowseUrl: string | null;
  entryPreviewUrl?: string | null;
};

export type SourceEdition = {
  jobId: number;
  jobName: string;
  recordCount: number;
  firstCapture: string;
  lastCapture: string;
  entryBrowseUrl?: string | null;
};

export type SnapshotSummary = {
  id: number;
  title: string | null;
  sourceCode: string;
  sourceName: string;
  language: string | null;
  captureDate: string;
  captureTimestamp: string | null;
  jobId: number | null;
  originalUrl: string;
  snippet: string | null;
  pageSnapshotsCount?: number | null;
  rawSnapshotUrl: string | null;
  browseUrl: string | null;
};

export type SearchResponse = {
  results: SnapshotSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type SnapshotDetail = {
  id: number;
  title: string | null;
  sourceCode: string;
  sourceName: string;
  language: string | null;
  captureDate: string;
  captureTimestamp: string | null;
  jobId: number | null;
  originalUrl: string;
  snippet: string | null;
  rawSnapshotUrl: string | null;
  browseUrl: string | null;
  mimeType: string | null;
  statusCode: number | null;
};

export type HealthResponse = {
  status: "ok" | "error";
  checks?: Record<string, unknown>;
};

export type ArchiveStats = {
  snapshotsTotal: number;
  pagesTotal: number;
  sourcesTotal: number;
  latestCaptureDate: string | null;
  latestCaptureAgeDays: number | null;
};

export type UsageMetricsCounts = {
  searchRequests: number;
  snapshotDetailViews: number;
  rawSnapshotViews: number;
  reportSubmissions: number;
};

export type UsageMetricsDay = UsageMetricsCounts & {
  date: string;
};

export type UsageMetrics = {
  enabled: boolean;
  windowDays: number;
  totals: UsageMetricsCounts;
  daily: UsageMetricsDay[];
};

export type ChangeEvent = {
  changeId: number;
  changeType: string;
  summary: string | null;
  highNoise: boolean;
  diffAvailable: boolean;
  sourceCode: string | null;
  sourceName: string | null;
  normalizedUrlGroup: string | null;
  fromSnapshotId: number | null;
  toSnapshotId: number;
  fromCaptureTimestamp: string | null;
  toCaptureTimestamp: string | null;
  fromJobId: number | null;
  toJobId: number | null;
  addedSections: number | null;
  removedSections: number | null;
  changedSections: number | null;
  addedLines: number | null;
  removedLines: number | null;
  changeRatio: number | null;
};

export type ChangeFeed = {
  enabled: boolean;
  total: number;
  page: number;
  pageSize: number;
  results: ChangeEvent[];
};

export type ChangeCompareSnapshot = {
  snapshotId: number;
  title: string | null;
  captureDate: string;
  captureTimestamp: string | null;
  originalUrl: string;
  jobId: number | null;
  jobName: string | null;
};

export type ChangeCompare = {
  event: ChangeEvent;
  fromSnapshot: ChangeCompareSnapshot | null;
  toSnapshot: ChangeCompareSnapshot;
  diffFormat: string | null;
  diffHtml: string | null;
  diffTruncated: boolean;
  diffVersion: string | null;
  normalizationVersion: string | null;
};

export type CompareLiveFetch = {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  contentType: string | null;
  bytesRead: number;
  fetchedAt: string;
};

export type CompareLiveStats = {
  summary: string;
  addedSections: number;
  removedSections: number;
  changedSections: number;
  addedLines: number;
  removedLines: number;
  changeRatio: number;
  highNoise: boolean;
};

export type CompareLiveDiff = {
  diffFormat: string;
  diffHtml: string;
  diffTruncated: boolean;
  diffVersion: string;
  normalizationVersion: string;
};

export type CompareLiveRenderInstruction = {
  type: "unchanged" | "added" | "removed" | "replace";
  lineIndexA?: number | null;
  lineIndexB?: number | null;
};

export type CompareLiveRender = {
  archivedLines: string[];
  liveLines: string[];
  renderInstructions: CompareLiveRenderInstruction[];
  renderTruncated: boolean;
  renderLineLimit: number;
};

export type CompareLiveTextMode = "main" | "full";

export type CompareLive = {
  archivedSnapshot: ChangeCompareSnapshot;
  liveFetch: CompareLiveFetch;
  stats: CompareLiveStats;
  diff: CompareLiveDiff;
  render: CompareLiveRender;
  textModeRequested: CompareLiveTextMode;
  textModeUsed: CompareLiveTextMode;
  textModeFallback: boolean;
};

export type SnapshotTimelineItem = {
  snapshotId: number;
  captureDate: string;
  captureTimestamp: string | null;
  jobId: number | null;
  jobName: string | null;
  title: string | null;
  statusCode: number | null;
  compareFromSnapshotId: number | null;
};

export type SnapshotTimeline = {
  sourceCode: string | null;
  sourceName: string | null;
  normalizedUrlGroup: string | null;
  snapshots: SnapshotTimelineItem[];
};

export type ReplayResolveResponse = {
  found: boolean;
  snapshotId: number | null;
  captureTimestamp: string | null;
  resolvedUrl: string | null;
  browseUrl: string | null;
  mimeType: string | null;
};

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(args: { status: number; statusText: string; detail?: unknown }) {
    const detailText =
      typeof args.detail === "string"
        ? `: ${args.detail}`
        : args.detail != null
          ? `: ${JSON.stringify(args.detail)}`
          : "";
    super(`Backend request failed: ${args.status} ${args.statusText}${detailText}`);
    this.name = "ApiError";
    this.status = args.status;
    this.detail = args.detail ?? null;
  }
}

const API_BASE_ENV = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;

export function getApiBaseUrl(): string {
  if (API_BASE_ENV) {
    return API_BASE_ENV.replace(/\/+$/, "");
  }
  // Sensible local default; override in env for staging/prod.
  return "http://localhost:8001";
}

type FetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

const DEFAULT_FETCH_TIMEOUT_MS = 8000;

async function fetchJson<T>(path: string, query?: URLSearchParams, init?: FetchInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url =
    query && String(query) ? `${baseUrl}${path}?${query.toString()}` : `${baseUrl}${path}`;

  const shouldApplyTimeout = init?.signal == null;
  const abortController = shouldApplyTimeout ? new AbortController() : null;
  const timeoutHandle = shouldApplyTimeout
    ? setTimeout(() => abortController?.abort(), DEFAULT_FETCH_TIMEOUT_MS)
    : null;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...init,
      signal: init?.signal ?? abortController?.signal,
    } as unknown as RequestInit);

    if (!res.ok) {
      let detail: unknown = null;
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        try {
          const data: unknown = await res.json();
          if (typeof data === "object" && data !== null && "detail" in data) {
            detail = (data as { detail?: unknown }).detail ?? null;
          }
        } catch {
          detail = null;
        }
      }

      throw new ApiError({
        status: res.status,
        statusText: res.statusText,
        detail,
      });
    }

    return (await res.json()) as T;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function fetchSources(): Promise<SourceSummary[]> {
  return fetchJson<SourceSummary[]>("/api/sources");
}

export async function fetchSourcesLocalized(args?: {
  lang?: "en" | "fr";
}): Promise<SourceSummary[]> {
  const lang = args?.lang;
  const query = new URLSearchParams();
  if (lang === "en" || lang === "fr") {
    query.set("lang", lang);
  }
  return fetchJson<SourceSummary[]>("/api/sources", query);
}

export async function fetchSourceEditions(sourceCode: string): Promise<SourceEdition[]> {
  const normalized = sourceCode.trim();
  if (!normalized) return [];

  return fetchJson<SourceEdition[]>(`/api/sources/${encodeURIComponent(normalized)}/editions`);
}

export type SearchParams = {
  q?: string;
  source?: string;
  page?: number;
  pageSize?: number;
  sort?: "relevance" | "newest";
  view?: "snapshots" | "pages";
  includeNon2xx?: boolean;
  includeDuplicates?: boolean;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
};

export async function searchSnapshots(params: SearchParams): Promise<SearchResponse> {
  const query = new URLSearchParams();

  if (params.q) query.set("q", params.q);
  if (params.source) query.set("source", params.source);
  if (params.sort) query.set("sort", params.sort);
  if (params.view) query.set("view", params.view);
  if (params.includeNon2xx) query.set("includeNon2xx", "true");
  if (params.includeDuplicates) query.set("includeDuplicates", "true");
  if (params.from?.trim()) query.set("from", params.from.trim());
  if (params.to?.trim()) query.set("to", params.to.trim());
  if (params.page && params.page > 1) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return fetchJson<SearchResponse>("/api/search", query);
}

export async function fetchSnapshotDetail(id: number): Promise<SnapshotDetail> {
  return fetchJson<SnapshotDetail>(`/api/snapshot/${id}`);
}

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/api/health");
}

export async function fetchArchiveStats(): Promise<ArchiveStats> {
  return fetchJson<ArchiveStats>("/api/stats", undefined, {
    cache: "force-cache",
    next: { revalidate: 300 },
  });
}

export async function fetchUsageMetrics(): Promise<UsageMetrics> {
  return fetchJson<UsageMetrics>("/api/usage");
}

export type ChangeQueryParams = {
  source?: string;
  jobId?: number;
  latest?: boolean;
  includeUnchanged?: boolean;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchChanges(params: ChangeQueryParams): Promise<ChangeFeed> {
  const query = new URLSearchParams();
  if (params.source) query.set("source", params.source);
  if (params.jobId) query.set("jobId", String(params.jobId));
  if (params.latest) query.set("latest", "true");
  if (params.includeUnchanged) query.set("includeUnchanged", "true");
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return fetchJson<ChangeFeed>("/api/changes", query);
}

export async function fetchChangeCompare(params: {
  toSnapshotId: number;
  fromSnapshotId?: number | null;
}): Promise<ChangeCompare> {
  const query = new URLSearchParams();
  query.set("toSnapshotId", String(params.toSnapshotId));
  if (params.fromSnapshotId) {
    query.set("fromSnapshotId", String(params.fromSnapshotId));
  }
  return fetchJson<ChangeCompare>("/api/changes/compare", query);
}

export async function fetchSnapshotCompareLive(
  snapshotId: number,
  params?: {
    mode?: CompareLiveTextMode;
  },
): Promise<CompareLive> {
  const query = new URLSearchParams();
  if (params?.mode && params.mode !== "main") {
    query.set("mode", params.mode);
  }

  return fetchJson<CompareLive>(`/api/snapshots/${snapshotId}/compare-live`, query);
}

export async function fetchSnapshotTimeline(snapshotId: number): Promise<SnapshotTimeline> {
  return fetchJson<SnapshotTimeline>(`/api/snapshots/${snapshotId}/timeline`);
}

export async function resolveReplayUrl(params: {
  jobId: number;
  url: string;
  timestamp14?: string | null;
}): Promise<ReplayResolveResponse> {
  const query = new URLSearchParams();
  query.set("jobId", String(params.jobId));
  query.set("url", params.url);
  if (params.timestamp14) query.set("timestamp", params.timestamp14);

  return fetchJson<ReplayResolveResponse>("/api/replay/resolve", query);
}
