"use client";

import type { CSSProperties } from "react";

import { getErrorRecoveryCopy } from "@/lib/errorRecovery";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

type GlobalErrorContentProps = Pick<GlobalErrorProps, "reset">;

const styles = {
  body: {
    margin: 0,
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#172033",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  main: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "2rem 1rem",
    boxSizing: "border-box",
  },
  panel: {
    width: "min(100%, 42rem)",
    padding: "clamp(1.5rem, 4vw, 2.5rem)",
    border: "1px solid #cbd5e1",
    borderRadius: "1rem",
    background: "#ffffff",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.12)",
  },
  brand: {
    margin: "0 0 0.75rem",
    color: "#1d4ed8",
    fontSize: "0.82rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
    lineHeight: 1.15,
  },
  titleTranslation: {
    display: "block",
    marginTop: "0.4rem",
    fontSize: "0.65em",
    color: "#475569",
  },
  copy: {
    margin: "1rem 0 0",
    lineHeight: 1.65,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginTop: "1.5rem",
  },
  primaryAction: {
    padding: "0.65rem 1.2rem",
    border: "1px solid #1d4ed8",
    borderRadius: "999px",
    background: "#1d4ed8",
    color: "#ffffff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 600,
  },
  secondaryAction: {
    padding: "0.65rem 1.2rem",
    border: "1px solid #94a3b8",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#172033",
    fontWeight: 600,
    textDecoration: "none",
  },
  note: {
    margin: "1.5rem 0 0",
    paddingTop: "1rem",
    borderTop: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: "0.9rem",
    lineHeight: 1.55,
  },
} satisfies Record<string, CSSProperties>;

export function GlobalErrorContent({ reset }: GlobalErrorContentProps) {
  const english = getErrorRecoveryCopy("en");
  const french = getErrorRecoveryCopy("fr");

  return (
    <main id="main-content" style={styles.main}>
      <section style={styles.panel} role="alert" aria-labelledby="global-error-title">
        <p style={styles.brand}>HealthArchive.ca</p>
        <h1 id="global-error-title" style={styles.title}>
          Something went wrong
          <span lang="fr-CA" style={styles.titleTranslation}>
            Un problème est survenu
          </span>
        </h1>
        <p style={styles.copy}>{english.explanation}</p>
        <p lang="fr-CA" style={styles.copy}>
          {french.explanation}
        </p>
        <div style={styles.actions}>
          <button type="button" style={styles.primaryAction} onClick={reset}>
            Try again / Réessayer
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Global recovery must not depend on the failed router/layout tree. */}
          <a href="/" style={styles.secondaryAction}>
            Return home / Accueil
          </a>
        </div>
        <p style={styles.note}>
          {english.boundaryNote}
          <br />
          <span lang="fr-CA">{french.boundaryNote}</span>
        </p>
      </section>
    </main>
  );
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  void error;

  return (
    <html lang="en">
      <body style={styles.body}>
        <style>{`button:focus-visible,a:focus-visible{outline:3px solid #f59e0b;outline-offset:3px}`}</style>
        <GlobalErrorContent reset={reset} />
      </body>
    </html>
  );
}
