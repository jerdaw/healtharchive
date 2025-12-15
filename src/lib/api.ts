export type TopicRef = {
  slug: string;
  label: string;
};

export type SourceSummary = {
  sourceCode: string;
  sourceName: string;
  recordCount: number;
  firstCapture: string;
  lastCapture: string;
  topics: TopicRef[];
  latestRecordId: number | null;
};

export type SnapshotSummary = {
  id: number;
  title: string | null;
  sourceCode: string;
  sourceName: string;
  language: string | null;
  topics: TopicRef[];
  captureDate: string;
  originalUrl: string;
  snippet: string | null;
  rawSnapshotUrl: string | null;
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
  topics: TopicRef[];
  captureDate: string;
  originalUrl: string;
  snippet: string | null;
  rawSnapshotUrl: string | null;
  mimeType: string | null;
  statusCode: number | null;
};

export type HealthResponse = {
  status: "ok" | "error";
  checks?: Record<string, unknown>;
};

const API_BASE_ENV =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;

export function getApiBaseUrl(): string {
  if (API_BASE_ENV) {
    return API_BASE_ENV.replace(/\/+$/, "");
  }
  // Sensible local default; override in env for staging/prod.
  return "http://localhost:8001";
}

async function fetchJson<T>(path: string, query?: URLSearchParams): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url =
    query && String(query)
      ? `${baseUrl}${path}?${query.toString()}`
      : `${baseUrl}${path}`;

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Backend request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

export async function fetchSources(): Promise<SourceSummary[]> {
  return fetchJson<SourceSummary[]>("/api/sources");
}

export async function fetchTopics(): Promise<TopicRef[]> {
  return fetchJson<TopicRef[]>("/api/topics");
}

export type SearchParams = {
  q?: string;
  source?: string;
  topic?: string;
  page?: number;
  pageSize?: number;
  sort?: "relevance" | "newest";
  includeNon2xx?: boolean;
};

export async function searchSnapshots(params: SearchParams): Promise<SearchResponse> {
  const query = new URLSearchParams();

  if (params.q) query.set("q", params.q);
  if (params.source) query.set("source", params.source);
  if (params.topic) query.set("topic", params.topic);
  if (params.sort) query.set("sort", params.sort);
  if (params.includeNon2xx) query.set("includeNon2xx", "true");
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
