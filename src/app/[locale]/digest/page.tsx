import type { Metadata } from "next";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

import { PageShell } from "@/components/layout/PageShell";
import { fetchSources, getApiBaseUrl } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";

function getDigestCopy(locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: "Bulletin",
      title: "Bulletin des changements et RSS",
      intro: "Un bulletin léger des changements de texte archivés entre éditions.",
    };
  }

  return {
    eyebrow: "Digest",
    title: "Change digest & RSS",
    intro: "A lightweight digest of archived text changes between editions.",
  };
}

export async function generateMetadata({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const copy = getDigestCopy(locale);
  return buildPageMetadata(locale, "/digest", copy.title, copy.intro);
}

export default async function DigestPage({
  params,
}: {
  params?: Promise<{ locale?: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const copy = getDigestCopy(locale);
  const siteCopy = getSiteCopy(locale);

  const sourcesRes = await Promise.allSettled([fetchSources()]);
  const sources = sourcesRes[0].status === "fulfilled" ? sourcesRes[0].value : null;

  const apiBase = getApiBaseUrl();
  const globalRss = `${apiBase}/api/changes/rss`;

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      <section className="ha-home-hero space-y-4">
        <div className="ha-callout">
          <h2 className="ha-callout-title">
            {locale === "fr" ? "Ce qu’est le bulletin" : "What the digest is"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Le bulletin liste les pages dont le texte archivé a changé entre des captures. Il est descriptif seulement et n’interprète pas le sens ni ne fournit de directives. Ceci est une archive — pas des directives actuelles ni un avis médical. "
              : "The digest lists pages whose archived text changed between captures. It is descriptive only and does not interpret meaning or provide guidance. This is an archive — not current guidance or medical advice. "}
            {siteCopy.whatThisSiteIs.forCurrent}.
          </p>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Les bulletins reflètent des changements d’édition à édition. Les éditions annuelles sont capturées le 1er janvier (UTC) et les captures ponctuelles sont étiquetées lorsqu’elles surviennent. Cela n’implique pas une surveillance en temps réel."
              : "Digests reflect edition-to-edition changes. Annual editions are captured on Jan 01 (UTC), and any ad-hoc captures are labeled when they occur. This does not imply real-time monitoring."}
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            {locale === "fr" ? "Pour des conseils de citation, voir" : "For citation guidance, see"}{" "}
            <Link href="/cite" className="text-ha-accent font-medium hover:text-blue-700">
              /cite
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">{locale === "fr" ? "Flux RSS" : "RSS feeds"}</h2>
        <div className="ha-card space-y-2">
          <p className="text-ha-muted text-xs">
            {locale === "fr" ? "Changements de la dernière édition" : "Latest edition changes"}
          </p>
          <a href={globalRss} className="text-ha-accent font-medium hover:text-blue-700">
            {locale === "fr" ? "Flux RSS global" : "Global RSS feed"}
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
                  <p className="text-ha-muted text-xs">{source.sourceName}</p>
                  <a href={rssUrl} className="text-ha-accent font-medium hover:text-blue-700">
                    {locale === "fr" ? "Flux RSS" : "RSS feed"}
                  </a>
                  <p className="text-ha-muted text-xs">
                    {locale === "fr"
                      ? "Suit les changements entre les dernières éditions archivées."
                      : "Tracks changes between the latest archived editions."}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ha-callout">
            <p className="text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Les flux RSS par source apparaîtront une fois le backend disponible."
                : "Source-specific RSS feeds will appear once the backend is available."}
            </p>
          </div>
        )}
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Prochaines étapes" : "Next steps"}
        </h2>
        <p className="text-ha-muted text-sm">
          {locale === "fr"
            ? "Les bulletins par courriel sont volontairement reportés jusqu’à ce que le suivi des changements soit stable et que les flux RSS soient utilisés régulièrement."
            : "Email digests are intentionally deferred until change tracking is stable and the RSS feeds are in steady use."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/changes" className="ha-btn-secondary text-xs">
            {locale === "fr" ? "Voir le fil des changements" : "View changes feed"}
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
