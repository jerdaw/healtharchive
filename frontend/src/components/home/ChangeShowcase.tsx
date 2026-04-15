"use client";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getHomeCopy } from "@/lib/homeCopy";

const exampleDiff = {
  en: {
    before: [
      "Mpox vaccination is recommended for",
      "individuals at high risk of exposure,",
      "including men who have sex with men.",
    ],
    after: [
      "Mpox vaccination is recommended for",
      "individuals in communities where mpox",
      "is spreading, based on local risk assessment.",
    ],
  },
  fr: {
    before: [
      "La vaccination contre la variole simienne est",
      "recommandée pour les personnes à risque élevé",
      "d'exposition, y compris les HSH.",
    ],
    after: [
      "La vaccination contre la variole simienne est",
      "recommandée pour les personnes dans les",
      "communautés où elle se propage, selon l'évaluation locale.",
    ],
  },
} as const;

export function ChangeShowcase() {
  const locale = useLocale();
  const copy = getHomeCopy(locale);
  const diff = exampleDiff[locale];

  return (
    <section>
      <div className="ha-home-hero ha-home-hero-plain space-y-7">
        <h2 className="ha-section-heading">{copy.changeShowcase.heading}</h2>
        <p className="ha-section-subtitle">{copy.changeShowcase.subtitle}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Previous version */}
          <div className="ha-change-preview">
            <p className="ha-change-label">{copy.changeShowcase.beforeLabel}</p>
            <div className="ha-change-lines">
              <p className="ha-diff-line ha-diff-line-unchanged">{diff.before[0]}</p>
              <p className="ha-diff-line ha-diff-line-removed">{diff.before[1]}</p>
              <p className="ha-diff-line ha-diff-line-removed">{diff.before[2]}</p>
            </div>
          </div>

          {/* Updated version */}
          <div className="ha-change-preview">
            <p className="ha-change-label">{copy.changeShowcase.afterLabel}</p>
            <div className="ha-change-lines">
              <p className="ha-diff-line ha-diff-line-unchanged">{diff.after[0]}</p>
              <p className="ha-diff-line ha-diff-line-added">{diff.after[1]}</p>
              <p className="ha-diff-line ha-diff-line-added">{diff.after[2]}</p>
            </div>
          </div>
        </div>

        <p>
          <Link href="/changes" className="ha-link text-xs">
            {copy.changeShowcase.seeAll}
          </Link>
        </p>

        {/* Inline example story */}
        <div className="ha-example-story space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">{copy.exampleStory.heading}</h3>
          <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
            {copy.exampleStory.body}
          </p>
          <Link href="/snapshot/phac-2024-07-10-mpox-update" className="ha-link text-xs">
            {copy.exampleStory.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
