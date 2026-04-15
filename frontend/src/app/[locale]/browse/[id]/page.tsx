import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getRecordById } from "@/data/demo-records";
import { fetchSnapshotDetail } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";

function getBrowseMetadataCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      title: "Relecture d’une page archivée",
      description:
        "Ouvrez une page archivée dans le service de relecture. Le contenu archivé peut être incomplet, périmé ou remplacé.",
    };
  }

  return {
    title: "Replay an archived page",
    description:
      "Open an archived page in the replay service. Archived content may be incomplete, outdated, or superseded.",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>;
}): Promise<Metadata> {
  const routeParams = await params;
  const locale = await resolveLocale(Promise.resolve(routeParams));
  const copy = getBrowseMetadataCopy(locale);
  return {
    ...buildPageMetadata(locale, `/browse/${routeParams.id}`, copy.title, copy.description),
    robots: { index: false, follow: false },
  };
}

export default async function BrowseSnapshotPage({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>;
}) {
  const routeParams = await params;
  const { id } = routeParams;
  const locale = await resolveLocale(Promise.resolve(routeParams));

  const detailsTarget = locale === "fr" ? `/fr/snapshot/${id}` : `/snapshot/${id}`;

  const numericId = Number(id);
  if (!Number.isNaN(numericId)) {
    try {
      const snapshot = await fetchSnapshotDetail(numericId);
      if (snapshot.browseUrl) {
        redirect(snapshot.browseUrl);
      }
    } catch {
      // Fall through to the details page.
    }
    redirect(detailsTarget);
  }

  // Demo/offline IDs: replay is not available, so use the details page.
  const demo = getRecordById(id);
  if (demo) {
    redirect(detailsTarget);
  }

  redirect(detailsTarget);
}
