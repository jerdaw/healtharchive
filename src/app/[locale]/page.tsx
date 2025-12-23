import { demoRecords } from "@/data/demo-records";
import { TrackChangesPhrase } from "@/components/TrackChangesPhrase";
import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { AnimatedMetric } from "@/components/home/AnimatedMetric";
import { HoverGlowLink } from "@/components/home/HoverGlowLink";
import { ProjectSnapshotOrchestrator } from "@/components/home/ProjectSnapshotOrchestrator";
import { fetchArchiveStats } from "@/lib/api";
import { resolveLocale } from "@/lib/resolveLocale";
import { getSiteCopy } from "@/lib/siteCopy";

export default async function HomePage({
  params,
}: {
  params?: Promise<{ locale: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const siteCopy = getSiteCopy(locale);
  const fallbackRecordCount = demoRecords.length;
  const fallbackPageCount = new Set(demoRecords.map((r) => r.originalUrl)).size;

  const stats = await fetchArchiveStats().catch(() => null);
  const usingBackendStats = stats != null;
  const recordCount = stats?.snapshotsTotal ?? fallbackRecordCount;
  const pageCount = stats?.pagesTotal ?? fallbackPageCount;

  return (
    <div className="ha-container space-y-14 pt-3 sm:pt-4">
      {/* Hero */}
      <section>
        <div className="ha-home-hero grid gap-10 lg:grid-cols-[minmax(0,1.7fr),minmax(0,1fr)] lg:items-center">
          <div className="space-y-9">
            <p className="ha-eyebrow ha-home-hero-eyebrow">
              {locale === "fr"
                ? "Archive de santé publique basée sur des captures"
                : "Snapshot-based public health archive"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-[2.6rem] md:leading-snug">
              {locale === "fr" ? (
                <>
                  Voyez ce que les sites Web de santé publique au Canada{" "}
                  <span className="text-ha-accent">disaient autrefois</span>,
                  <span className="block sm:inline">
                    {" "}
                    même <TrackChangesPhrase /> qu’ils changent.
                  </span>
                </>
              ) : (
                <>
                  See what Canadian public health websites{" "}
                  <span className="text-ha-accent">used to say</span>,
                  <span className="block sm:inline">
                    {" "}
                    even <TrackChangesPhrase /> they change.
                  </span>
                </>
              )}
            </h1>
            <p className="text-ha-muted ha-home-hero-lede text-sm leading-relaxed sm:text-base">
              {locale === "fr"
                ? "HealthArchive.ca est un projet indépendant, porté par des bénévoles, qui préserve des captures horodatées de pages Web de santé publique canadiennes sélectionnées. Il aide les chercheurs, journalistes, éducateurs, cliniciens et le grand public à citer ce qui a été publié à des moments précis — même si les pages sont déplacées, mises à jour ou disparaissent."
                : "HealthArchive.ca is an independent, volunteer-led project that preserves time-stamped snapshots of selected Canadian public health web pages. It helps researchers, journalists, educators, clinicians, and the public cite what was published at specific points in time—even if pages move, are updated, or disappear."}
            </p>
            <div className="ha-home-hero-meta text-ha-muted pt-1 text-xs">
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold tracking-wide text-amber-800 uppercase">
                {locale === "fr" ? "En développement" : "In development"}
              </span>
              <span className="ha-home-hero-meta-text">
                {locale === "fr"
                  ? "La couverture et les fonctionnalités s’élargissent; le contenu archivé peut être incomplet, périmé ou remplacé."
                  : "Coverage and features are expanding; archived content may be incomplete, outdated, or superseded."}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <HoverGlowLink href="/archive">
                {locale === "fr" ? "Parcourir l’archive" : "Browse the archive"}
              </HoverGlowLink>
              <Link href="/methods" className="ha-btn-secondary">
                {locale === "fr" ? "Méthodes et portée" : "Methods & scope"}
              </Link>
            </div>
          </div>

          {/* Side card */}
          <div className="ha-card ha-card-elevated p-4 sm:p-5">
            <ProjectSnapshotOrchestrator expectedIds={["records", "pages"]} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {locale === "fr" ? "Aperçu du projet" : "Project snapshot"}
                </h2>
                <p className="text-ha-muted text-xs">
                  {usingBackendStats
                    ? locale === "fr"
                      ? "Métriques en direct depuis le backend de l’archive."
                      : "Live metrics from the archive backend."
                    : locale === "fr"
                      ? "Affichage d’un échantillon hors ligne limité pendant que l’API en direct est indisponible."
                      : "Showing a limited offline sample while the live API is unavailable."}
                </p>
              </div>
            </div>
            <dl className="ha-metric-grid ha-metric-grid-2 mt-4 text-xs sm:text-sm">
              <AnimatedMetric
                id="records"
                label={locale === "fr" ? "Captures archivées" : "Archived snapshots"}
                value={recordCount}
                unit={locale === "fr" ? "captures" : "snapshots"}
                barPercent={Math.min(100, (recordCount / 200_000) * 100)}
                start={false}
                startEvent="ha-trackchanges-finished"
                completeEvent="ha-metric-finished"
              />
              <AnimatedMetric
                id="pages"
                label={locale === "fr" ? "Pages uniques" : "Unique pages"}
                value={pageCount}
                unit={locale === "fr" ? "pages" : "pages"}
                barPercent={Math.min(100, (pageCount / 100_000) * 100)}
                start={false}
                startEvent="ha-trackchanges-finished"
                completeEvent="ha-metric-finished"
              />
            </dl>
          </div>
        </div>
      </section>

      {/* Who this is for */}
      <section>
        <div className="ha-home-hero space-y-7">
          <h2 className="ha-section-heading">
            {locale === "fr" ? "À qui s’adresse ce site ?" : "Who is this for?"}
          </h2>
          <p className="ha-section-subtitle ha-section-lede leading-relaxed">
            {locale === "fr"
              ? "L’archive est conçue d’abord pour les chercheurs, journalistes et éducateurs, et est aussi utile aux cliniciens et au grand public qui ont besoin d’anciennes directives de santé publique afin qu’elles restent citables et repérables au fil des changements des sites Web."
              : "The archive is designed first for researchers, journalists, and educators, and is also useful for clinicians and the public who need past public health guidance to stay citable and discoverable as websites shift over time."}
          </p>
          <div className="ha-grid-3 gap-4 pt-5 md:gap-5 md:pt-6">
            <div className="ha-card ha-audience-card p-4 sm:p-5">
              <div className="ha-audience-card-inner">
                <span className="ha-audience-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path d="M9.5 7a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z" />
                    <path d="M7 14.5a4.5 4.5 0 0 1 9 0V17H7z" />
                    <path d="M16 10.8 18.2 12l2.3-1.2v2.9c0 1.35-.78 2.52-2.3 3.2-1.52-.68-2.3-1.85-2.3-3.2z" />
                  </svg>
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  {locale === "fr"
                    ? "Cliniciens et praticiens de santé publique"
                    : "Clinicians & public health practitioners"}
                </h3>
              </div>
              <p className="ha-audience-body text-ha-muted text-sm sm:text-base">
                {locale === "fr"
                  ? "Revoir des directives passées sur des sujets comme la vaccination contre la COVID-19, la grippe saisonnière, la distribution de naloxone ou la variole simienne (mpox) afin de comprendre comment les recommandations ont évolué."
                  : "Revisit past guidance on subjects such as COVID-19 vaccination, seasonal influenza, naloxone distribution, or mpox to understand how recommendations have evolved."}
              </p>
            </div>
            <div className="ha-card ha-audience-card p-4 sm:p-5">
              <div className="ha-audience-card-inner">
                <span className="ha-audience-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path d="M5 17.5h14" />
                    <path d="M8.5 17.5v-5.5M12 17.5v-8M15.5 17.5v-3.5" />
                    <path d="M7 10l3-2.5 2.5 2 3.5-3.5" />
                    <path d="M15 5.5h3v3" />
                  </svg>
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  {locale === "fr"
                    ? "Chercheurs et journalistes de données"
                    : "Researchers & data journalists"}
                </h3>
              </div>
              <p className="ha-audience-body text-ha-muted text-sm sm:text-base">
                {locale === "fr"
                  ? "Relier les analyses et publications au libellé exact, aux tableaux et aux tableaux de bord visibles à une date donnée, afin d’améliorer la reproductibilité et la vérifiabilité."
                  : "Link analyses and publications to the exact wording, tables, and dashboards that were visible on a given date, improving reproducibility and auditability."}
              </p>
            </div>
            <div className="ha-card ha-audience-card p-4 sm:p-5">
              <div className="ha-audience-card-inner">
                <span className="ha-audience-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path d="M7 9.5h6.5a3.5 3.5 0 1 1 0 7H11l-2.5 2v-2H7a3.5 3.5 0 1 1 0-7Z" />
                    <path d="M9 12h4.5" />
                    <path d="M9 14.2h2.5" />
                  </svg>
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  {locale === "fr" ? "Grand public" : "Members of the public"}
                </h3>
              </div>
              <p className="ha-audience-body text-ha-muted text-sm sm:text-base">
                {locale === "fr"
                  ? "Explorer comment les messages clés de santé publique et la communication des risques ont changé au fil du temps, tout en gardant les sites officiels comme source principale des directives à jour."
                  : "Explore how key public health messages and risk communication have changed across time while keeping official sites as the primary source of up-to-date guidance."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Short explainer */}
      <section>
        <div className="ha-home-hero grid gap-8 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1.2fr)]">
          <div className="space-y-7">
            <h2 className="ha-section-heading">
              {locale === "fr" ? "Qu’est-ce que HealthArchive.ca ?" : "What is HealthArchive.ca?"}
            </h2>
            <p className="ha-section-subtitle ha-section-lede mb-12 leading-relaxed sm:mb-14">
              {locale === "fr"
                ? "HealthArchive.ca est une archive indépendante et non gouvernementale de contenu Web de santé publique au Canada. Elle utilise des outils modernes d’archivage Web pour capturer, stocker et relire des captures de sites de santé publique clés, en commençant par des sources fédérales comme l’Agence de la santé publique du Canada et Santé Canada."
                : "HealthArchive.ca is an independent, non-governmental archive of Canadian public health web content. It uses modern web-archiving tools to capture, store, and replay snapshots of key public health websites, starting with federal sources such as the Public Health Agency of Canada and Health Canada."}
            </p>
            <p className="text-ha-muted mt-4 text-sm leading-relaxed sm:mt-6 sm:text-base">
              {locale === "fr"
                ? "Les sites gouvernementaux sont des documents vivants : les pages se déplacent, le contenu change et des tableaux de bord apparaissent et disparaissent. HealthArchive existe pour préserver un dossier transparent et vérifiable de ce qui était public à un moment donné — pas pour remplacer les directives officielles ou offrir un avis médical."
                : "Government websites are living documents: pages move, content changes, and dashboards appear and disappear. HealthArchive exists to preserve a transparent, verifiable record of what was publicly available at a point in time—not to replace official guidance or offer medical advice."}
            </p>
            <div className="pt-2">
              <Link
                href="/methods"
                className="text-ha-accent inline-flex text-xs font-medium hover:text-blue-700"
              >
                {locale === "fr"
                  ? "En savoir plus sur les méthodes et la couverture →"
                  : "Read more about methods & coverage →"}
              </Link>
            </div>
          </div>
          <div className="ha-card ha-card-elevated space-y-3 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900">
              {locale === "fr"
                ? "Ce que ce site est (et n’est pas)"
                : "What this site is (and isn&apos;t)"}
            </h3>
            <ul className="text-ha-muted list-disc space-y-2 pl-5 text-xs leading-relaxed sm:text-sm">
              <li>
                <strong>{locale === "fr" ? "Est :" : "Is:"}</strong> {siteCopy.whatThisSiteIs.is}
              </li>
              <li>
                <strong>{locale === "fr" ? "N’est pas :" : "Is not:"}</strong>{" "}
                {siteCopy.whatThisSiteIs.isNot}
              </li>
              <li>
                {locale === "fr"
                  ? "La couverture est encore en expansion. Si vous ne trouvez pas une page, elle n’a peut-être pas encore été capturée."
                  : "Coverage is still expanding. If you can&apos;t find a page, it may not have been captured yet."}
              </li>
              <li>
                {siteCopy.whatThisSiteIs.forCurrent} (
                {locale === "fr" ? (
                  <>
                    p. ex. <span className="font-medium">canada.ca/sante-publique</span>
                  </>
                ) : (
                  <>
                    e.g., <span className="font-medium">canada.ca/public-health</span>
                  </>
                )}
                ).
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
