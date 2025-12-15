import { render, screen } from "@testing-library/react";
import { act } from "react";
import { vi } from "vitest";

import { ProjectSnapshotOrchestrator } from "@/components/home/ProjectSnapshotOrchestrator";
import { TrackChangesPhrase } from "@/components/TrackChangesPhrase";

describe("Homepage hero animation orchestration", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("dispatches ha-project-snapshot-finished after all expected metric events", () => {
        const handler = vi.fn();
        window.addEventListener("ha-project-snapshot-finished", handler);

        render(
            <ProjectSnapshotOrchestrator
                expectedIds={["records", "pages"]}
            />,
        );

        act(() => {
            window.dispatchEvent(
                new CustomEvent("ha-metric-finished", {
                    detail: { id: "records" },
                }),
            );
        });

        expect(handler).not.toHaveBeenCalled();

        act(() => {
            window.dispatchEvent(
                new CustomEvent("ha-metric-finished", {
                    detail: { id: "pages" },
                }),
            );
        });

        expect(handler).toHaveBeenCalledTimes(1);
        window.removeEventListener("ha-project-snapshot-finished", handler);
    });

    it("removes the crossed-out before after project snapshot finishes", () => {
        render(
            <span>
                <TrackChangesPhrase /> they change.
            </span>,
        );

        act(() => {
            vi.advanceTimersByTime(4000);
        });

        expect(screen.getByText("before")).toBeInTheDocument();
        expect(screen.getByText("after")).toBeInTheDocument();

        act(() => {
            window.dispatchEvent(new CustomEvent("ha-project-snapshot-finished"));
            vi.advanceTimersByTime(800);
        });

        const fadingBefore = document.querySelector(".ha-before-word--fading");
        expect(fadingBefore).not.toBeNull();

        act(() => {
            vi.advanceTimersByTime(5600);
        });

        expect(screen.queryByText("before")).not.toBeInTheDocument();
        expect(screen.getByText("after")).toBeInTheDocument();
        expect(screen.getByText(/they change\./i)).toBeInTheDocument();
    });
});
