import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CONTENT_ROUTES = ["about", "methods", "researchers", "brief", "exports", "digest", "cite"];

function readFrontendFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("content-page design contract", () => {
  it("keeps homepage-only panels out of the seven inner content routes", () => {
    const violations = CONTENT_ROUTES.filter((route) =>
      readFrontendFile(`src/app/[locale]/${route}/page.tsx`).includes("ha-home-panel"),
    );

    expect(violations).toEqual([]);
  });

  it("defines and uses the quiet inset-card surface", () => {
    const styles = readFrontendFile("src/app/globals.css");
    const routeSource = CONTENT_ROUTES.map((route) =>
      readFrontendFile(`src/app/[locale]/${route}/page.tsx`),
    ).join("\n");

    expect(styles).toContain(".ha-card-inset {");
    expect(routeSource).toContain("ha-card-inset");
  });

  it("uses the standard content-section spacing token", () => {
    const violations = CONTENT_ROUTES.filter((route) => {
      const source = readFrontendFile(`src/app/[locale]/${route}/page.tsx`);
      return /ha-content-section(?:-lead)? space-y-4/.test(source);
    });

    expect(violations).toEqual([]);
  });
});
