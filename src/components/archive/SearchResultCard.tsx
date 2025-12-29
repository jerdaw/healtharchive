import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import type { ReactElement, ReactNode } from "react";

import { CopyButton } from "@/components/archive/CopyButton";
import { buildReplayUrl, isoToTimestamp14 } from "@/components/replay/replayUtils";
import { localeToLanguageTag, type Locale } from "@/lib/i18n";

type SearchView = "pages" | "snapshots";

export type SearchResultCardRecord = {
  id: string;
  title: string;
  sourceCode: string;
  sourceName: string;
  language?: string;
  captureDate?: string | null;
  captureTimestamp?: string | null;
  jobId?: number | null;
  originalUrl: string;
  snippet?: string | null;
  pageSnapshotsCount?: number | null;
  browseUrl?: string | null;
};

function formatDate(locale: Locale, iso: string | undefined | null): string {
  if (!iso) return locale === "fr" ? "Inconnu" : "Unknown";

  const parts = iso.split("-");
  if (parts.length === 3) {
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (year && month && day) {
      const d = new Date(year, month - 1, day);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(localeToLanguageTag(locale), {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
  }

  const parsed = new Date(iso);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(localeToLanguageTag(locale), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return iso;
}

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function cleanSnippet(raw: string): string {
  let text = normalizeSpaces(raw);

  const boilerplate = [
    /skip to main content/gi,
    /skip to "about government"/gi,
    /skip to "about this site"/gi,
    /language selection/gi,
    /gouvernement du canada/gi,
    /menu main menu/gi,
    /search and menus/gi,
  ];
  for (const re of boilerplate) text = text.replace(re, "");

  return normalizeSpaces(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenizeQuery(q: string): string[] {
  const tokens = (q.match(/[a-z0-9]+/gi) ?? [])
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 3);
  return Array.from(new Set(tokens));
}

function highlightText(text: string, tokens: string[]): Array<string | ReactElement> {
  const trimmed = text.trim();
  if (!trimmed || tokens.length === 0) return [trimmed];

  const orderedTokens = tokens.slice().sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${orderedTokens.map(escapeRegExp).join("|")})`, "gi");
  const parts = trimmed.split(re);

  const nodes: Array<string | ReactElement> = [];
  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx];
    if (!part) continue;
    if (idx % 2 === 1) {
      nodes.push(
        <mark key={idx} className="ha-mark">
          {part}
        </mark>,
      );
    } else {
      nodes.push(part);
    }
  }
  return nodes;
}

function formatUrlParts(urlStr: string): { host: string; rest: string } {
  try {
    const u = new URL(urlStr);
    const rest = `${u.pathname}${u.search}${u.hash}`;
    return { host: u.host, rest: rest === "/" ? "" : rest };
  } catch {
    return { host: urlStr, rest: "" };
  }
}

function ResultIcon({ children }: { children: ReactNode }): ReactElement {
  return (
    <span className="ha-result-icon" aria-hidden="true">
      {children}
    </span>
  );
}

function CalendarIcon(): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3V3a1 1 0 0 1 1-1Zm9 6H5v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8Z" />
    </svg>
  );
}

function GlobeIcon(): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm5.87-9H14.2a13.6 13.6 0 0 0-.93-4.18A6.01 6.01 0 0 1 15.87 9ZM12.1 9H7.9c.12-1.5.5-2.9 1.06-4.06.37-.75.75-1.14 1.04-1.14.29 0 .67.39 1.04 1.14.56 1.16.94 2.56 1.06 4.06ZM4.13 9a6.01 6.01 0 0 1 2.6-4.18A13.6 13.6 0 0 0 5.8 9H4.13Zm0 2H5.8c.15 1.44.5 2.82.93 4.02A6.01 6.01 0 0 1 4.13 11Zm3.77 0h4.2c-.12 1.44-.5 2.82-1.06 4.02-.37.8-.75 1.2-1.04 1.2-.29 0-.67-.4-1.04-1.2-.56-1.2-.94-2.58-1.06-4.02ZM13.27 15.02c.42-1.2.78-2.58.93-4.02h1.67a6.01 6.01 0 0 1-2.6 4.02Z" />
    </svg>
  );
}

function CopyIcon(): ReactElement {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 2a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H6Zm9 4h-1V4H6v9h1V8a2 2 0 0 1 2-2h6Zm-6 3h7v9H9V9Z" />
    </svg>
  );
}

function getReplayBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_REPLAY_BASE_URL ?? "https://replay.healtharchive.ca").replace(
    /\/+$/,
    "",
  );
}

function appendReplayHashParam(urlStr: string, key: string, value: string): string {
  try {
    const url = new URL(urlStr);
    const params = new URLSearchParams(url.hash.replace(/^#/, ""));
    params.set(key, value);
    url.hash = params.toString();
    return url.toString();
  } catch {
    const encoded = encodeURIComponent(value);
    if (!urlStr.includes("#")) return `${urlStr}#${encodeURIComponent(key)}=${encoded}`;
    const hasTrailing = urlStr.endsWith("#") || urlStr.endsWith("&");
    const sep = hasTrailing ? "" : "&";
    return `${urlStr}${sep}${encodeURIComponent(key)}=${encoded}`;
  }
}

function buildViewUrl(record: SearchResultCardRecord, returnPath: string | null): string | null {
  const direct = record.browseUrl?.trim();
  if (direct) {
    return returnPath ? appendReplayHashParam(direct, "ha_return", returnPath) : direct;
  }
  if (!record.jobId || !record.captureTimestamp) return null;

  const ts14 = isoToTimestamp14(record.captureTimestamp);
  const replayUrl = buildReplayUrl(getReplayBaseUrl(), record.jobId, ts14, record.originalUrl);
  // Help the replay banner resolve the HealthArchive snapshot id.
  const urlWithSnapshot = `${replayUrl}#ha_snapshot=${encodeURIComponent(record.id)}`;
  return returnPath
    ? appendReplayHashParam(urlWithSnapshot, "ha_return", returnPath)
    : urlWithSnapshot;
}

export function SearchResultCard({
  record,
  view,
  query,
  locale,
  returnPath,
}: {
  record: SearchResultCardRecord;
  view: SearchView;
  query: string;
  locale: Locale;
  returnPath?: string | null;
}) {
  const label =
    locale === "fr"
      ? view === "pages"
        ? "Dernière capture"
        : "Capturée"
      : view === "pages"
        ? "Latest capture"
        : "Captured";

  const snippetRaw =
    record.snippet?.trim() ||
    (locale === "fr"
      ? "Aucun résumé n’est encore disponible pour cette capture."
      : "No summary is available for this snapshot yet.");
  const snippet = cleanSnippet(snippetRaw);

  const queryTokens = tokenizeQuery(query);
  const titleNodes = highlightText(record.title, queryTokens);
  const snippetNodes = highlightText(snippet, queryTokens);

  const urlParts = formatUrlParts(record.originalUrl);

  const viewUrl = buildViewUrl(record, returnPath ?? null);
  const detailsUrl = `/snapshot/${record.id}`;
  const viewLabel = locale === "fr" ? "Voir" : "View";
  const detailsLabel = locale === "fr" ? "Détails" : "Details";

  return (
    <article className="ha-result-card">
      <div className="ha-result-row">
        <div className="ha-result-main">
          <h3 className="ha-result-title">
            {viewUrl ? (
              <a href={viewUrl} className="ha-result-title-link">
                {titleNodes}
              </a>
            ) : (
              <Link href={detailsUrl} className="ha-result-title-link">
                {titleNodes}
              </Link>
            )}
          </h3>

          <div
            className="ha-result-meta"
            aria-label={locale === "fr" ? "Métadonnées du résultat" : "Result metadata"}
          >
            <span className="ha-result-badge ha-result-badge--source">{record.sourceName}</span>
            {view === "pages" &&
              typeof record.pageSnapshotsCount === "number" &&
              record.pageSnapshotsCount > 1 && (
                <span className="ha-result-meta-item">
                  <span className="ha-result-meta-label">
                    {locale === "fr" ? "Captures" : "Captures"}
                  </span>{" "}
                  {record.pageSnapshotsCount}
                </span>
              )}
            {record.captureDate && (
              <span className="ha-result-meta-item">
                <ResultIcon>
                  <CalendarIcon />
                </ResultIcon>
                <span className="ha-result-meta-label">{label}</span>{" "}
                {formatDate(locale, record.captureDate)}
              </span>
            )}
            {record.language && (
              <span className="ha-result-meta-item">
                <ResultIcon>
                  <GlobeIcon />
                </ResultIcon>
                {record.language}
              </span>
            )}
          </div>
        </div>

        <div className="ha-result-actions flex flex-wrap justify-start gap-2 sm:justify-end">
          {viewUrl ? (
            <a href={viewUrl} className="ha-btn-primary text-xs">
              {viewLabel}
            </a>
          ) : (
            <Link href={detailsUrl} className="ha-btn-primary text-xs">
              {detailsLabel}
            </Link>
          )}
          {viewUrl && (
            <Link href={detailsUrl} className="ha-btn-secondary text-xs">
              {detailsLabel}
            </Link>
          )}
          {view === "pages" && (
            <Link
              href={`/archive?view=snapshots&source=${encodeURIComponent(
                record.sourceCode,
              )}&q=${encodeURIComponent(record.originalUrl)}&focus=results`}
              className="ha-btn-secondary text-xs"
            >
              {locale === "fr" ? "Toutes les captures" : "All snapshots"}
            </Link>
          )}
        </div>
      </div>

      <p className="ha-result-snippet ha-line-clamp-3">{snippetNodes}</p>

      <div className="ha-result-url-row">
        <div className="ha-result-url">
          <span className="ha-result-url-label">
            {locale === "fr" ? "URL d’origine" : "Original URL"}
          </span>
          <a
            href={record.originalUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="ha-result-url-link"
            title={record.originalUrl}
          >
            <span className="ha-result-url-host">{urlParts.host}</span>
            {urlParts.rest && <span className="ha-result-url-rest">{urlParts.rest}</span>}
          </a>
          <CopyButton
            text={record.originalUrl}
            label={locale === "fr" ? "Copier l’URL d’origine" : "Copy original URL"}
            className="ha-icon-btn"
          >
            <CopyIcon />
          </CopyButton>
        </div>
      </div>
    </article>
  );
}
