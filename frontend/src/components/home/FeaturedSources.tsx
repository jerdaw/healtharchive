import type { Locale } from "@/lib/i18n";
import type { SourceSummary } from "@/lib/api";
import { getHomeCopy } from "@/lib/homeCopy";
import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

type Props = { locale: Locale; sources: SourceSummary[] };

export function FeaturedSources({ locale, sources }: Props) {
  const copy = getHomeCopy(locale);

  const displaySources = sources.slice(0, 6);

  return (
    <section>
      <div className="ha-home-hero ha-home-hero-plain space-y-7">
        <h2 className="ha-section-heading">{copy.featuredSources.heading}</h2>
        <p className="ha-section-subtitle">{copy.featuredSources.subtitle}</p>
        {displaySources.length === 0 ? (
          <p className="text-ha-muted text-sm">{copy.featuredSources.noSources}</p>
        ) : (
          <div className="ha-grid-3 gap-4 md:gap-5">
            {displaySources.map((source) => (
              <div className="ha-card space-y-2 p-4 sm:p-5" key={source.sourceCode}>
                <h3 className="text-sm font-semibold text-[var(--text)]">{source.sourceName}</h3>
                <p className="text-sm text-[var(--text)]">
                  {source.recordCount} {copy.featuredSources.snapshotsLabel}
                </p>
                <p className="text-ha-muted text-xs">
                  {copy.featuredSources.latestCapture}: {source.lastCapture}
                </p>
                <Link href={`/archive?source=${source.sourceCode}`} className="ha-link text-xs">
                  {copy.featuredSources.browse}
                </Link>
              </div>
            ))}
          </div>
        )}
        <Link href="/archive/browse-by-source" className="ha-link text-xs">
          {copy.featuredSources.seeAll}
        </Link>
      </div>
    </section>
  );
}
