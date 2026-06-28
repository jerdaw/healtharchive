import nextConfig from "../next.config";

describe("frontend security headers", () => {
  it("sets enforcing CSP and includes the current API/replay allowlist", async () => {
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

    expect(headers.filter((header) => header.key === "Content-Security-Policy")).toHaveLength(1);
    expect(byKey.has("Content-Security-Policy-Report-Only")).toBe(false);

    const csp = byKey.get("Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self';");
    expect(csp).toContain("script-src 'self' 'unsafe-inline';");
    expect(csp).toContain("connect-src 'self' https://api.healtharchive.ca;");
    expect(csp).toContain(
      "frame-src 'self' https://api.healtharchive.ca https://replay.healtharchive.ca;",
    );
    expect(csp).toContain("frame-ancestors 'self';");
    expect(csp).toContain("base-uri 'self';");
    expect(csp).toContain("form-action 'self';");

    expect(csp).not.toContain("*");
    expect(csp).not.toContain("/api/admin");
    expect(csp).not.toContain("/metrics");
  });
});
