import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchWithinResults } from "@/components/archive/SearchWithinResults";

describe("SearchWithinResults", () => {
  it("reveals the input and submit button after clicking", async () => {
    render(
      <SearchWithinResults
        q="covid"
        source=""
        fromDate=""
        toDate=""
        sort="relevance"
        view="pages"
        includeNon2xx={false}
        pageSize={10}
        defaultSort="relevance"
        defaultView="pages"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Search within results →" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("searchbox", { name: "Search within results" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Search within results" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Search within results →" }),
    );

    expect(
      await screen.findByRole("searchbox", { name: "Search within results" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Search within results" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Search within results →" }),
    ).not.toBeInTheDocument();
  });
});

