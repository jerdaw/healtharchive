import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/lib/api", () => ({
  fetchHealth: vi.fn(),
  resolveReplayUrl: vi.fn(),
  getApiBaseUrl: vi.fn(() => "http://example.test"),
}));

let mockFetchHealth: ReturnType<typeof vi.fn>;

describe("ApiHealthBanner diagnostics", () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SHOW_API_HEALTH_BANNER;
    delete process.env.NEXT_PUBLIC_LOG_API_HEALTH_FAILURE;
    delete process.env.NEXT_PUBLIC_SHOW_API_BASE_HINT;

    const api = await import("@/lib/api");
    mockFetchHealth = vi.mocked(api.fetchHealth);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("does not call fetchHealth when diagnostics flags are disabled", async () => {
    process.env.NEXT_PUBLIC_SHOW_API_HEALTH_BANNER = "false";
    process.env.NEXT_PUBLIC_LOG_API_HEALTH_FAILURE = "false";

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { ApiHealthBanner } = await import("@/components/ApiHealthBanner");
    render(<ApiHealthBanner />);

    expect(mockFetchHealth).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("shows a banner when health check fails and banner is enabled", async () => {
    process.env.NEXT_PUBLIC_SHOW_API_HEALTH_BANNER = "true";
    process.env.NEXT_PUBLIC_LOG_API_HEALTH_FAILURE = "false";

    mockFetchHealth.mockRejectedValue(new Error("health failed"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { ApiHealthBanner } = await import("@/components/ApiHealthBanner");
    render(<ApiHealthBanner />);

    expect(mockFetchHealth).toHaveBeenCalled();

    // Banner should appear when health check fails.
    expect(
      await screen.findByText(/Backend unreachable/i),
    ).toBeInTheDocument();

    // No warning log when LOG_HEALTH_FAILURE is false.
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("logs a warning when health check fails and logging is enabled", async () => {
    process.env.NEXT_PUBLIC_SHOW_API_HEALTH_BANNER = "false";
    process.env.NEXT_PUBLIC_LOG_API_HEALTH_FAILURE = "true";

    mockFetchHealth.mockRejectedValue(new Error("health failed"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { ApiHealthBanner } = await import("@/components/ApiHealthBanner");
    render(<ApiHealthBanner />);

    await waitFor(() => {
      expect(mockFetchHealth).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
    });
    expect(warnSpy.mock.calls[0][0]).toMatch(/API health check failed/i);

    warnSpy.mockRestore();
  });
});
