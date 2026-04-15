import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function collectPageFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  return entries.flatMap((entry) => {
    if (entry.startsWith(".")) return [];
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return collectPageFiles(fullPath);
    }
    if (stats.isFile() && entry === "page.tsx") {
      return [fullPath];
    }
    return [];
  });
}

describe("metadata coverage", () => {
  it("exports generateMetadata for every locale page", () => {
    const root = join(process.cwd(), "src", "app", "[locale]");
    const pages = collectPageFiles(root);
    const missing = pages.filter((file) => {
      const contents = readFileSync(file, "utf8");
      return !/export\s+async\s+function\s+generateMetadata/.test(contents);
    });

    expect(pages.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});
