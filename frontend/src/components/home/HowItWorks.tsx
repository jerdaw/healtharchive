import type { Locale } from "@/lib/i18n";
import { getHomeCopy } from "@/lib/homeCopy";

type Props = { locale: Locale };

export function HowItWorks({ locale }: Props) {
  const copy = getHomeCopy(locale);

  const steps = [
    { n: 1, title: copy.howItWorks.step1Title, body: copy.howItWorks.step1Body },
    { n: 2, title: copy.howItWorks.step2Title, body: copy.howItWorks.step2Body },
    { n: 3, title: copy.howItWorks.step3Title, body: copy.howItWorks.step3Body },
  ];

  return (
    <section id="how-it-works">
      <div className="ha-home-hero ha-home-hero-plain space-y-7">
        <h2 className="ha-section-heading">{copy.howItWorks.heading}</h2>
        <p className="ha-section-subtitle">{copy.howItWorks.subtitle}</p>
        <div className="ha-grid-3 gap-4 pt-4 md:gap-5">
          {steps.map((step) => (
            <div className="ha-step-card" key={step.n}>
              <div className="ha-step-number">{step.n}</div>
              <h3 className="text-sm font-semibold text-[var(--text)]">{step.title}</h3>
              <p className="text-ha-muted text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
