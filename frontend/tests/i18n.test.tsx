import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { LocalizedLink } from "@/components/i18n/LocalizedLink";
import { localizeHref } from "@/lib/i18n";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href:
      | string
      | {
          pathname?: string;
          query?: Record<string, string | number | boolean>;
          hash?: string;
        };
  }) => {
    if (typeof href === "string") {
      return <a href={href}>{children}</a>;
    }

    const query = href.query
      ? `?${new URLSearchParams(
          Object.entries(href.query).map(([key, value]) => [key, String(value)]),
        ).toString()}`
      : "";
    const hash = href.hash ? (href.hash.startsWith("#") ? href.hash : `#${href.hash}`) : "";

    return <a href={`${href.pathname ?? ""}${query}${hash}`}>{children}</a>;
  },
}));

describe("locale-aware links", () => {
  it("preserves English paths, query strings, and hashes", () => {
    expect(localizeHref("en", "/archive?q=covid#results")).toBe("/archive?q=covid#results");
  });

  it("prefixes French paths while preserving query strings and hashes", () => {
    expect(localizeHref("fr", "/archive?q=covid#results")).toBe("/fr/archive?q=covid#results");
  });

  it("does not double-prefix already-localized French paths", () => {
    expect(localizeHref("fr", "/fr/archive?q=covid#results")).toBe("/fr/archive?q=covid#results");
  });

  it("leaves API paths and static assets unlocalized", () => {
    expect(localizeHref("fr", "/api/search?q=covid")).toBe("/api/search?q=covid");
    expect(localizeHref("fr", "/favicon.ico")).toBe("/favicon.ico");
  });

  it("localizes LocalizedLink object href pathnames without losing query or hash", () => {
    render(
      <LocaleProvider locale="fr">
        <LocalizedLink
          href={{
            pathname: "/archive",
            query: { q: "covid", page: 2 },
            hash: "results",
          }}
        >
          Archive
        </LocalizedLink>
      </LocaleProvider>,
    );

    expect(screen.getByRole("link", { name: "Archive" })).toHaveAttribute(
      "href",
      "/fr/archive?q=covid&page=2#results",
    );
  });
});
