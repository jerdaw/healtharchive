import type { Metadata } from "next";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { CopyButton } from "@/components/archive/CopyButton";

import { PageShell } from "@/components/layout/PageShell";
import { fetchSnapshotDetail, searchSnapshots } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata, SITE_BASE_URL } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";

function getCiteCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: "Citer",
      title: "Comment citer HealthArchive.ca",
      intro:
        "Conseils pratiques de citation pour les captures archivées et les vues de comparaison.",
    };
  }

  return {
    eyebrow: "Cite",
    title: "How to cite HealthArchive.ca",
    intro: "Pragmatic citation guidance for archived snapshots and compare views.",
  };
}

function formatUtcTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().replace(".000Z", "Z");
  }
  return value;
}

function stripUrlFragment(value: string): string {
  const idx = value.indexOf("#");
  return idx >= 0 ? value.slice(0, idx) : value;
}

function buildPrefilledCitation(args: {
  locale: Locale;
  snapshotId: number;
  title: string;
  sourceName: string;
  captureTimestamp: string | null;
  originalUrl: string;
  snapshotUrl: string;
  accessedDate: string;
}): string {
  const capture = args.captureTimestamp ?? (args.locale === "fr" ? "Inconnu" : "Unknown");
  const title = args.title || (args.locale === "fr" ? "Capture archivée" : "Archived snapshot");

  if (args.locale === "fr") {
    return `Projet HealthArchive.ca. « ${title} » (capture du ${capture}). Copie archivée de la page Web de ${args.sourceName} (${args.originalUrl}). Consulté le ${args.accessedDate}. Disponible à : ${args.snapshotUrl}.`;
  }

  return `HealthArchive.ca Project. “${title}” (snapshot from ${capture}). Archived copy of ${args.sourceName} web page (${args.originalUrl}). Accessed ${args.accessedDate}. Available from: ${args.snapshotUrl}.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getCiteCopy(locale);
  return buildPageMetadata(locale, "/cite", copy.title, copy.intro);
}

export default async function CitePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await resolveLocale(params);
  const copy = getCiteCopy(locale);
  const siteCopy = getSiteCopy(locale);
  const query = (await searchParams) ?? {};

  const snapshotParam = typeof query.snapshot === "string" ? query.snapshot : "";
  const urlParam = typeof query.url === "string" ? query.url : "";

  let prefillError: string | null = null;
  let citationText: string | null = null;
  let citationSnapshotId: number | null = null;

  if (snapshotParam || urlParam) {
    let resolvedSnapshotId: number | null = null;
    const parsedId = Number.parseInt(snapshotParam, 10);
    if (parsedId && !Number.isNaN(parsedId)) {
      resolvedSnapshotId = parsedId;
    } else if (urlParam.trim()) {
      const cleanedUrl = stripUrlFragment(urlParam.trim());
      try {
        const resolved = await searchSnapshots({
          q: cleanedUrl,
          view: "pages",
          sort: "newest",
          pageSize: 1,
        });
        resolvedSnapshotId = resolved.results[0]?.id ?? null;
      } catch {
        resolvedSnapshotId = null;
      }
    }

    if (resolvedSnapshotId != null) {
      try {
        const detail = await fetchSnapshotDetail(resolvedSnapshotId);
        const capture = formatUtcTimestamp(detail.captureTimestamp);
        const accessedDate = new Date().toISOString().slice(0, 10);
        const localePrefix = locale === "fr" ? "/fr" : "";
        const snapshotUrl = `${SITE_BASE_URL}${localePrefix}/snapshot/${detail.id}`;
        citationSnapshotId = detail.id;
        citationText = buildPrefilledCitation({
          locale,
          snapshotId: detail.id,
          title: detail.title ?? "",
          sourceName: detail.sourceName,
          captureTimestamp: capture,
          originalUrl: detail.originalUrl,
          snapshotUrl,
          accessedDate,
        });
      } catch {
        prefillError =
          locale === "fr"
            ? "Impossible de charger les informations de citation pour cette capture."
            : "Could not load citation information for that snapshot.";
      }
    } else {
      prefillError =
        locale === "fr"
          ? "Aucune capture n’a été trouvée pour préremplir la citation."
          : "No snapshot was found to prefill the citation.";
    }
  }

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      {(citationText || prefillError) && (
        <section className="ha-callout">
          <h2 className="ha-callout-title">
            {locale === "fr" ? "Citation suggérée" : "Suggested citation"}
          </h2>
          {prefillError ? (
            <p className="mt-2 text-xs leading-relaxed sm:text-sm">{prefillError}</p>
          ) : (
            <>
              <p className="mt-2 text-xs leading-relaxed sm:text-sm">
                {locale === "fr"
                  ? "Copiez et adaptez la citation ci-dessous selon votre style."
                  : "Copy and adapt the citation below to your preferred style."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CopyButton
                  text={citationText ?? ""}
                  label={locale === "fr" ? "Copier la citation" : "Copy citation"}
                  className="ha-btn-secondary text-xs"
                >
                  {locale === "fr" ? "Copier" : "Copy"}
                </CopyButton>
                {citationSnapshotId != null && (
                  <Link
                    href={`/snapshot/${citationSnapshotId}`}
                    className="ha-btn-secondary text-xs"
                  >
                    {locale === "fr" ? "Ouvrir la capture" : "Open snapshot"}
                  </Link>
                )}
              </div>
              <div className="ha-card ha-home-panel mt-4 p-4 text-xs break-words whitespace-pre-wrap text-slate-800 sm:p-5 sm:text-sm">
                {citationText}
              </div>
            </>
          )}
        </section>
      )}

      <section className="ha-content-section-lead space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Note importante" : "Important note"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "Ces citations se rapportent à du contenu archivé — pas à des directives actuelles ni à un avis médical."
            : "These citations refer to archived content — not current guidance or medical advice."}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {siteCopy.whatThisSiteIs.forCurrent}.
        </p>
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Télécharger / imprimer" : "Download / print"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr" ? (
              <>
                <a className="ha-link" href="/partner-kit/healtharchive-citation.fr.md">
                  Télécharger la fiche de citation (Markdown, alpha)
                </a>{" "}
                ·{" "}
                <a className="ha-link" href="/partner-kit/healtharchive-citation.md">
                  Version anglaise (officielle)
                </a>{" "}
                · ou utilisez la boîte de dialogue d’impression de votre navigateur pour enregistrer
                en PDF.
              </>
            ) : (
              <>
                <a className="ha-link" href="/partner-kit/healtharchive-citation.md">
                  Download citation handout (Markdown)
                </a>{" "}
                or use your browser’s print dialog to save as PDF.
              </>
            )}
          </p>
        </div>
      </section>

      <section className="ha-content-section space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "1) Citer une capture" : "1) Cite a snapshot"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr" ? "Format recommandé" : "Recommended format"}
        </p>
        <div className="ha-card ha-home-panel space-y-1 p-4 text-xs text-slate-800 sm:p-5 sm:text-sm">
          HealthArchive.ca Project. “&lt;Page title&gt;” (snapshot from &lt;capture date/time&gt;).
          Archived copy of &lt;source organization&gt; web page (&lt;original URL&gt;). Accessed
          &lt;access date&gt;. Available from: &lt;HealthArchive snapshot URL&gt;.
        </div>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr" ? "Exemple" : "Example"}
        </p>
        <div className="ha-card ha-home-panel space-y-1 p-4 text-xs text-slate-800 sm:p-5 sm:text-sm">
          HealthArchive.ca Project. “COVID-19 epidemiology update: Canada” (snapshot from 2025-02-15
          00:00 UTC). Archived copy of Public Health Agency of Canada web page
          (https://www.canada.ca/...). Accessed 2025-12-03. Available from:
          https://healtharchive.ca/snapshot/12345.
        </div>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "Utilisez l’URL exacte de la capture que vous avez consultée."
              : "Use the exact snapshot URL you visited."}
          </li>
          <li>
            {locale === "fr"
              ? "Utilisez l’horodatage de capture affiché sur la page de capture (UTC)."
              : "Use the capture timestamp shown on the snapshot page (UTC)."}
          </li>
          <li>
            {locale === "fr"
              ? "Citez aussi toujours l’URL d’origine."
              : "Always cite the original URL as well."}
          </li>
        </ul>
      </section>

      <section className="ha-content-section space-y-5">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "2) Citer une vue de comparaison" : "2) Cite a compare view"}
        </h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {locale === "fr"
            ? "Les vues de comparaison mettent en évidence des différences de texte descriptives entre deux captures archivées de la même page."
            : "Compare views highlight descriptive text differences between two archived captures of the same page."}
        </p>
        <div className="ha-card ha-home-panel space-y-1 p-4 text-xs text-slate-800 sm:p-5 sm:text-sm">
          HealthArchive.ca Project. “Comparison of archived captures” (from snapshot &lt;ID A&gt; to
          snapshot &lt;ID B&gt;). Archived copies of &lt;source organization&gt; web page
          (&lt;original URL&gt;). Accessed &lt;access date&gt;. Available from:
          https://healtharchive.ca/compare?from=&lt;ID A&gt;&amp;to=&lt;ID B&gt;.
        </div>
        <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
          <li>
            {locale === "fr"
              ? "La comparaison est descriptive seulement et n’interprète pas le sens."
              : "Compare output is descriptive only and does not interpret meaning."}
          </li>
          <li>
            {locale === "fr"
              ? "Notez les deux IDs de capture et les horodatages affichés sur la page de comparaison."
              : "Record both snapshot IDs and the capture timestamps shown on the compare page."}
          </li>
          <li>
            {locale === "fr"
              ? "Les comparaisons avec la page en direct (/compare-live) ne sont pas des enregistrements d’archive; citez plutôt la capture."
              : "Live compare views (/compare-live) are not archival records; cite the snapshot instead."}
          </li>
        </ul>
      </section>

      <section className="ha-content-section space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr"
              ? "Où trouver les champs de citation"
              : "Where to find the citation fields"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr" ? (
              <>
                Sur <span className="font-medium text-slate-800">/snapshot/&lt;id&gt;</span>, vous
                trouverez le titre de la page, la date/heure de capture (UTC), l’organisation
                source, l’URL d’origine et l’URL de la capture.
              </>
            ) : (
              <>
                On <span className="font-medium text-slate-800">/snapshot/&lt;id&gt;</span> you can
                find the page title, capture date/time (UTC), source organization, original URL, and
                the snapshot URL.
              </>
            )}
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            On{" "}
            <span className="font-medium text-slate-800">
              /compare?from=&lt;id&gt;&amp;to=&lt;id&gt;
            </span>{" "}
            {locale === "fr"
              ? "vous trouverez les deux IDs de capture, les deux horodatages de capture (UTC), l’URL d’origine et un résumé descriptif des changements."
              : "you can find both snapshot IDs, both capture timestamps (UTC), the original URL, and a descriptive change summary."}
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Les pages /compare-live effectuent un chargement en direct à chaque requête; elles ne remplacent pas une citation de capture."
              : "/compare-live pages perform a live fetch on each request; they do not replace a snapshot citation."}
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Besoin d’un exemple? Commencez par l’"
              : "Want help finding an example? Start from the"}{" "}
            <Link href="/archive" className="ha-link">
              {locale === "fr" ? "explorateur d’archives" : "archive explorer"}
            </Link>{" "}
            {locale === "fr" ? "et ouvrez n’importe quelle capture." : "and open any snapshot."}
          </p>
        </div>
      </section>
    </PageShell>
  );
}
