import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";

function getBrowseMetadataCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      title: "Parcourir une page archivée",
      description:
        "Consultez une page archivée et ses métadonnées associées. Le contenu archivé peut être incomplet, périmé ou remplacé.",
    };
  }

  return {
    title: "Browse an archived page",
    description:
      "Review an archived page and its associated metadata. Archived content may be incomplete, outdated, or superseded.",
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
    ...buildPageMetadata(locale, `/snapshot/${routeParams.id}`, copy.title, copy.description),
    robots: { index: false, follow: true },
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

  const target = locale === "fr" ? `/fr/snapshot/${id}` : `/snapshot/${id}`;
  redirect(target);
}
