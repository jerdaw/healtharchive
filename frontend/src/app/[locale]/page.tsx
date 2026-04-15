import type { Metadata } from "next";

import { demoRecords, getSourcesSummary } from "@/data/demo-records";
import { TrackChangesPhrase } from "@/components/TrackChangesPhrase";
import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { AnimatedMetric } from "@/components/home/AnimatedMetric";
import { ChangeShowcase } from "@/components/home/ChangeShowcase";
import { FAQ } from "@/components/home/FAQ";
import { FeaturedSources } from "@/components/home/FeaturedSources";
import { HomeSearch } from "@/components/home/HomeSearch";
import { HoverGlowLink } from "@/components/home/HoverGlowLink";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ProjectSnapshotOrchestrator } from "@/components/home/ProjectSnapshotOrchestrator";
import { RecentActivity, type ActivityItem } from "@/components/home/RecentActivity";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import { fetchArchiveStats, fetchChanges, fetchSources, type SourceSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { getHomeCopy } from "@/lib/homeCopy";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getHomeCopy(locale);
  return buildPageMetadata(locale, "/", copy.meta.title);
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const copy = getHomeCopy(locale);
  const fallbackRecordCount = demoRecords.length;
  const fallbackPageCount = new Set(demoRecords.map((r) => r.originalUrl)).size;

  const stats = await fetchArchiveStats().catch(() => null);
  const usingBackendStats = stats != null;
  const recordCount = stats?.snapshotsTotal ?? fallbackRecordCount;
  const pageCount = stats?.pagesTotal ?? fallbackPageCount;
  const sourceCount = stats?.sourcesTotal ?? 2;

  const apiSources = await fetchSources().catch(() => null);
  const featuredSources: SourceSummary[] =
    apiSources ??
    getSourcesSummary().map((s) => ({
      ...s,
      latestRecordId: s.latestRecordId ? Number(s.latestRecordId) : null,
      baseUrl: null,
      description: null,
      entryRecordId: null,
      entryBrowseUrl: null,
    }));

  const recentChanges = await fetchChanges({ pageSize: 5 }).catch(() => null);
  const activityItems: ActivityItem[] = (recentChanges?.results ?? []).map((event) => ({
    id: event.toSnapshotId,
    title: event.summary ?? event.normalizedUrlGroup ?? "Page change",
    sourceName: event.sourceName ?? event.sourceCode ?? "Unknown",
    timestamp: event.toCaptureTimestamp ?? "",
    type: "change" as const,
  }));

  return (
    <div className="ha-container space-y-6 pt-6">
      {/* ========== Hero ========== */}
      <section>
        <div className="ha-home-hero grid gap-10 lg:grid-cols-[minmax(0,1.7fr),minmax(0,1fr)] lg:items-center">
          <div className="space-y-9">
            <p className="ha-eyebrow ha-home-hero-eyebrow">{copy.hero.eyebrow}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl md:text-[2.6rem] md:leading-snug">
              {copy.hero.h1Before} <span className="text-ha-accent">{copy.hero.h1Accent}</span>,
              <span className="block sm:inline">
                {" "}
                {copy.hero.h1Middle} <TrackChangesPhrase /> {copy.hero.h1Suffix}
              </span>
            </h1>
            <p className="text-ha-muted ha-home-hero-lede text-sm leading-relaxed sm:text-base">
              {copy.hero.lede}
            </p>
            <HomeSearch />
            <div className="flex flex-wrap gap-3 pt-1">
              <HoverGlowLink href="/archive">{copy.hero.ctaPrimary}</HoverGlowLink>
              <Link href="#how-it-works" className="ha-btn-secondary">
                {copy.hero.ctaSecondary}
              </Link>
            </div>
          </div>

          {/* Side card — Project snapshot */}
          <div className="ha-card ha-card-elevated p-4 sm:p-5">
            <ProjectSnapshotOrchestrator expectedIds={["records", "pages", "sources"]} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  {copy.projectSnapshot.heading}
                </h2>
                <p className="text-ha-muted text-xs">
                  {usingBackendStats
                    ? copy.projectSnapshot.liveSubtext
                    : copy.projectSnapshot.offlineSubtext}
                </p>
              </div>
            </div>
            <dl className="ha-metric-grid ha-metric-grid-2 mt-4 text-xs sm:text-sm">
              <AnimatedMetric
                id="records"
                label={copy.projectSnapshot.archivedSnapshots}
                value={recordCount}
                unit={copy.projectSnapshot.snapshotsUnit}
                showBar={false}
                start={false}
                startEvent="ha-trackchanges-finished"
                completeEvent="ha-metric-finished"
              />
              <AnimatedMetric
                id="pages"
                label={copy.projectSnapshot.uniquePages}
                value={pageCount}
                unit={copy.projectSnapshot.pagesUnit}
                showBar={false}
                start={false}
                startEvent="ha-trackchanges-finished"
                completeEvent="ha-metric-finished"
              />
              <AnimatedMetric
                id="sources"
                label={copy.projectSnapshot.sourcesTracked}
                value={sourceCount}
                unit={copy.projectSnapshot.sourcesUnit}
                showBar={false}
                start={false}
                startEvent="ha-trackchanges-finished"
                completeEvent="ha-metric-finished"
              />
            </dl>
            {stats?.latestCaptureDate && (
              <p className="text-ha-muted mt-3 text-xs">
                {copy.projectSnapshot.lastUpdatedLabel}:{" "}
                {formatDate(locale, stats.latestCaptureDate)}
              </p>
            )}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between">
                <Link href="/status" className="ha-link text-xs">
                  {copy.projectSnapshot.viewStatus}
                </Link>
                <span className="ha-badge-dev">{copy.hero.inDevelopment}</span>
              </div>
              <p className="text-ha-muted text-xs">{copy.hero.developmentNote}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== How it works ========== */}
      <ScrollReveal>
        <HowItWorks locale={locale} />
      </ScrollReveal>

      {/* ========== Audience cards ========== */}
      <ScrollReveal>
        <AudienceSection locale={locale} />
      </ScrollReveal>

      {/* ========== Featured sources ========== */}
      <ScrollReveal>
        <FeaturedSources locale={locale} sources={featuredSources} />
      </ScrollReveal>

      {/* ========== Change tracking showcase (includes example story) ========== */}
      <ScrollReveal>
        <ChangeShowcase />
      </ScrollReveal>

      {/* ========== Recent activity ========== */}
      <ScrollReveal>
        <section>
          <div className="ha-home-hero ha-home-hero-plain space-y-4">
            <RecentActivity items={activityItems} />
          </div>
        </section>
      </ScrollReveal>

      {/* ========== FAQ ========== */}
      <ScrollReveal>
        <FAQ locale={locale} />
      </ScrollReveal>

      {/* ========== Bottom CTA ========== */}
      <ScrollReveal>
        <BottomCta locale={locale} />
      </ScrollReveal>
    </div>
  );
}

