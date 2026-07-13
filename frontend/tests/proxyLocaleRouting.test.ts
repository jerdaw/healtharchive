import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { LOCALE_REWRITE_HEADER, proxy } from "@/proxy";

describe("locale proxy routing", () => {
  it("marks an unprefixed default-locale rewrite", () => {
    const response = proxy(new NextRequest("http://localhost/about"));

    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost/en/about");
    expect(response.headers.get(`x-middleware-request-${LOCALE_REWRITE_HEADER}`)).toBe("1");
  });

  it("does not redirect the internal second pass back to the same route", () => {
    const response = proxy(
      new NextRequest("http://localhost/en/about", {
        headers: { [LOCALE_REWRITE_HEADER]: "1" },
      }),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("still redirects a user-visible /en URL to its canonical path", () => {
    const response = proxy(new NextRequest("http://localhost/en/about"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/about");
  });

  it("passes French routes through unchanged", () => {
    const response = proxy(new NextRequest("http://localhost/fr/about"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
