import { render, screen } from "@testing-library/react";
import { SnapshotFrame } from "@/components/SnapshotFrame";

describe("SnapshotFrame", () => {
  it("renders an iframe with a sandbox attribute", () => {
    render(
      <SnapshotFrame
        src="/api/snapshots/raw/123"
        title="Snapshot Title"
        browseLink="https://replay.healtharchive.ca/job-1/https://example.com"
        rawLink="/api/snapshots/raw/123"
        apiLink="/api/snapshot/123"
      />,
    );

    const iframe = screen.getByTitle("Snapshot Title");
    expect(iframe.tagName.toLowerCase()).toBe("iframe");
    expect(iframe).toHaveAttribute("sandbox", "allow-same-origin allow-scripts allow-forms");
  });
});
