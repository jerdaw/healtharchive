import type { Locale } from "@/lib/i18n";
import { getHomeCopy } from "@/lib/homeCopy";

type Props = { locale: Locale };

export function FAQ({ locale }: Props) {
  const copy = getHomeCopy(locale);

  return (
    <section>
      <div className="ha-home-hero ha-home-hero-plain space-y-7">
        <h2 className="ha-section-heading">{copy.faq.heading}</h2>
        <div className="space-y-3">
          {copy.faq.items.map((item, i) => (
            <details className="ha-faq-item" key={i}>
              <summary className="ha-faq-question">{item.q}</summary>
              <p className="ha-faq-answer">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
