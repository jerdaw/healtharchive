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
      "Public `healtharchive.ca` / `www.healtharchive.ca` cutover to host ingress is the active next step.",
    );
    expect(implementationGuide).toContain(
      "Host ingress remains the public ingress owner.",
    );
  });

  it("keeps shared host facts behind the private ops documentation boundary", () => {
    const readme = readRepoFile("README.md");
    const agents = readRepoFile("AGENTS.md");
    const docsIndex = readRepoFile("docs/README.md");
    const implementationGuide = readRepoFile("docs/implementation-guide.md");
    const verificationGuide = readRepoFile("docs/deployment/verification.md");

    for (const content of [readme, agents, docsIndex]) {
      expect(content).toContain("private shared-ops");
      const privateOpsPath = ["/home", "jer", "repos", "vps", "platform-ops"].join("/");
      expect(content).not.toContain(privateOpsPath);
    }

    expect(implementationGuide).toContain(
      "Shared host facts that are not specific to the frontend alone are canonical in `private shared-ops workspace`.",
    );
    expect(verificationGuide).toContain(
      "Shared host topology, ingress ownership, and other cross-project host facts are canonical in `private shared-ops workspace`.",
    );
  });
});
