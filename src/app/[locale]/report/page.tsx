import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

import { PageShell } from "@/components/layout/PageShell";
import { ReportIssueForm } from "@/components/report/ReportIssueForm";
import { resolveLocale } from "@/lib/resolveLocale";

type ReportSearchParams = {
  snapshot?: string;
  url?: string;
  page?: string;
};

export default async function ReportPage({
  params,
  searchParams,
}: {
  params?: Promise<{ locale: string }>;
  searchParams: Promise<ReportSearchParams>;
}) {
  const locale = await resolveLocale(params);
  const query = await searchParams;
  const snapshotId = query.snapshot ? Number(query.snapshot) : null;
  const initialSnapshotId = Number.isFinite(snapshotId) ? snapshotId : null;
  const initialOriginalUrl = query.url?.trim() || null;
  const initialPageUrl = query.page?.trim() || null;

  return (
    <PageShell
      eyebrow={locale === "fr" ? "Signalement" : "Report"}
      title={locale === "fr" ? "Signaler un problème" : "Report an issue"}
      intro={
        locale === "fr"
          ? "Utilisez ce formulaire pour signaler des captures ou relectures défectueuses, des erreurs de métadonnées, des pages manquantes ou des demandes de retrait. Veuillez ne pas soumettre d’informations personnelles ou médicales."
          : "Use this form to report broken snapshots, metadata errors, missing pages, or takedown requests. Please do not submit personal or personal health information."
      }
    >
      <section className="ha-home-hero space-y-4">
        <h2 className="ha-section-heading">
          {locale === "fr" ? "Étapes suivantes" : "What happens next"}
        </h2>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Les signalements sont examinés par les responsables du projet. Nous pouvons faire un suivi par courriel si vous fournissez des coordonnées. Pour les préoccupations urgentes liées à l’étiquetage de sécurité, nous priorisons l’examen dans un délai de 48 heures."
            : "Reports are reviewed by the project maintainers. We may follow up by email if you provide contact information. For urgent safety labeling concerns, we prioritize review within 48 hours."}
        </p>
        <p className="text-ha-muted text-sm leading-relaxed sm:text-base">
          {locale === "fr"
            ? "Vous pouvez aussi nous joindre directement à "
            : "You can also reach us directly at "}{" "}
          <a
            href="mailto:contact@healtharchive.ca"
            className="text-ha-accent font-medium hover:text-blue-700"
          >
            contact@healtharchive.ca
          </a>
          .
        </p>
      </section>

      <ReportIssueForm
        initialSnapshotId={initialSnapshotId}
        initialOriginalUrl={initialOriginalUrl}
        initialPageUrl={initialPageUrl}
      />

      <section className="ha-home-hero ha-home-hero-plain space-y-4">
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Vous cherchez les politiques ?" : "Looking for policies?"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            {locale === "fr"
              ? "Consultez la page Gouvernance pour la portée, les corrections et les politiques de retrait."
              : "See the governance page for scope, corrections, and takedown policies."}
          </p>
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            <Link href="/governance" className="text-ha-accent font-medium hover:text-blue-700">
              {locale === "fr"
                ? "Lire la gouvernance et les politiques"
                : "Read governance & policies"}
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
