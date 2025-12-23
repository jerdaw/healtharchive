import { notFound } from "next/navigation";

import { getRecordById } from "@/data/demo-records";
import { fetchSnapshotDetail, fetchSourceEditions, getApiBaseUrl } from "@/lib/api";
import { resolveLocale } from "@/lib/resolveLocale";
import { BrowseReplayClient } from "@/components/replay/BrowseReplayClient";

export default async function BrowseSnapshotPage({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>;
}) {
  const routeParams = await params;
  const { id } = routeParams;
  const locale = await resolveLocale(Promise.resolve(routeParams));

  let snapshotMeta: Awaited<ReturnType<typeof fetchSnapshotDetail>> | null = null;
  let usingBackend = false;

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

  const title =
    snapshotMeta?.title ?? record?.title ?? (locale === "fr" ? "Page archivée" : "Archived page");
  const sourceCode = snapshotMeta?.sourceCode ?? record?.sourceCode ?? null;
  const sourceName =
    snapshotMeta?.sourceName ??
    record?.sourceName ??
    (locale === "fr" ? "Source inconnue" : "Unknown source");
  const captureDate =
    snapshotMeta?.captureDate ?? record?.captureDate ?? (locale === "fr" ? "Inconnu" : "Unknown");
  const captureTimestamp = snapshotMeta?.captureTimestamp ?? null;
  const jobId = snapshotMeta?.jobId ?? null;
  const originalUrl = snapshotMeta?.originalUrl ?? record?.originalUrl ?? null;

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

  return (
    <BrowseReplayClient
      snapshotId={id}
      title={title}
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
    />
  );
}
