import { demoRecords } from "@/data/demo-records";
import { TrackChangesPhrase } from "@/components/TrackChangesPhrase";
import Link from "next/link";
import { AnimatedMetric } from "@/components/home/AnimatedMetric";
import { HoverGlowLink } from "@/components/home/HoverGlowLink";
import { ProjectSnapshotOrchestrator } from "@/components/home/ProjectSnapshotOrchestrator";

export default function HomePage() {
    const recordCount = demoRecords.length;
    const sourceCount = new Set(demoRecords.map((r) => r.sourceName)).size;

    return (
        <div className="ha-container space-y-14 pt-3 sm:pt-4">
            {/* Hero */}
            <section>
                <div className="ha-home-hero grid gap-10 lg:grid-cols-[minmax(0,1.7fr),minmax(0,1fr)] lg:items-center">
                    <div className="space-y-9">
                        <p className="ha-eyebrow ha-home-hero-eyebrow">
                            Snapshot-based public health archive
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-[2.6rem] md:leading-snug">
                            See what Canadian public health websites{" "}
                            <span className="text-ha-accent">used to say</span>,
                            <span className="block sm:inline">
                                {" "}
                                even <TrackChangesPhrase /> they change.
                            </span>
                        </h1>
                        <p className="text-sm leading-relaxed text-ha-muted sm:text-base ha-home-hero-lede">
                            HealthArchive.ca is a volunteer-led project
                            preserving snapshots of key Canadian public health
                            websites, so clinicians, researchers, journalists,
                            and the public can see what was published at
                            specific points in time—even if pages move, are
                            updated, or disappear.
                        </p>
                        <div className="ha-home-hero-meta text-xs text-ha-muted pt-1">
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                                Early development
                            </span>
                            <span className="ha-home-hero-meta-text">
                                Search and archive views are currently powered
                                by a small demo dataset while the full
                                infrastructure is being built.
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-3 pt-1">
                            <HoverGlowLink href="/archive">
                                Browse demo archive
                            </HoverGlowLink>
                            <Link href="/methods" className="ha-btn-secondary">
                                Methods &amp; scope
                            </Link>
                        </div>
                    </div>

                    {/* Side card */}
                    <div className="ha-card ha-card-elevated p-4 sm:p-5">
                        <ProjectSnapshotOrchestrator
                            expectedIds={["records", "sources"]}
                        />
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Project snapshot
                                </h2>
                                <p className="text-xs text-ha-muted">
                                    Prototype archive for selected federal
                                    public health pages.
                                </p>
                            </div>
                            <span className="ha-badge ha-badge-amber">
                                Demo phase
                            </span>
                        </div>
                        <dl className="mt-4 ha-metric-grid ha-metric-grid-2 text-xs sm:text-sm">
                            <AnimatedMetric
                                id="records"
                                label="Sample records"
                                value={recordCount}
                                unit="entries"
                                barPercent={Math.min(100, recordCount * 8)}
                                start={false}
                                startEvent="ha-trackchanges-finished"
                                completeEvent="ha-metric-finished"
                            />
                            <AnimatedMetric
                                id="sources"
                                label="Federal sources"
                                value={sourceCount}
                                unit="sites"
                                barPercent={Math.min(100, sourceCount * 22)}
                                start={false}
                                startEvent="ha-trackchanges-finished"
                                completeEvent="ha-metric-finished"
                            />
                            <div>
                                <dt className="ha-metric-label">Focus</dt>
                                <dd className="ha-metric-secondary">
                                    COVID-19, influenza, HIV, climate, food
                                    safety, water quality, and more.
                                </dd>
                            </div>
                            <div>
                                <dt className="ha-metric-label">
                                    Intended users
                                </dt>
                                <dd className="ha-metric-secondary">
                                    Clinicians, public health practitioners,
                                    researchers, and data-curious members of
                                    the public.
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </section>

            {/* Who this is for */}
            <section>
                <div className="ha-home-hero space-y-7">
                    <h2 className="ha-section-heading">Who is this for?</h2>
                    <p className="ha-section-subtitle ha-section-lede leading-relaxed">
                        The archive serves clinicians, researchers, journalists,
                        and the public who need past public health guidance to
                        stay citable and discoverable as websites shift over time.
                    </p>
                    <div className="ha-grid-3 gap-4 md:gap-5 pt-5 md:pt-6">
                        <div className="ha-card ha-audience-card p-4 sm:p-5">
                            <div className="ha-audience-card-inner">
                                <span className="ha-audience-icon" aria-hidden="true">
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    >
                                        <path d="M9.5 7a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z" />
                                        <path d="M7 14.5a4.5 4.5 0 0 1 9 0V17H7z" />
                                        <path d="M16 10.8 18.2 12l2.3-1.2v2.9c0 1.35-.78 2.52-2.3 3.2-1.52-.68-2.3-1.85-2.3-3.2z" />
                                    </svg>
                                </span>
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Clinicians &amp; public health practitioners
                                </h3>
                            </div>
                            <p className="ha-audience-body text-sm sm:text-base text-ha-muted">
                                Revisit past guidance on topics such as COVID-19
                                vaccination, seasonal influenza, naloxone
                                distribution, or mpox to understand how
                                recommendations have evolved.
                            </p>
                        </div>
                        <div className="ha-card ha-audience-card p-4 sm:p-5">
                            <div className="ha-audience-card-inner">
                                <span className="ha-audience-icon" aria-hidden="true">
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    >
                                        <path d="M5 17.5h14" />
                                        <path d="M8.5 17.5v-5.5M12 17.5v-8M15.5 17.5v-3.5" />
                                        <path d="M7 10l3-2.5 2.5 2 3.5-3.5" />
                                        <path d="M15 5.5h3v3" />
                                    </svg>
                                </span>
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Researchers &amp; data journalists
                                </h3>
                            </div>
                            <p className="ha-audience-body text-sm sm:text-base text-ha-muted">
                                Link analyses and publications to the exact
                                wording, tables, and dashboards that were
                                visible on a given date, improving
                                reproducibility and auditability.
                            </p>
                        </div>
                        <div className="ha-card ha-audience-card p-4 sm:p-5">
                            <div className="ha-audience-card-inner">
                                <span className="ha-audience-icon" aria-hidden="true">
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    >
                                        <path d="M7 9.5h6.5a3.5 3.5 0 1 1 0 7H11l-2.5 2v-2H7a3.5 3.5 0 1 1 0-7Z" />
                                        <path d="M9 12h4.5" />
                                        <path d="M9 14.2h2.5" />
                                    </svg>
                                </span>
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Members of the public
                                </h3>
                            </div>
                            <p className="ha-audience-body text-sm sm:text-base text-ha-muted">
                                Explore how key public health messages and
                                risk communication have changed across time
                                while keeping official sites as the primary
                                source of up-to-date guidance.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Short explainer */}
            <section>
                <div className="ha-home-hero grid gap-8 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1.2fr)]">
                    <div className="space-y-7">
                        <h2 className="ha-section-heading">
                            What is HealthArchive.ca?
                        </h2>
                        <p className="ha-section-subtitle ha-section-lede leading-relaxed mb-12 sm:mb-14">
                            HealthArchive.ca is an independent, non-governmental
                            archive of Canadian public health information. It
                            uses modern web-archiving tools to capture, store,
                            and replay snapshots of key public health websites,
                            starting with federal sources such as the Public
                            Health Agency of Canada and Health Canada.
                        </p>
                        <p className="text-sm sm:text-base leading-relaxed text-ha-muted mt-4 sm:mt-6">
                            Government websites are living documents: pages
                            move, content changes, and dashboards appear and
                            disappear. The goal is to provide transparent,
                            verifiable access to previously public health
                            information—not to replace official guidance or
                            offer medical advice.
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/methods"
                                className="inline-flex text-xs font-medium text-ha-accent hover:text-blue-700"
                            >
                                Read more about methods &amp; coverage →
                            </Link>
                        </div>
                    </div>
                    <div className="ha-card ha-card-elevated p-4 sm:p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-slate-900">
                            What this demo is (and isn&apos;t)
                        </h3>
                        <ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed sm:text-sm text-ha-muted">
                            <li>
                                <strong>Is:</strong> a small, hand-curated demo
                                showing how the future archive explorer and
                                snapshot viewer will behave.
                            </li>
                            <li>
                                <strong>Is not:</strong> a complete or
                                authoritative copy of any public health site.
                                Coverage is intentionally small and will be
                                documented transparently as the project grows.
                            </li>
                            <li>
                                For current guidance, always refer to the
                                relevant official websites (e.g.,{" "}
                                <span className="font-medium">
                                    canada.ca/public-health
                                </span>
                                ).
                            </li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}
