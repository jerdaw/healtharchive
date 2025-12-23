import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

import { PageShell } from "@/components/layout/PageShell";
import { changelogEntriesByLocale } from "@/content/changelog";
import { resolveLocale } from "@/lib/resolveLocale";

export default async function ChangelogPage({
  params,
}: {
  params?: Promise<{ locale: string }>;
} = {}) {
  const locale = await resolveLocale(params);
  const changelogEntries = changelogEntriesByLocale[locale];

  return (
    <PageShell
      eyebrow={locale === "fr" ? "Journal des modifications" : "Changelog"}
      title={locale === "fr" ? "Historique du projet" : "Project changelog"}
      intro={
        locale === "fr"
          ? "Un registre léger des mises à jour publiques, des politiques et des changements majeurs."
          : "A lightweight record of public-facing updates, policies, and major feature changes."
      }
    >
      <section className="space-y-6">
        {changelogEntries.map((entry) => (
          <article key={`${entry.date}-${entry.title}`} className="ha-card space-y-3">
            <div className="text-ha-muted flex flex-wrap items-center gap-2 text-xs">
              <span className="ha-tag">{entry.date}</span>
              <span className="font-medium text-slate-900">{entry.title}</span>
            </div>
            <ul className="text-ha-muted list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {entry.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Vous cherchez plus de détails ?" : "Looking for more detail?"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Le journal des modifications est un résumé destiné au public. Pour des détails techniques plus approfondis, consultez les dépôts du projet."
              : "The changelog is a public-facing summary. For deeper technical details, see the project repositories."}
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link
              href="https://github.com/jerdaw/healtharchive-frontend"
              className="text-ha-accent font-medium hover:text-blue-700"
            >
              {locale === "fr" ? "Dépôt frontend" : "Frontend repository"}
            </Link>{" "}
            {locale === "fr" ? "et" : "and"}{" "}
            <Link
              href="https://github.com/jerdaw/healtharchive-backend"
              className="text-ha-accent font-medium hover:text-blue-700"
            >
              {locale === "fr" ? "dépôt backend" : "backend repository"}
            </Link>{" "}
            {locale === "fr" ? "et" : "and"}{" "}
            <Link
              href="https://github.com/jerdaw/healtharchive-datasets/releases"
              className="text-ha-accent font-medium hover:text-blue-700"
            >
              {locale === "fr" ? "versions des jeux de données" : "dataset releases"}
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
