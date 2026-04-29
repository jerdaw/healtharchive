import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { PageShell } from "@/components/layout/PageShell";
import { ApiError, fetchAnnualCoverage } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";

type CoverageRouteParams = {
  locale: string;
  sourceCode: string;
  year: string;
};

function getCoverageCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: "Couverture annuelle",
      intro:
        "Résumé public de la couverture, des lacunes connues et de la provenance de capture pour une édition annuelle.",
      searchReady: "Recherche prête",
      researchReady: "Recherche documentaire prête",
      notReady: "Non prête",
      coverage: "Couverture",
      provenance: "Provenance",
      shards: "Fragments",
      knownGaps: "Lacunes connues",
      fallback: "Captures de secours",
      back: "Retour au statut",
    };
  }

  return {
    eyebrow: "Annual coverage",
    intro:
      "Public summary of capture coverage, known gaps, and capture provenance for an annual edition.",
    searchReady: "Search ready",
    researchReady: "Research ready",
    notReady: "Not ready",
    coverage: "Coverage",
    provenance: "Provenance",
    shards: "Shards",
    knownGaps: "Known gaps",
    fallback: "Fallback captures",
    back: "Back to status",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<CoverageRouteParams>;
}): Promise<Metadata> {
  const resolved = await params;
  const locale = await resolveLocale(Promise.resolve(resolved));
  const title = `${resolved.sourceCode.toUpperCase()} ${resolved.year} coverage`;
  return buildPageMetadata(locale, `/coverage/${resolved.sourceCode}/${resolved.year}`, title);
}

function parseYear(value: string): number {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1970 || year > 2100) {
    notFound();
  }
  return year;
}

export default async function CoveragePage({ params }: { params: Promise<CoverageRouteParams> }) {
  const resolved = await params;
  const locale = await resolveLocale(Promise.resolve(resolved));
  const copy = getCoverageCopy(locale);
  const sourceCode = resolved.sourceCode.trim().toLowerCase();
  const year = parseYear(resolved.year);

  const coverage = await fetchAnnualCoverage(sourceCode, year).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  });

  const title = `${coverage.sourceName ?? coverage.sourceCode?.toUpperCase() ?? sourceCode} ${coverage.year}`;
  const backendEntries = Object.entries(coverage.backendCounts ?? {});
  const statusTags = [
    coverage.searchReady ? copy.searchReady : copy.notReady,
    coverage.researchReady ? copy.researchReady : null,
  ].filter(Boolean);

  return (
    <PageShell eyebrow={copy.eyebrow} title={title} intro={copy.intro}>
      <section className="ha-content-section-lead space-y-4">
        <div className="flex flex-wrap gap-2">
          {statusTags.map((tag) => (
            <span key={tag} className="ha-tag">
              {tag}
            </span>
          ))}
          <span className="ha-tag">{coverage.status.replaceAll("_", " ")}</span>
        </div>
        <p className="text-ha-muted text-sm">
          {locale === "fr" ? "Rapport généré :" : "Report generated:"}{" "}
          {formatDate(locale, coverage.generatedAt)}
        </p>
      </section>

      <section className="ha-content-section space-y-4">
        <h2 className="ha-section-heading">{copy.coverage}</h2>
        <div className="ha-grid-3">
          <div className="ha-card space-y-1">
            <p className="text-ha-muted text-xs">
              {locale === "fr" ? "URL prévues" : "Intended URLs"}
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(locale, coverage.intendedUrlCount)}
            </p>
          </div>
          <div className="ha-card space-y-1">
            <p className="text-ha-muted text-xs">
              {locale === "fr" ? "URL capturées" : "Captured URLs"}
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(locale, coverage.capturedUrlCount)}
            </p>
          </div>
          <div className="ha-card space-y-1">
            <p className="text-ha-muted text-xs">{copy.knownGaps}</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(locale, coverage.missingUrlCount + coverage.failedUrlCount)}
            </p>
          </div>
        </div>
      </section>

      <section className="ha-content-section space-y-4">
        <h2 className="ha-section-heading">{copy.provenance}</h2>
        <div className="ha-grid-2">
          <div className="ha-card space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">{copy.shards}</h3>
            <p className="text-ha-muted text-sm">
              {formatNumber(locale, coverage.indexedShardCount)} /{" "}
              {formatNumber(locale, coverage.shardCount)}{" "}
              {locale === "fr" ? "indexés" : "indexed"}
            </p>
            <p className="text-ha-muted text-sm">
              {formatNumber(locale, coverage.needsReviewShardCount)}{" "}
              {locale === "fr" ? "à examiner" : "need review"}
            </p>
          </div>
          <div className="ha-card space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">{copy.fallback}</h3>
            <p className="text-ha-muted text-sm">
              {formatNumber(locale, coverage.fallbackUrlCount)}{" "}
              {locale === "fr" ? "instantanés" : "snapshots"}
            </p>
            {backendEntries.length > 0 ? (
              <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm">
                {backendEntries.map(([backend, count]) => (
                  <li key={backend}>
                    {backend}: {formatNumber(locale, count)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ha-muted text-sm">
                {locale === "fr" ? "Aucune capture indexée." : "No indexed captures."}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="ha-content-section space-y-4">
        <div className="ha-callout">
          <h2 className="ha-callout-title">
            {locale === "fr" ? "Standard d’acceptation" : "Acceptance standard"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Une édition peut être prête pour la recherche documentaire lorsque les captures utilisables sont indexées et que les lacunes restantes sont documentées avec leur provenance."
              : "An edition can be research-ready when usable captures are indexed and remaining gaps are documented with provenance."}
          </p>
        </div>
        <Link href="/status" className="ha-btn-secondary">
          {copy.back}
        </Link>
      </section>
    </PageShell>
  );
}
