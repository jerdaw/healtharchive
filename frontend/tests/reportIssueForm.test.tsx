import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { ReportIssueForm } from "@/components/report/ReportIssueForm";

describe("ReportIssueForm", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("submits a report and shows a confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reportId: 42 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ReportIssueForm />);

    fireEvent.change(screen.getByLabelText(/issue category/i), {
      target: { value: "broken_snapshot" },
    });
    fireEvent.change(screen.getByLabelText(/what is the issue/i), {
      target: { value: "The snapshot iframe fails to load consistently." },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText(/report received/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/report",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
