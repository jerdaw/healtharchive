import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

const FENCE_RE = /^\s*(```+|~~~+)/;
const INLINE_LINK_RE = /!?\[[^\]]*\]\(([^)]+)\)/g;
const REF_DEF_RE = /^\s*\[[^\]]+\]:\s*(\S+)(?:\s+.*)?$/;
const INLINE_CODE_RE = /`([^`\n]+)`/g;
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function listMarkdownFiles() {
  try {
    const stdout = execFileSync("git", ["ls-files", "*.md", "*.mdx"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((rel) => path.join(REPO_ROOT, rel));
  } catch {
    const results = [];
    const queue = [REPO_ROOT];
    while (queue.length > 0) {
      const dir = queue.pop();
      if (!dir) break;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === ".git" || entry.name === ".venv" || entry.name === "node_modules")
          continue;
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) queue.push(p);
        else if (entry.isFile() && (p.endsWith(".md") || p.endsWith(".mdx"))) results.push(p);
      }
    }
    return results.sort();
  }
}

function* iterNonFencedLines(text) {
  let inFence = false;
  let fenceChar = "";
  let fenceLen = 0;

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    const line = lines[i];
    const match = FENCE_RE.exec(line);
    if (!inFence) {
      if (match) {
        const marker = match[1];
        inFence = true;
        fenceChar = marker[0];
        fenceLen = marker.length;
        continue;
      }
      yield [lineNumber, line];
      continue;
    }

    if (match && match[1][0] === fenceChar && match[1].length >= fenceLen) {
      inFence = false;
      fenceChar = "";
      fenceLen = 0;
    }
  }
}

function normalizeLinkTarget(raw) {
  let value = raw.trim();
  if (!value) return null;

  if (value.startsWith("<") && value.includes(">")) {
    value = value.slice(1, value.indexOf(">")).trim();
  }

  value = value.split(/\s+/)[0]?.trim() ?? "";
  value = value.replace(/^["']|["']$/g, "");

  if (!value) return null;
  value = value.split("#")[0];
  value = value.split("?")[0];
  return value.trim();
}

function normalizeCodeToken(raw) {
  let value = raw.trim();
  if (!value) return null;
  if (value.includes(" ") || value.includes("\t")) return null;

  // Keep leading `./` or `../` intact; only trim common wrapping punctuation.
  value = value.replace(/^[([{"]+/, "");
  value = value.replace(/[),.;:\]}'"]+$/, "");
  if (!value) return null;

  value = value.split("#")[0];
  value = value.split("?")[0];
  value = value.split(":")[0]; // tolerate `path/to/file.md:123`
  return value.trim();
}

function isExternalOrAnchor(target) {
  return (
    target.startsWith("#") ||
    target.startsWith("/") ||
    target.startsWith("//") ||
    SCHEME_RE.test(target)
  );
}

function isWorkspaceReference(target) {
  return target.startsWith("healtharchive-") && target.includes("/");
}

function looksLikePlaceholder(target) {
  return (
    target.includes("YYYY") ||
    target.includes("<") ||
    target.includes(">") ||
    target.includes("*") ||
    target.includes("...")
  );
}

function docRootPrefixes() {
  const docsRoot = path.join(REPO_ROOT, "docs");
  if (!fs.existsSync(docsRoot)) return new Set();
  return new Set(["deployment", "development", "operations", "roadmaps", "decisions"]);
}

function shouldCheckCodeToken(token, filePath) {
  if (isExternalOrAnchor(token) || isWorkspaceReference(token) || looksLikePlaceholder(token))
    return false;
  if (/^\.[a-z0-9]+$/i.test(token)) return false;

  if (token.startsWith("./") || token.startsWith("../")) return true;

  if (token.endsWith(".md") || token.endsWith(".mdx")) return true;

  const repoPrefixes = ["docs/", "scripts/", "src/", "tests/", "public/", ".github/"];
  if (repoPrefixes.some((p) => token.startsWith(p))) return true;

  const docsRoot = path.join(REPO_ROOT, "docs");
  if (fs.existsSync(docsRoot)) {
    const rel = path.relative(docsRoot, filePath);
    if (!rel.startsWith("..")) {
      const first = token.split("/")[0];
      if (docRootPrefixes().has(first)) return false;
    }
  }

  return false;
}

function resolveTargetPath({ filePath, token, kind }) {
  if (kind === "link") return path.resolve(path.dirname(filePath), token);

  if (
    token.startsWith("docs/") ||
    token.startsWith("scripts/") ||
    token.startsWith("src/") ||
    token.startsWith("tests/") ||
    token.startsWith("public/") ||
    token.startsWith(".github/")
  ) {
    return path.resolve(REPO_ROOT, token);
  }

  const docsRoot = path.join(REPO_ROOT, "docs");
  if (fs.existsSync(docsRoot)) {
    const relToDocs = path.relative(docsRoot, filePath);
    if (!relToDocs.startsWith("..")) {
      const first = token.split("/")[0];
      if (docRootPrefixes().has(first)) return path.resolve(docsRoot, token);
    }
  }

  return path.resolve(path.dirname(filePath), token);
}

function isWithinRepo(p) {
  const rel = path.relative(REPO_ROOT, p);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function* iterLinkTargets(line) {
  let match;
  while ((match = INLINE_LINK_RE.exec(line)) !== null) {
    const t = normalizeLinkTarget(match[1] ?? "");
    if (t) yield t;
  }

  const refMatch = REF_DEF_RE.exec(line);
  if (refMatch) {
    const t = normalizeLinkTarget(refMatch[1] ?? "");
    if (t) yield t;
  }
}

function* iterCodeTokens(line) {
  let match;
  while ((match = INLINE_CODE_RE.exec(line)) !== null) {
    const t = normalizeCodeToken(match[1] ?? "");
    if (t) yield t;
  }
}

function checkDocReferences() {
  const findings = [];
  for (const filePath of listMarkdownFiles()) {
    if (!fs.existsSync(filePath)) continue;
    const relFile = path.relative(REPO_ROOT, filePath);
    const text = fs.readFileSync(filePath, "utf8");

    for (const [lineNumber, line] of iterNonFencedLines(text)) {
      for (const target of iterLinkTargets(line)) {
        if (isExternalOrAnchor(target) || isWorkspaceReference(target)) continue;
        const resolved = resolveTargetPath({ filePath, token: target, kind: "link" });
        if (!isWithinRepo(resolved)) continue;
        if (fs.existsSync(resolved)) continue;
        findings.push({
          file: relFile,
          line: lineNumber,
          kind: "link",
          raw: target,
          resolved: path.relative(REPO_ROOT, resolved),
        });
      }

      for (const token of iterCodeTokens(line)) {
        if (!shouldCheckCodeToken(token, filePath)) continue;
        const resolved = resolveTargetPath({ filePath, token, kind: "code" });
        if (!isWithinRepo(resolved)) continue;
        if (fs.existsSync(resolved)) continue;
        if (!token.includes("/")) {
          const repoRootCandidate = path.resolve(REPO_ROOT, token);
          if (fs.existsSync(repoRootCandidate)) continue;
        }
        findings.push({
          file: relFile,
          line: lineNumber,
          kind: "code",
          raw: token,
          resolved: path.relative(REPO_ROOT, resolved),
        });
      }
    }
  }

  return findings;
}

function main() {
  const findings = checkDocReferences();
  if (findings.length > 0) {
    for (const f of findings) {
      process.stdout.write(
        `${f.file}:${f.line}: ${f.kind} reference to '${f.raw}' -> '${f.resolved}' (missing path)\n`,
      );
    }
    process.exitCode = 1;
    return;
  }
}

main();
