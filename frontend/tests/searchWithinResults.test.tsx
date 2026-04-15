import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchWithinResults } from "@/components/archive/SearchWithinResults";

describe("SearchWithinResults", () => {
  it("reveals the input and submit button after clicking", async () => {
    const { container } = render(
      <SearchWithinResults
        q="covid"
        within=""
        source=""
        fromDate=""
        toDate=""
        sort="relevance"
        view="pages"
        includeNon2xx={false}
        includeDuplicates={false}
        pageSize={10}
        defaultSort="relevance"
        defaultView="pages"
      />,
    );

    expect(screen.getByRole("button", { name: "Search within results →" })).toBeInTheDocument();
    expect(
      screen.queryByRole("searchbox", { name: "Search within results" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Search within results" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Search within results →" }));

    expect(
      await screen.findByRole("searchbox", { name: "Search within results" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search within results" })).toHaveAttribute(
      "name",
      "within",
    );
    expect(container.querySelector('input[type="hidden"][name="q"][value="covid"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search within results" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Search within results →" }),
    ).not.toBeInTheDocument();
  });

  it("keeps enabled filters in sync via hidden inputs", () => {
    const { container } = render(
      <SearchWithinResults
        q="influenza"
        within=""
        source="hc"
        fromDate=""
        toDate=""
        sort="newest"
        view="snapshots"
        includeNon2xx={true}
        includeDuplicates={true}
        pageSize={20}
        defaultSort="relevance"
        defaultView="pages"
      />,
    );

    expect(container.querySelector('input[type="hidden"][name="source"][value="hc"]')).toBeTruthy();
    expect(
      container.querySelector('input[type="hidden"][name="sort"][value="newest"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('input[type="hidden"][name="view"][value="snapshots"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('input[type="hidden"][name="includeNon2xx"][value="true"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('input[type="hidden"][name="includeDuplicates"][value="true"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('input[type="hidden"][name="pageSize"][value="20"]'),
    ).toBeTruthy();
  });
});
