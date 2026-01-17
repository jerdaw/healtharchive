import { render, screen, act } from "@testing-library/react";
import { vi } from "vitest";
import { AnimatedMetric } from "@/components/home/AnimatedMetric";

describe("AnimatedMetric", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock requestAnimationFrame
    vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => {
      // Simulate frames immediate execution for testing purposes or better yet, control time
      // But simpler to just let it call the callback with a mocked time
      return setTimeout(() => callback(performance.now()), 16);
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders with 0 value initially and fills up", async () => {
    render(<AnimatedMetric label="Test Metric" value={100} barPercent={50} durationMs={100} />);

    // Initial state: 0 value, 0% width
    // Note: The text content might be "0" locally formatted.
    expect(screen.getByText("Test Metric")).toBeInTheDocument();

    // Check for the bar
    // We can find it by class name if we add a data-testid or just query selector
    // But testing-library prefers accessible queries. The bar is aria-hidden.
    const barFill = document.querySelector(".ha-metric-bar-fill") as HTMLElement;
    expect(barFill).toBeInTheDocument();
    expect(barFill.style.width).toBe("0%");

    // Advance time to complete animation (durationMs = 100)
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Check final state
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(barFill.style.width).toBe("50%");
  });

  it("respects startEvent", async () => {
    render(
      <AnimatedMetric
        label="Event Metric"
        value={200}
        barPercent={80}
        start={false}
        startEvent="my-start-event"
        durationMs={100}
      />,
    );

    const barFill = document.querySelector(".ha-metric-bar-fill") as HTMLElement;
    expect(barFill.style.width).toBe("0%");
    expect(screen.getByText("0")).toBeInTheDocument();

    // Advance time, should still be 0
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(barFill.style.width).toBe("0%");

    // Trigger event
    act(() => {
      window.dispatchEvent(new CustomEvent("my-start-event"));
    });

    // Advance time again
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText("200")).toBeInTheDocument();
    expect(barFill.style.width).toBe("80%");
  });
});
