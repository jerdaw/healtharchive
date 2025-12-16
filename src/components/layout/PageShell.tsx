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
  const sectionClassName = hideHeaderVisually
    ? compact
      ? "pt-2 pb-8"
      : "pt-4 pb-10"
    : compact
      ? "pt-4 pb-8"
      : "pt-6 pb-10";
  const headerClassName = compact
    ? "mb-6 max-w-3xl space-y-2"
    : "mb-8 max-w-3xl space-y-3";
  const contentClassName = compact ? "space-y-6" : "space-y-8";

  return (
    <div className="ha-container">
      <section className={sectionClassName}>
        <header className={hideHeaderVisually ? "sr-only" : headerClassName}>
          {eyebrow && <p className="ha-eyebrow">{eyebrow}</p>}
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {intro && (
            <p className="text-sm leading-relaxed text-ha-muted sm:text-base">
              {intro}
            </p>
          )}
        </header>
        <div className={contentClassName}>{children}</div>
      </section>
    </div>
  );
}
