import { PageShell } from "@/components/layout/PageShell";

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About the project"
      title="Why HealthArchive.ca exists"
      intro="This project grew out of concern that critical public health information can quietly change or disappear online. The goal is to create an independent, transparent record of what was published, when."
    >
      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">Motivation</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          Clinicians, public health practitioners, researchers, journalists, and
          members of the public rely on government websites for guidance and
          data. When web content is updated, moved, or removed, it can become
          difficult to reconstruct what information was available at a particular
          point in time.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          HealthArchive.ca is an attempt to address that problem for Canadian
          public health information by creating a stable, independently managed
          record of key pages and documents.
        </p>
      </section>

      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">Independence and non-partisanship</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          The project is independent and non-governmental. It does not speak for
          any public health agency, and it does not aim to replace official
          sources or to offer medical advice. Its focus is on preserving
          previously public information in a way that supports transparency,
          accountability, and research.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          The project also aims to maintain a non-partisan tone: the existence
          of an archive should not be read as a statement about the intentions
          or motivations of any particular organization or government.
        </p>
      </section>

      <section className="ha-home-hero space-y-5">
        <h2 className="ha-section-heading">Project status</h2>
        <p className="ha-section-subtitle ha-section-lede leading-relaxed">
          At this stage, HealthArchive.ca is an early technical demo. It
          illustrates how an archive explorer and snapshot viewer could behave,
          using a small set of hand-curated records. Crawl pipelines, storage
          strategies, and replay tooling are under active design and may change
          substantially before any production archive is launched.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
          As the project matures, the methods, governance, and sustainability
          plans will be documented in more detail, with explicit discussion of
          scope, limitations, and risks.
        </p>
      </section>
    </PageShell>
  );
}
