import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { LocaleProvider } from "@/components/i18n/LocaleProvider";
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

  it.each([
    {
      locale: "en",
      category: "Existing-corpus gap or missing snapshot",
      helper: "Reporting the gap does not commit the project to a new capture or broader coverage.",
      stale: ["Missing snapshot / request a capture", "not in the archive yet"],
    },
    {
      locale: "fr",
      category: "Lacune du corpus existant ou capture manquante",
      helper:
        "Signaler cette lacune n’engage pas le projet à effectuer une nouvelle capture ni à élargir la couverture.",
      stale: ["Capture manquante / demander une capture", "n’est pas encore dans l’archive"],
    },
  ] as const)(
    "treats a $locale missing-snapshot report as an existing-corpus gap",
    ({ locale, category, helper, stale }) => {
      const { container } = render(
        <LocaleProvider locale={locale}>
          <ReportIssueForm />
        </LocaleProvider>,
      );

      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "missing_snapshot" },
      });

      expect(screen.getByRole("option", { name: category })).toBeInTheDocument();
      expect(container).toHaveTextContent(helper);
      for (const claim of stale) {
        expect(container).not.toHaveTextContent(claim);
      }
    },
  );
});