/* ================================================================
   Inline sub-components (small, page-specific, not worth separate files)
   ================================================================ */

function AudienceSection({ locale }: { locale: Locale }) {
  const copy = getHomeCopy(locale);
  const audiences = [
    {
      key: "clinicians",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path d="M9.5 7a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z" />
          <path d="M7 14.5a4.5 4.5 0 0 1 9 0V17H7z" />
          <path d="M16 10.8 18.2 12l2.3-1.2v2.9c0 1.35-.78 2.52-2.3 3.2-1.52-.68-2.3-1.85-2.3-3.2z" />
        </svg>
      ),
      ...copy.audience.clinicians,
      href: "/archive",
    },
    {
      key: "researchers",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path d="M5 17.5h14" />
          <path d="M8.5 17.5v-5.5M12 17.5v-8M15.5 17.5v-3.5" />
          <path d="M7 10l3-2.5 2.5 2 3.5-3.5" />
          <path d="M15 5.5h3v3" />
        </svg>
      ),
      ...copy.audience.researchers,
      href: "/researchers",
    },
    {
      key: "public",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path d="M7 9.5h6.5a3.5 3.5 0 1 1 0 7H11l-2.5 2v-2H7a3.5 3.5 0 1 1 0-7Z" />
          <path d="M9 12h4.5" />
          <path d="M9 14.2h2.5" />
        </svg>
      ),
      ...copy.audience.public,
      href: "/archive",
    },
  ];

  return (
    <section>
      <div className="ha-home-hero ha-home-hero-plain space-y-7">
        <h2 className="ha-section-heading">{copy.audience.heading}</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          {copy.audience.subtitle}
        </p>
        <div className="ha-grid-3 gap-4 pt-5 md:gap-5 md:pt-6">
          {audiences.map((a) => (
            <div className="ha-card ha-audience-card p-4 sm:p-5" key={a.key}>
              <div className="ha-audience-card-inner">
                <span className="ha-audience-icon" aria-hidden="true">
                  {a.icon}
                </span>
                <h3 className="text-sm font-semibold text-[var(--text)]">{a.title}</h3>
              </div>
              <p className="ha-audience-body text-ha-muted text-sm sm:text-base">{a.body}</p>
              <Link href={a.href} className="ha-link mt-1 inline-block text-xs">
                {a.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCta({ locale }: { locale: Locale }) {
  const copy = getHomeCopy(locale);

  return (
    <section>
      <div className="ha-home-cta-band space-y-5">
        <h2 className="text-xl font-semibold text-[var(--text)] sm:text-2xl">
          {copy.bottomCta.heading}
        </h2>
        <p className="text-ha-muted mx-auto max-w-lg text-sm leading-relaxed sm:text-base">
          {copy.bottomCta.subheading}
        </p>
        <div className="mx-auto max-w-lg pt-2">
          <HomeSearch ariaLabel={copy.search.bottomCtaAriaLabel} />
        </div>
        <p className="text-center">
          <Link href="/archive/browse-by-source" className="ha-link text-xs">
            {copy.bottomCta.cta}
          </Link>
        </p>
      </div>
    </section>
  );
}
