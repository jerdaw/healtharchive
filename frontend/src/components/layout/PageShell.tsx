import type { ReactNode } from "react";

interface PageShellProps {
  title: string;
  intro?: string;
  eyebrow?: string;
  compact?: boolean;
  hideHeaderVisually?: boolean;
  children: ReactNode;
}

export function PageShell({
  title,
  intro,
  eyebrow,
  compact = false,
  hideHeaderVisually = false,
  children,
}: PageShellProps) {
  const sectionClassName = compact ? "pt-6 pb-8" : "pt-6 pb-10";
  const headerClassName = [
    compact ? (intro ? "mb-4" : "mb-6") : intro ? "mb-5" : "mb-8",
    compact ? "max-w-3xl space-y-2" : "max-w-3xl space-y-3",
  ].join(" ");
  const contentClassName = "space-y-[1.125rem]";
  const introCardClassName = compact
    ? "ha-page-intro-card ha-page-intro-card-compact"
    : "ha-page-intro-card";

  return (
    <div className="ha-container">
      <section className={sectionClassName}>
        <header className={hideHeaderVisually ? "sr-only" : headerClassName}>
          {eyebrow && <p className="ha-eyebrow">{eyebrow}</p>}
          <h1 className="ha-page-title text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
        </header>
        <div className={contentClassName}>
          {!hideHeaderVisually && intro && (
            <section className={introCardClassName}>
              <p className="text-ha-muted text-sm leading-relaxed sm:text-base">{intro}</p>
            </section>
          )}
          {children}
        </div>
      </section>
    </div>
  );
}
