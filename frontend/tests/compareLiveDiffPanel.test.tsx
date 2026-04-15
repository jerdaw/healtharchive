import { fireEvent, render, screen } from "@testing-library/react";

import { CompareLiveDiffPanel } from "@/components/diff/CompareLiveDiffPanel";
import type { CompareLiveRender } from "@/lib/api";

const WORD_HIGHLIGHT_STORAGE_KEY = "haCompareLiveWordHighlight";
const HIGH_CONTRAST_STORAGE_KEY = "haCompareLiveHighContrast";

function buildRenderPayload(): CompareLiveRender {
  return {
    archivedLines: ["Hello world"],
    liveLines: ["Hello brave world"],
    renderInstructions: [{ type: "replace", lineIndexA: 0, lineIndexB: 0 }],
    renderTruncated: false,
    renderLineLimit: 5000,
  };
}

describe("CompareLiveDiffPanel", () => {
  beforeEach(() => {
    window.localStorage.removeItem(WORD_HIGHLIGHT_STORAGE_KEY);
    window.localStorage.removeItem(HIGH_CONTRAST_STORAGE_KEY);
  });

  it("enables word-level highlighting by default", () => {
    const { container } = render(
      <CompareLiveDiffPanel locale="en" render={buildRenderPayload()} />,
    );

    expect(screen.getByLabelText(/Word-level highlighting/i)).toBeChecked();
    expect(container.querySelectorAll(".ha-diff-word-added").length).toBeGreaterThan(0);
  });

  it("can disable word-level highlighting", () => {
    const { container } = render(
      <CompareLiveDiffPanel locale="en" render={buildRenderPayload()} />,
    );

    fireEvent.click(screen.getByLabelText(/Word-level highlighting/i));
    expect(screen.getByLabelText(/Word-level highlighting/i)).not.toBeChecked();
    expect(container.querySelectorAll(".ha-diff-word-added").length).toBe(0);
  });

  it("applies high contrast only to the diff panel", () => {
    const { container } = render(
      <CompareLiveDiffPanel locale="en" render={buildRenderPayload()} />,
    );

    fireEvent.click(screen.getByLabelText(/High contrast mode/i));

    const diffPanel = container.querySelector(".ha-diff");
    expect(diffPanel).toHaveClass("ha-diff-high-contrast");
    expect(container.querySelectorAll(".ha-diff-high-contrast").length).toBe(1);
  });
});
