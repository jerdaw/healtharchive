"use client";

import { useParams } from "next/navigation";

import { PageShell } from "@/components/layout/PageShell";
import { getErrorRecoveryCopy } from "@/lib/errorRecovery";
import { isLocale, localizeHref } from "@/lib/i18n";

type SegmentErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SegmentError({ error, reset }: SegmentErrorProps) {
  void error;
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale && isLocale(params.locale) ? params.locale : "en";
  const copy = getErrorRecoveryCopy(locale);

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      <section
        className="ha-card space-y-4"
        role="alert"
        aria-labelledby="error-recovery-actions-title"
      >
        <div className="space-y-2">
          <h2 id="error-recovery-actions-title" className="ha-card-title text-lg">
            {copy.actionsTitle}
          </h2>
          <p className="ha-card-body text-ha-muted">{copy.explanation}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="ha-btn-primary" onClick={reset}>
            {copy.retry}
          </button>
          <a className="ha-btn-secondary" href={localizeHref(locale, "/")}>
            {copy.home}
          </a>
        </div>
        <p className="text-ha-muted text-sm leading-relaxed">{copy.boundaryNote}</p>
      </section>
    </PageShell>
  );
}
