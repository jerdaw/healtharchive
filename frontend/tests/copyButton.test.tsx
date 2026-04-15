import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CopyButton } from "@/components/archive/CopyButton";

function setClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
}

describe("CopyButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows a 'Copied' toast on successful Clipboard API write", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    render(
      <CopyButton text="https://example.com" label="Copy URL" className="ha-icon-btn">
        Copy
      </CopyButton>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("https://example.com");
    expect(screen.getByText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  it("falls back to execCommand when Clipboard API is unavailable", async () => {
    setClipboard(vi.fn().mockRejectedValue(new Error("no permission")));

    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      value: execCommand,
      configurable: true,
    });

    render(
      <CopyButton text="https://example.com" label="Copy URL" className="ha-icon-btn">
        Copy
      </CopyButton>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
      await Promise.resolve();
    });

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByText("Copied")).toBeInTheDocument();
  });

  it("shows a failure toast when copying fails", async () => {
    setClipboard(vi.fn().mockRejectedValue(new Error("no permission")));

    const execCommand = vi.fn().mockReturnValue(false);
    Object.defineProperty(document, "execCommand", {
      value: execCommand,
      configurable: true,
    });

    render(
      <CopyButton text="https://example.com" label="Copy URL" className="ha-icon-btn">
        Copy
      </CopyButton>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
      await Promise.resolve();
    });

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByText("Copy failed")).toBeInTheDocument();
  });
});
