import type { components } from "./api-contract.generated";

type ApiSchemas = components["schemas"];

export type SourceSummary = ApiSchemas["SourceSummarySchema"];
export type SourceEdition = ApiSchemas["SourceEditionSchema"];
export type SnapshotSummary = ApiSchemas["SnapshotSummarySchema"];
export type SearchResponse = ApiSchemas["SearchResponseSchema"];
export type SnapshotDetail = ApiSchemas["SnapshotDetailSchema"];

export type HealthResponse = {
  status: "ok" | "error";
  checks?: Record<string, unknown>;
};

export type ArchiveStats = ApiSchemas["ArchiveStatsSchema"];
export type UsageMetricsCounts = ApiSchemas["UsageMetricsCountsSchema"];
export type UsageMetricsDay = ApiSchemas["UsageMetricsDaySchema"];
export type UsageMetrics = ApiSchemas["UsageMetricsSchema"];
export type ChangeEvent = ApiSchemas["ChangeEventSchema"];
export type ChangeFeed = ApiSchemas["ChangeFeedSchema"];
export type ChangeCompareSnapshot = ApiSchemas["ChangeCompareSnapshotSchema"];
export type ChangeCompare = ApiSchemas["ChangeCompareSchema"];
export type CompareLiveFetch = ApiSchemas["CompareLiveFetchSchema"];
export type CompareLiveStats = ApiSchemas["CompareLiveStatsSchema"];
export type CompareLiveDiff = ApiSchemas["CompareLiveDiffSchema"];
export type CompareLiveRenderInstruction = Omit<
  ApiSchemas["CompareLiveRenderInstructionSchema"],
  "type"
> & {
  type: "unchanged" | "added" | "removed" | "replace";
};
export type CompareLiveRender = Omit<
  ApiSchemas["CompareLiveRenderSchema"],
  "renderInstructions"
> & {
  renderInstructions: CompareLiveRenderInstruction[];
};
export type CompareLiveTextMode = "main" | "full";
export type CompareLive = Omit<
  ApiSchemas["CompareLiveSchema"],
  "render" | "textModeRequested" | "textModeUsed"
> & {
  render: CompareLiveRender;
  textModeRequested: CompareLiveTextMode;
  textModeUsed: CompareLiveTextMode;
};
export type SnapshotTimelineItem = ApiSchemas["SnapshotTimelineItemSchema"];
export type SnapshotTimeline = ApiSchemas["SnapshotTimelineSchema"];
export type ReplayResolveResponse = ApiSchemas["ReplayResolveSchema"];
export type SnapshotLatest = ApiSchemas["SnapshotLatestSchema"];

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
const SHORT_REVALIDATE_SECONDS = 60;
const STANDARD_REVALIDATE_SECONDS = 300;
const LONG_REVALIDATE_SECONDS = 3600;

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
  return fetchJson<SourceSummary[]>("/api/sources", undefined, {
    cache: "force-cache",
    next: { revalidate: STANDARD_REVALIDATE_SECONDS },
  });
}

export async function fetchSourcesLocalized(args?: {
  lang?: "en" | "fr";
}): Promise<SourceSummary[]> {
  const lang = args?.lang;
  const query = new URLSearchParams();
  if (lang === "en" || lang === "fr") {
    query.set("lang", lang);
  }
  return fetchJson<SourceSummary[]>("/api/sources", query, {
    cache: "force-cache",
    next: { revalidate: STANDARD_REVALIDATE_SECONDS },
  });
}

export async function fetchSourceEditions(sourceCode: string): Promise<SourceEdition[]> {
  const normalized = sourceCode.trim();
  if (!normalized) return [];

  return fetchJson<SourceEdition[]>(
    `/api/sources/${encodeURIComponent(normalized)}/editions`,
    undefined,
    {
      cache: "force-cache",
      next: { revalidate: STANDARD_REVALIDATE_SECONDS },
    },
  );
}

export type SearchParams = {
  q?: string;
  source?: string;
  page?: number;
  pageSize?: number;
  sort?: ApiSchemas["SearchSort"];
  view?: ApiSchemas["SearchView"];
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
  return fetchJson<SnapshotDetail>(`/api/snapshot/${id}`, undefined, {
    cache: "force-cache",
    next: { revalidate: LONG_REVALIDATE_SECONDS },
  });
}

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/api/health", undefined, {
    cache: "force-cache",
    next: { revalidate: SHORT_REVALIDATE_SECONDS },
  });
}

export async function fetchArchiveStats(): Promise<ArchiveStats> {
  return fetchJson<ArchiveStats>("/api/stats", undefined, {
    cache: "force-cache",
    next: { revalidate: STANDARD_REVALIDATE_SECONDS },
  });
}

export async function fetchUsageMetrics(): Promise<UsageMetrics> {
  return fetchJson<UsageMetrics>("/api/usage", undefined, {
    cache: "force-cache",
    next: { revalidate: STANDARD_REVALIDATE_SECONDS },
  });
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

  return fetchJson<ChangeFeed>("/api/changes", query, {
    cache: "force-cache",
    next: { revalidate: STANDARD_REVALIDATE_SECONDS },
  });
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
  return fetchJson<ChangeCompare>("/api/changes/compare", query, {
    cache: "force-cache",
    next: { revalidate: LONG_REVALIDATE_SECONDS },
  });
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
  return fetchJson<SnapshotTimeline>(`/api/snapshots/${snapshotId}/timeline`, undefined, {
    cache: "force-cache",
    next: { revalidate: LONG_REVALIDATE_SECONDS },
  });
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

export async function fetchSnapshotLatest(
  snapshotId: number,
  params?: {
    requireHtml?: boolean;
  },
): Promise<SnapshotLatest> {
  const query = new URLSearchParams();
  if (params?.requireHtml === false) {
    query.set("requireHtml", "0");
  }

  return fetchJson<SnapshotLatest>(`/api/snapshots/${snapshotId}/latest`, query, {
    cache: "force-cache",
    next: { revalidate: STANDARD_REVALIDATE_SECONDS },
  });
}
