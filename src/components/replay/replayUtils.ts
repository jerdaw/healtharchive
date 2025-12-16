export type ReplayEdition = {
  jobId: number;
  jobName: string;
  recordCount: number;
  firstCapture: string;
  lastCapture: string;
};

export function stripUrlFragment(url: string): string {
  const trimmed = url.trim();
  const hashIdx = trimmed.indexOf("#");
  if (hashIdx === -1) return trimmed;
  return trimmed.slice(0, hashIdx);
}

export function parseJobIdFromCollection(
  collection: string | null | undefined,
): number | null {
  if (!collection) return null;
  const match = /^job-(\d+)$/.exec(collection.trim());
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isoToTimestamp14(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");
  const second = date.getUTCSeconds().toString().padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}${second}`;
}

export function timestamp14ToDateLabel(ts: string | null | undefined): string | null {
  if (!ts || typeof ts !== "string" || ts.length < 8) return null;
  const year = Number(ts.slice(0, 4));
  const month = Number(ts.slice(4, 6));
  const day = Number(ts.slice(6, 8));
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function dateIsoToLabel(dateIso: string): string {
  const parts = dateIso.split("-");
  if (parts.length === 3) {
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (year && month && day) {
      const date = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
  }

  const parsed = new Date(dateIso);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return dateIso;
}

export function formatEditionLabel(edition: ReplayEdition): string {
  const first = dateIsoToLabel(edition.firstCapture);
  const last = dateIsoToLabel(edition.lastCapture);
  const range = edition.firstCapture === edition.lastCapture ? first : `${first}–${last}`;
  return `${range} (job-${edition.jobId})`;
}

export function buildReplayUrl(
  replayBase: string,
  jobId: number,
  timestamp14: string | null,
  originalUrl: string,
): string {
  const base = replayBase.replace(/\/+$/, "");
  const cleanedOriginalUrl = stripUrlFragment(originalUrl);
  if (timestamp14) {
    return `${base}/job-${jobId}/${timestamp14}/${cleanedOriginalUrl}`;
  }
  return `${base}/job-${jobId}/${cleanedOriginalUrl}`;
}

