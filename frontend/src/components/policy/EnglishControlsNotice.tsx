import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import type { Locale } from "@/lib/i18n";

export function EnglishControlsNotice({ locale }: { locale: Locale }) {
  return (
    <div className="ha-callout" data-testid="english-controls-notice">
      <h2 className="ha-callout-title">
        {locale === "fr"
          ? "L’anglais fait foi (English version governs)"
          : "English version governs"}
      </h2>
      <p className="mt-2 text-xs leading-relaxed sm:text-sm">
        {locale === "fr"
          ? "La version anglaise de cette page est la version officielle. Si une traduction française est fournie, elle l’est uniquement pour des raisons de commodité. En cas d’incohérence ou de divergence, la version anglaise prévaut."
          : "The English version of this page is the official version. If a French translation is provided, it is for convenience only. In the event of any inconsistency or discrepancy, the English version governs."}
      </p>
      <p className="mt-3 text-xs leading-relaxed sm:text-sm">
        {locale === "fr"
          ? "Vous remarquez un problème de traduction?"
          : "Notice a translation issue?"}{" "}
        <Link href="/contact" className="ha-link">
          {locale === "fr" ? "Contacter le projet" : "Contact the project"}
        </Link>
        .
      </p>
    </div>
  );
}
