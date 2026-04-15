import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const TARGETS = ["src", "docs", "public", "README.md", "AGENTS.md"] as const;
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const FORBIDDEN = new RegExp(
  [
    [114, 101, 115, 116, 111, 114, 101, 100, 99, 100, 99],
    [114, 99, 100, 99],
  ]
    .map((codes) => String.fromCharCode(...codes))
    .join("|"),
  "i",
);

function collectFiles(entryPath: string): string[] {
  const stats = statSync(entryPath);
  if (stats.isFile()) {
    return [entryPath];
  }

  if (!stats.isDirectory()) {
    return [];
  }

  return readdirSync(entryPath).flatMap((entry) => {
    if (entry.startsWith(".")) return [];
    return collectFiles(join(entryPath, entry));
  });
}

describe("content policy", () => {
  it("does not reference forbidden sources in repo content", () => {
    const repoRoot = process.cwd();
    const files = TARGETS.flatMap((target) => collectFiles(join(repoRoot, target)));
    const violations = files.filter((file) => {
      const extensionMatch = file.match(/\.[^.]+$/);
      if (extensionMatch && !TEXT_EXTENSIONS.has(extensionMatch[0])) {
        return false;
      }
      const content = readFileSync(file, "utf8");
      return FORBIDDEN.test(content);
    });

    expect(violations).toEqual([]);
  });
});
