import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CitePage from "@/app/[locale]/cite/page";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  fetchSnapshotDetail: vi.fn(),
  searchSnapshots: vi.fn(),
}));

import { fetchSnapshotDetail, type SnapshotDetail } from "@/lib/api";

const mockFetchSnapshotDetail = vi.mocked(fetchSnapshotDetail);

describe("/cite prefill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a prefilled citation for snapshot=...", async () => {
    const detail: SnapshotDetail = {
      id: 123,
      title: "COVID-19: Current situation - Canada.ca",
      sourceCode: "hc",
      sourceName: "Health Canada",
      language: "en",
      captureDate: "2025-04-17",
      captureTimestamp: "2025-04-17T00:00:00+00:00",
      jobId: 1,
      originalUrl: "https://www.canada.ca/en/health-canada.html",
      snippet: null,
      rawSnapshotUrl: null,
      browseUrl: null,
      mimeType: "text/html",
      statusCode: 200,
    };
    mockFetchSnapshotDetail.mockResolvedValue(detail);

    const ui = await CitePage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ snapshot: "123" }),
    });
    render(ui);

    expect(screen.getByRole("heading", { name: "Suggested citation" })).toBeInTheDocument();
    expect(
      screen.getByText(/Available from: https:\/\/healtharchive\.ca\/snapshot\/123\./),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Copy citation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open snapshot" })).toHaveAttribute(
      "href",
      "/snapshot/123",
    );
  });
});
