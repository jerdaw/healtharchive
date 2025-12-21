import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { fetchSources, getApiBaseUrl } from "@/lib/api";
import { siteCopy } from "@/lib/siteCopy";

export default async function DigestPage() {
  const sourcesRes = await Promise.allSettled([fetchSources()]);
  const sources =
    sourcesRes[0].status === "fulfilled" ? sourcesRes[0].value : null;

  const apiBase = getApiBaseUrl();
  const globalRss = `${apiBase}/api/changes/rss`;

  return (
    <PageShell
      eyebrow="Digest"
      title="Change digest & RSS"
      intro="A lightweight digest of archived text changes between editions."
    >
      <section className="ha-home-hero space-y-4">
        <div className="ha-callout">
          <h2 className="ha-callout-title">What the digest is</h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            The digest lists pages whose archived text changed between captures.
            It is descriptive only and does not interpret meaning or provide
            guidance. {siteCopy.whatThisSiteIs.forCurrent}
          </p>
        </div>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">RSS feeds</h2>
        <div className="ha-card space-y-2">
          <p className="text-xs text-ha-muted">Latest edition changes</p>
          <a
            href={globalRss}
            className="font-medium text-ha-accent hover:text-blue-700"
          >
            Global RSS feed
          </a>
        </div>

        {sources && sources.length > 0 ? (
          <div className="ha-grid-2">
            {sources.map((source) => {
              const rssUrl = `${apiBase}/api/changes/rss?source=${encodeURIComponent(
                source.sourceCode,
              )}`;
              return (
                <div key={source.sourceCode} className="ha-card space-y-2">
                  <p className="text-xs text-ha-muted">{source.sourceName}</p>
                  <a
                    href={rssUrl}
                    className="font-medium text-ha-accent hover:text-blue-700"
                  >
                    RSS feed
                  </a>
                  <p className="text-xs text-ha-muted">
                    Tracks changes between the latest archived editions.
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ha-callout">
            <p className="text-xs leading-relaxed sm:text-sm">
              Source-specific RSS feeds will appear once the backend is
              available.
            </p>
          </div>
        )}
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">Next steps</h2>
        <p className="text-sm text-ha-muted">
          Email digests are intentionally deferred until change tracking is
          stable and the RSS feeds are in steady use.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/changes" className="ha-btn-secondary text-xs">
            View changes feed
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
