import Link from "next/link";
import { demoRecords } from "@/data/demo-records";
import { TrackChangesPhrase } from "@/components/TrackChangesPhrase";

export default function HomePage() {
    const recordCount = demoRecords.length;
    const sourceCount = new Set(demoRecords.map((r) => r.sourceName)).size;

    return (
        <div className="ha-container space-y-10">
            {/* Hero */}
            <section className="grid gap-10 pb-6 pt-6 lg:grid-cols-[minmax(0,1.7fr),minmax(0,1fr)] lg:items-center">
                <div className="space-y-5">
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-[2.6rem] md:leading-snug">
                        See what Canadian public health websites{" "}
                        <span className="text-ha-accent">used to say</span>,
                        <span className="block sm:inline">
                            {" "}
                            even <TrackChangesPhrase /> they change.
                        </span>
                    </h1>
                    <p className="text-sm leading-relaxed text-ha-muted sm:text-base">
                        HealthArchive.ca is a volunteer-led project preserving
                        snapshots of key Canadian public health websites, so
                        clinicians, researchers, journalists, and the public can
                        see what was published at specific points in time—even
                        if pages move, are updated, or disappear.
                    </p>
                    <p className="text-xs text-ha-muted">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                            Early development
                        </span>{" "}
                        <span className="ml-2">
                            Search and archive views are currently powered by a
                            small demo dataset while the full infrastructure is
                            being built.
                        </span>
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Link href="/archive" className="ha-btn-primary">
                            Browse demo archive
                        </Link>
                        <Link href="/methods" className="ha-btn-secondary">
                            Methods &amp; scope
                        </Link>
                    </div>
                </div>

                {/* Side card */}
                <div className="ha-card ha-card-elevated p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Project snapshot
                            </h2>
                            <p className="text-xs text-ha-muted">
                                Prototype archive for selected federal public
                                health pages.
                            </p>
                        </div>
                        <span className="ha-badge ha-badge-amber">
                            Demo phase
                        </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-4 text-xs sm:text-sm">
                        <div>
                            <dt className="text-ha-muted">Sample records</dt>
                            <dd className="text-lg font-semibold text-slate-900">
                                {recordCount}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-ha-muted">Federal sources</dt>
                            <dd className="text-lg font-semibold text-slate-900">
                                {sourceCount}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-ha-muted">Focus</dt>
                            <dd className="text-xs text-slate-900">
                                COVID-19, influenza, HIV, climate, food safety,
                                water quality, and more.
                            </dd>
                        </div>
                        <div>
                            <dt className="text-ha-muted">Intended users</dt>
                            <dd className="text-xs text-slate-900">
                                Clinicians, public health practitioners,
                                researchers, and data- curious members of the
                                public.
                            </dd>
                        </div>
                    </dl>
                </div>
            </section>

            {/* Who this is for */}
            <section className="space-y-4 pb-2">
                <h2 className="ha-section-heading">Who is this for?</h2>
                <p className="ha-section-subtitle max-w-3xl">
                    The archive aims to support a range of people who rely on
                    public health information being stable and discoverable over
                    time.
                </p>
                <div className="ha-grid-3 pt-1">
                    <div className="ha-card p-4 sm:p-5">
                        <h3 className="text-sm font-semibold text-slate-900">
                            Clinicians &amp; public health practitioners
                        </h3>
                        <p className="mt-2 text-xs text-ha-muted sm:text-sm">
                            Revisit past guidance on topics such as COVID-19
                            vaccination, seasonal influenza, naloxone
                            distribution, or mpox to understand how
                            recommendations have evolved.
                        </p>
                    </div>
                    <div className="ha-card p-4 sm:p-5">
                        <h3 className="text-sm font-semibold text-slate-900">
                            Researchers &amp; data journalists
                        </h3>
                        <p className="mt-2 text-xs text-ha-muted sm:text-sm">
                            Link analyses and publications to the exact wording,
                            tables, and dashboards that were visible on a given
                            date, improving reproducibility and auditability.
                        </p>
                    </div>
                    <div className="ha-card p-4 sm:p-5">
                        <h3 className="text-sm font-semibold text-slate-900">
                            Members of the public
                        </h3>
                        <p className="mt-2 text-xs text-ha-muted sm:text-sm">
                            Explore how key public health messages and risk
                            communication have changed across time while keeping
                            official sites as the primary source of up-to-date
                            guidance.
                        </p>
                    </div>
                </div>
            </section>

            {/* Short explainer */}
            <section className="grid gap-6 pb-4 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1.2fr)]">
                <div className="space-y-3">
                    <h2 className="ha-section-heading">
                        What is HealthArchive.ca?
                    </h2>
                    <p className="text-sm leading-relaxed text-ha-muted">
                        HealthArchive.ca is an independent, non-governmental
                        archive of Canadian public health information. It uses
                        modern web-archiving tools to capture, store, and replay
                        snapshots of key public health websites, starting with
                        federal sources such as the Public Health Agency of
                        Canada and Health Canada.
                    </p>
                    <p className="text-sm leading-relaxed text-ha-muted">
                        Government websites are living documents: pages move,
                        content changes, and dashboards appear and disappear.
                        The goal is to provide transparent, verifiable access to
                        previously public health information—not to replace
                        official guidance or offer medical advice.
                    </p>
                    <div className="pt-1">
                        <Link
                            href="/methods"
                            className="inline-flex text-xs font-medium text-ha-accent hover:text-blue-700"
                        >
                            Read more about methods &amp; coverage →
                        </Link>
                    </div>
                </div>
                <div className="ha-callout">
                    <h3 className="ha-callout-title">
                        What this demo is (and isn&apos;t)
                    </h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed sm:text-sm">
                        <li>
                            <strong>Is:</strong> a small, hand-curated demo
                            showing how the future archive explorer and snapshot
                            viewer will behave.
                        </li>
                        <li>
                            <strong>Is not:</strong> a complete or authoritative
                            copy of any public health site. Coverage is
                            intentionally small and will be documented
                            transparently as the project grows.
                        </li>
                        <li>
                            For current guidance, always refer to the relevant
                            official websites (e.g.,{" "}
                            <span className="font-medium">
                                canada.ca/public-health
                            </span>
                            ).
                        </li>
                    </ul>
                </div>
            </section>
        </div>
    );
}
