import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import type { Locale } from "@/lib/i18n";

export function Footer({ locale }: { locale: Locale }) {
  const year = new Date().getFullYear();

  return (
    <footer className="ha-shell-footer">
      <div className="ha-container text-ha-muted space-y-4 py-6 text-xs sm:flex sm:flex-col">
        <div className="space-y-1">
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-800">
              {locale === "fr"
                ? "Indépendance et absence d’affiliation"
                : "Independence and non-affiliation"}
            </span>
            :{" "}
            {locale === "fr"
              ? "HealthArchive.ca est un projet indépendant et n’est pas affilié à, endossé par, ni associé à l’Agence de la santé publique du Canada, à Santé Canada, ni à aucun organisme gouvernemental."
              : "HealthArchive.ca is an independent project and is not affiliated with, endorsed by, or associated with the Public Health Agency of Canada, Health Canada, or any other government agency."}
          </p>
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-800">
              {locale === "fr" ? "Interprétation et utilisation" : "Interpretation and use"}
            </span>
            :{" "}
            {locale === "fr"
              ? "Le contenu archivé est fourni à des fins de référence et de recherche uniquement. Il peut être incomplet, périmé ou remplacé. Rien sur ce site ne doit être interprété comme un avis médical ou des directives actuelles."
              : "Archived content is provided for reference and research purposes only. It may be incomplete, outdated, or superseded. Nothing on this site should be interpreted as medical advice or current guidance."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/governance">
            {locale === "fr" ? "Gouvernance" : "Governance"}
          </Link>
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/status">
            {locale === "fr" ? "Statut" : "Status"}
          </Link>
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/impact">
            {locale === "fr" ? "Impact" : "Impact"}
          </Link>
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/brief">
            {locale === "fr" ? "Fiche" : "Brief"}
          </Link>
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/cite">
            {locale === "fr" ? "Citer" : "Cite"}
          </Link>
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/exports">
            {locale === "fr" ? "Exports" : "Exports"}
          </Link>
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/changes">
            {locale === "fr" ? "Changements" : "Changes"}
          </Link>
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/digest">
            {locale === "fr" ? "Bulletin" : "Digest"}
          </Link>
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/terms">
            {locale === "fr" ? "Conditions" : "Terms"}
          </Link>
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/privacy">
            {locale === "fr" ? "Confidentialité" : "Privacy"}
          </Link>
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/changelog">
            {locale === "fr" ? "Journal des changements" : "Changelog"}
          </Link>
          <Link className="text-ha-accent font-medium hover:text-blue-700" href="/report">
            {locale === "fr" ? "Signaler un problème" : "Report an issue"}
          </Link>
        </div>
        <div className="text-ha-muted flex flex-col gap-1 text-[11px] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} HealthArchive.ca Project.{" "}
            <span className="font-medium text-slate-800">
              {locale === "fr"
                ? "Ce n’est pas un site gouvernemental officiel."
                : "Not an official government website."}
            </span>
          </p>
          <p className="text-[11px]">
            {locale === "fr" ? (
              <>
                Ce site est <span className="font-medium text-amber-800">en développement</span>. La
                couverture, les données et les fonctionnalités sont incomplètes et peuvent changer.
              </>
            ) : (
              <>
                This site is <span className="font-medium text-amber-800">in development</span>.{" "}
                Coverage, data, and functionality are incomplete and subject to change.
              </>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
