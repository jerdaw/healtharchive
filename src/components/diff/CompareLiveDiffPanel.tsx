"use client";

import { diffWordsWithSpace } from "diff";
import { useEffect, useMemo, useState } from "react";

import type { CompareLiveRender, CompareLiveRenderInstruction } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

type DiffRow = {
  key: string;
  className: string;
  content: React.ReactNode;
};

const WORD_HIGHLIGHT_STORAGE_KEY = "haCompareLiveWordHighlight";
const HIGH_CONTRAST_STORAGE_KEY = "haCompareLiveHighContrast";

function getLine(lines: string[], index: number | null | undefined): string | null {
  if (index == null) return null;
  if (index < 0 || index >= lines.length) return null;
  return lines[index];
}

function buildWordSpans(
  instruction: CompareLiveRenderInstruction,
  lineA: string | null,
  lineB: string | null,
  mode: "removed" | "added",
): React.ReactNode {
  const baseA = lineA ?? "";
  const baseB = lineB ?? "";
  const diffParts = diffWordsWithSpace(baseA, baseB);

  return diffParts.map((part, index) => {
    if (mode === "removed" && part.added) return null;
    if (mode === "added" && part.removed) return null;

    let className = "ha-diff-word-common";
    if (mode === "removed" && part.removed) className = "ha-diff-word-removed";
    if (mode === "added" && part.added) className = "ha-diff-word-added";

    return (
      <span key={`${instruction.type}-${mode}-${index}`} className={className}>
        {part.value}
      </span>
    );
  });
}

function buildDiffRows(render: CompareLiveRender, highlightWords: boolean): DiffRow[] {
  const rows: DiffRow[] = [];

  render.renderInstructions.forEach((instruction, index) => {
    const lineA = getLine(render.archivedLines, instruction.lineIndexA);
    const lineB = getLine(render.liveLines, instruction.lineIndexB);

    if (instruction.type === "replace") {
      if (lineA != null) {
        rows.push({
          key: `replace-a-${index}`,
          className: "ha-diff-line ha-diff-line-removed",
          content: highlightWords ? buildWordSpans(instruction, lineA, lineB, "removed") : lineA,
        });
      }
      if (lineB != null) {
        rows.push({
          key: `replace-b-${index}`,
          className: "ha-diff-line ha-diff-line-added",
          content: highlightWords ? buildWordSpans(instruction, lineA, lineB, "added") : lineB,
        });
      }
      return;
    }

    if (instruction.type === "added" && lineB != null) {
      rows.push({
        key: `added-${index}`,
        className: "ha-diff-line ha-diff-line-added",
        content: lineB,
      });
      return;
    }

    if (instruction.type === "removed" && lineA != null) {
      rows.push({
        key: `removed-${index}`,
        className: "ha-diff-line ha-diff-line-removed",
        content: lineA,
      });
      return;
    }

    if (instruction.type === "unchanged" && lineB != null) {
      rows.push({
        key: `unchanged-${index}`,
        className: "ha-diff-line ha-diff-line-unchanged",
        content: lineB,
      });
    }
  });

  return rows;
}

export function CompareLiveDiffPanel({
  locale,
  render,
}: {
  locale: Locale;
  render: CompareLiveRender;
}) {
  const [highlightWords, setHighlightWords] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(WORD_HIGHLIGHT_STORAGE_KEY);
    return stored == null ? true : stored === "1";
  });
  const [highContrast, setHighContrast] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY);
    return stored == null ? false : stored === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(WORD_HIGHLIGHT_STORAGE_KEY, highlightWords ? "1" : "0");
  }, [highlightWords]);

  useEffect(() => {
    window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, highContrast ? "1" : "0");
  }, [highContrast]);

  const rows = useMemo(() => buildDiffRows(render, highlightWords), [render, highlightWords]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={highlightWords}
            onChange={(event) => setHighlightWords(event.target.checked)}
          />
          {locale === "fr"
            ? "Surlignage au niveau des mots (expérimental)"
            : "Word-level highlighting (experimental)"}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={highContrast}
            onChange={(event) => setHighContrast(event.target.checked)}
          />
          {locale === "fr" ? "Mode contraste élevé" : "High contrast mode"}
        </label>
      </div>

      <div className={`ha-diff ${highContrast ? "ha-diff-high-contrast" : ""}`}>
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.key} className={row.className}>
              {row.content}
            </div>
          ))
        ) : (
          <div className="ha-diff-line ha-diff-line-unchanged">
            {locale === "fr"
              ? "Aucun changement textuel détecté."
              : "No textual differences detected."}
          </div>
        )}
      </div>

      {render.renderTruncated && (
        <p className="text-ha-muted text-xs">
          {locale === "fr"
            ? `Aperçu tronqué pour la lisibilité (max ${render.renderLineLimit} lignes).`
            : `Output truncated for readability (max ${render.renderLineLimit} lines).`}
        </p>
      )}
    </div>
  );
}
