import type { Metadata } from "next";

import { notFound } from "next/navigation";
import { getRecordById } from "@/data/demo-records";
import {
  fetchSnapshotDetail,
  fetchSnapshotLatest,
  fetchSourceEditions,
  getApiBaseUrl,
} from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { isHtmlMimeType } from "@/lib/mime";
import { resolveLocale } from "@/lib/resolveLocale";
import { BrowseReplayClient } from "@/components/replay/BrowseReplayClient";

function getSnapshotMetadataCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      title: "Capture archivée",
      description:
        "Consultez une capture archivée et ses métadonnées associées. Le contenu archivé peut être incomplet, périmé ou remplacé.",
    };
  }

  return {
    title: "Archived snapshot",
    description:
      "Review an archived snapshot and its associated metadata. Archived content may be incomplete, outdated, or superseded.",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>;
}): Promise<Metadata> {
  const routeParams = await params;
  const locale = await resolveLocale(Promise.resolve(routeParams));
  const copy = getSnapshotMetadataCopy(locale);
  return buildPageMetadata(locale, `/snapshot/${routeParams.id}`, copy.title, copy.description);
}

export default async function SnapshotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale?: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const routeParams = await params;
  const { id } = routeParams;
  const locale = await resolveLocale(Promise.resolve(routeParams));
  const routeSearchParams = await (searchParams ??
    Promise.resolve<Record<string, string | string[] | undefined>>({}));
  const viewParam = typeof routeSearchParams.view === "string" ? routeSearchParams.view : "";
  const panelParam = typeof routeSearchParams.panel === "string" ? routeSearchParams.panel : "";
  const initialDetailsOpen = viewParam === "details" || panelParam === "details";

  let snapshotMeta: Awaited<ReturnType<typeof fetchSnapshotDetail>> | null = null;
  let usingBackend = false;

  // Attempt to fetch real snapshot metadata from the backend. If that fails
  // (e.g., backend not running or this ID not present), fall back to the demo
  // record lookup.
  try {
    const numericId = Number(id);
    if (!Number.isNaN(numericId)) {
      snapshotMeta = await fetchSnapshotDetail(numericId);
      usingBackend = true;
    }
  } catch {
    snapshotMeta = null;
    usingBackend = false;
  }

  const record = getRecordById(id);

  if (!snapshotMeta && !record) {
    return notFound();
  }

  const title = snapshotMeta?.title ?? record?.title ?? (locale === "fr" ? "Capture" : "Snapshot");
  const captureDate =
    snapshotMeta?.captureDate ?? record?.captureDate ?? (locale === "fr" ? "Inconnu" : "Unknown");
  const sourceCode = snapshotMeta?.sourceCode ?? record?.sourceCode ?? null;
  const sourceName =
    snapshotMeta?.sourceName ??
    record?.sourceName ??
    (locale === "fr" ? "Source inconnue" : "Unknown source");
  const language =
    snapshotMeta?.language ?? record?.language ?? (locale === "fr" ? "Inconnu" : "Unknown");
  const originalUrl = snapshotMeta?.originalUrl ?? record?.originalUrl ?? null;
  const captureTimestamp = snapshotMeta?.captureTimestamp ?? null;
  const jobId = snapshotMeta?.jobId ?? null;
  // Backend-backed snapshots may include:
  // - browseUrl: an absolute URL to the replay service (preferred for browsing)
  // - rawSnapshotUrl: a backend-relative HTML endpoint for debugging/fallback
  //
  // For backend-backed snapshots, rawSnapshotUrl is a path (e.g.
  // "/api/snapshots/raw/{id}") relative to the backend host. Prefix it with
  // the configured API base URL so the iframe/link always point at the backend
  // origin, not the frontend origin. For demo records, fall back to the local
  // static snapshot path under /public.
  const apiBaseUrl = getApiBaseUrl();
  const rawHtmlUrl =
    snapshotMeta?.rawSnapshotUrl != null
      ? `${apiBaseUrl}${snapshotMeta.rawSnapshotUrl}`
      : (record?.snapshotPath ?? null);
  const browseUrl = snapshotMeta?.browseUrl ?? null;
  const apiLink =
    usingBackend && snapshotMeta?.id != null
      ? `${apiBaseUrl}/api/snapshot/${snapshotMeta.id}`
      : undefined;

  let sourceEditions: Awaited<ReturnType<typeof fetchSourceEditions>> | null = null;
  if (usingBackend && snapshotMeta?.sourceCode) {
    try {
      sourceEditions = await fetchSourceEditions(snapshotMeta.sourceCode);
    } catch {
      sourceEditions = null;
    }
  }

  const canCompareLive = Boolean(
    usingBackend && snapshotMeta?.id && isHtmlMimeType(snapshotMeta?.mimeType),
  );
  let compareLiveSnapshotId: number | null = null;
  if (canCompareLive && snapshotMeta?.id) {
    compareLiveSnapshotId = snapshotMeta.id;
    try {
      const latest = await fetchSnapshotLatest(snapshotMeta.id);
      if (latest.found && latest.snapshotId != null) {
        compareLiveSnapshotId = latest.snapshotId;
      }
    } catch {
      compareLiveSnapshotId = snapshotMeta.id;
    }
  }

  const timelineSnapshotId = usingBackend && snapshotMeta?.id != null ? snapshotMeta.id : null;

  return (
    <BrowseReplayClient
      snapshotId={id}
      title={title}
      language={language}
      sourceCode={sourceCode}
      sourceName={sourceName}
      captureDate={captureDate}
      captureTimestamp={captureTimestamp}
      jobId={jobId}
      originalUrl={originalUrl}
      browseUrl={browseUrl}
      rawHtmlUrl={rawHtmlUrl}
      apiLink={apiLink}
      editions={sourceEditions}
      canCompareLive={canCompareLive}
      initialCompareSnapshotId={
        compareLiveSnapshotId != null ? String(compareLiveSnapshotId) : null
      }
      initialDetailsOpen={initialDetailsOpen}
      timelineSnapshotId={timelineSnapshotId}
    />
  );
}
