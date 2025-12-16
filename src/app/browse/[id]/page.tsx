import { notFound } from "next/navigation";

import { getRecordById } from "@/data/demo-records";
import { fetchSnapshotDetail, fetchSourceEditions, getApiBaseUrl } from "@/lib/api";
import { BrowseReplayClient } from "@/components/replay/BrowseReplayClient";

export default async function BrowseSnapshotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let snapshotMeta: Awaited<ReturnType<typeof fetchSnapshotDetail>> | null =
    null;
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

  const title = snapshotMeta?.title ?? record?.title ?? "Archived page";
  const sourceCode = snapshotMeta?.sourceCode ?? record?.sourceCode ?? null;
  const sourceName =
    snapshotMeta?.sourceName ?? record?.sourceName ?? "Unknown source";
  const captureDate =
    snapshotMeta?.captureDate ?? record?.captureDate ?? "Unknown";
  const captureTimestamp = snapshotMeta?.captureTimestamp ?? null;
  const jobId = snapshotMeta?.jobId ?? null;
  const originalUrl =
    snapshotMeta?.originalUrl ?? record?.originalUrl ?? "Unknown URL";

  const apiBaseUrl = getApiBaseUrl();
  const rawHtmlUrl =
    snapshotMeta?.rawSnapshotUrl != null
      ? `${apiBaseUrl}${snapshotMeta.rawSnapshotUrl}`
      : record?.snapshotPath ?? null;
  const browseUrl = snapshotMeta?.browseUrl ?? null;
  const apiLink =
    usingBackend && snapshotMeta?.id != null
      ? `${apiBaseUrl}/api/snapshot/${snapshotMeta.id}`
      : undefined;

  let sourceEditions: Awaited<ReturnType<typeof fetchSourceEditions>> | null =
    null;
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
