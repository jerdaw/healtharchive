import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchChangeCompare,
  fetchSnapshotDetail,
  fetchSnapshotLatest,
  fetchSnapshotTimeline,
  fetchSources,
} from "@/lib/api";

type FetchInitWithNext = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

function stubJsonFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: FetchInitWithNext) => {
    void input;
    void init;
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function fetchInit(fetchMock: ReturnType<typeof stubJsonFetch>, index: number): FetchInitWithNext {
  return fetchMock.mock.calls[index]?.[1] as unknown as FetchInitWithNext;
}

describe("API fetch cache policy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not persistently cache high-cardinality snapshot-specific requests", async () => {
    const fetchMock = stubJsonFetch();

    await fetchSnapshotDetail(42);
    await fetchChangeCompare({ fromSnapshotId: 41, toSnapshotId: 42 });
    await fetchSnapshotTimeline(42);
    await fetchSnapshotLatest(42);

    for (let index = 0; index < fetchMock.mock.calls.length; index += 1) {
      const init = fetchInit(fetchMock, index);
      expect(init.cache).toBe("no-store");
      expect(init.next).toBeUndefined();
    }
  });

  it("still caches low-cardinality source summaries briefly", async () => {
    const fetchMock = stubJsonFetch();

    await fetchSources();

    const init = fetchInit(fetchMock, 0);
    expect(init.cache).toBe("force-cache");
    expect(init.next?.revalidate).toBe(300);
  });
});
