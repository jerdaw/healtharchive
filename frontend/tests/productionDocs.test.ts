import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("production docs alignment", () => {
  it("does not describe Vercel or Coolify as the active production frontend path", () => {
    const readme = readRepoFile("README.md");
    const envExample = readRepoFile(".env.example");
    const implementationGuide = readRepoFile("docs/implementation-guide.md");

    expect(readme).not.toContain("https://healtharchive.vercel.app (Vercel default domain)");
    expect(readme).not.toContain("Coolify-managed container behind host Caddy");
    expect(envExample).not.toContain("Vercel Preview example");
    expect(implementationGuide).not.toContain("Cloudflare remains the DNS provider.");
    expect(implementationGuide).not.toContain(
      "Public `healtharchive.ca` / `www.healtharchive.ca` cutover to VPS ingress is the active next step.",
    );
    expect(implementationGuide).toContain(
      "Host Caddy remains the public ingress owner on the VPS.",
    );
  });

  it("points shared VPS facts to platform-ops in active entry points", () => {
    const readme = readRepoFile("README.md");
    const agents = readRepoFile("AGENTS.md");
    const docsIndex = readRepoFile("docs/README.md");
    const implementationGuide = readRepoFile("docs/implementation-guide.md");
    const verificationGuide = readRepoFile("docs/deployment/verification.md");

    for (const content of [readme, agents, docsIndex]) {
      expect(content).toContain(
        "/home/jer/repos/platform-ops/PLAT-009-shared-vps-documentation-boundary.md",
      );
    }

    expect(implementationGuide).toContain(
      "Shared VPS facts that are not specific to the frontend alone are canonical in `/home/jer/repos/platform-ops`.",
    );
    expect(verificationGuide).toContain(
      "Shared host topology, ingress ownership, and other cross-project VPS facts are canonical in `/home/jer/repos/platform-ops`.",
    );
  });
});
