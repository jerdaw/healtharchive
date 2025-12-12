import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact & follow"
      title="Staying in touch with the project"
      intro="HealthArchive.ca is currently a volunteer-led effort in an early demo phase. If you are interested in following the work or exploring collaboration, the options below are a starting point."
    >
      <section className="ha-home-hero space-y-6">
        <div className="ha-grid-2 gap-4 sm:gap-5">
          <div className="ha-card ha-home-panel p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="ha-audience-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M7.5 8a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Z" />
                  <path d="M4.5 18.5c0-3.2 2.8-5 7-5s7 1.8 7 5" />
                </svg>
              </span>
              <h2 className="text-sm font-semibold text-slate-900">
                Email (placeholder)
              </h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
              For now, the simplest way to express interest or ask questions is by
              email.
            </p>
            <p className="text-sm sm:text-base">
              <a
                href="mailto:contact@healtharchive.ca"
                className="font-medium text-ha-accent hover:text-blue-700"
              >
                contact@healtharchive.ca
              </a>
            </p>
            <p className="text-xs sm:text-sm text-ha-muted leading-relaxed">
              Please note that this address may change as the project&apos;s
              governance and infrastructure evolve.
            </p>
          </div>

          <div className="ha-card ha-home-panel p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="ha-audience-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M5 20V9l7-5 7 5v11" />
                  <path d="M9 18v-6h6v6" />
                  <path d="M3 9l9 6 9-6" />
                </svg>
              </span>
              <h2 className="text-sm font-semibold text-slate-900">
                GitHub repository
              </h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-ha-muted">
              The frontend you are viewing is open source. If you&apos;re
              comfortable with GitHub, you can watch the repository to follow
              changes.
            </p>
            <p className="text-sm sm:text-base">
              <Link
                href="https://github.com/jerdaw/healtharchive-frontend"
                className="font-medium text-ha-accent hover:text-blue-700"
              >
                github.com/jerdaw/healtharchive-frontend
              </Link>
            </p>
            <p className="text-xs sm:text-sm text-ha-muted leading-relaxed">
              Contributions are welcome, particularly from people with experience
              in web archiving, public health, or accessible interface design.
              Please open an issue first to discuss substantial changes.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
