import nextConfig from "../next.config";

describe("frontend security headers", () => {
  it("keeps CSP in report-only mode and includes the current API/replay allowlist", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");

    const rules = await nextConfig.headers?.();
    expect(rules).toBeDefined();

    const rootRule = rules?.find((rule) => rule.source === "/(.*)");
    expect(rootRule).toBeDefined();

    const headers = rootRule?.headers ?? [];
    const byKey = new Map(headers.map((header) => [header.key, header.value]));

    expect(byKey.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(byKey.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byKey.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(byKey.get("Permissions-Policy")).toBe("geolocation=(), microphone=(), camera=()");

    const csp = byKey.get("Content-Security-Policy-Report-Only");
    expect(csp).toBeDefined();
    expect(csp).toContain("connect-src 'self' https://api.healtharchive.ca;");
    expect(csp).toContain(
      "frame-src 'self' https://api.healtharchive.ca https://replay.healtharchive.ca;",
    );

    expect(byKey.has("Content-Security-Policy")).toBe(false);
  });
});
