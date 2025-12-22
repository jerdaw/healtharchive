import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { changelogEntries } from "@/content/changelog";

export default function ChangelogPage() {
  return (
    <PageShell
      eyebrow="Changelog"
      title="Project changelog"
      intro="A lightweight record of public-facing updates, policies, and major feature changes."
    >
      <section className="space-y-6">
        {changelogEntries.map((entry) => (
          <article key={`${entry.date}-${entry.title}`} className="ha-card space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ha-muted">
              <span className="ha-tag">{entry.date}</span>
              <span className="font-medium text-slate-900">{entry.title}</span>
            </div>
            <ul className="list-disc pl-5 text-sm leading-relaxed text-ha-muted space-y-1">
              {entry.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">Looking for more detail?</h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            The changelog is a public-facing summary. For deeper technical
            details, see the project repositories.
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link
              href="https://github.com/jerdaw/healtharchive-frontend"
              className="font-medium text-ha-accent hover:text-blue-700"
            >
              Frontend repository
            </Link>
            {" "}and{" "}
            <Link
              href="https://github.com/jerdaw/healtharchive-backend"
              className="font-medium text-ha-accent hover:text-blue-700"
            >
              backend repository
            </Link>
            {" "}and{" "}
            <Link
              href="https://github.com/jerdaw/healtharchive-datasets/releases"
              className="font-medium text-ha-accent hover:text-blue-700"
            >
              dataset releases
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
