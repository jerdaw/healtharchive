"use client";

import { useEffect, useState } from "react";
import { fetchHealth, getApiBaseUrl } from "@/lib/api";

import { useLocale } from "@/components/i18n/LocaleProvider";

const ENABLE_HEALTH_BANNER = process.env.NEXT_PUBLIC_SHOW_API_HEALTH_BANNER === "true";
const LOG_HEALTH_FAILURE = process.env.NEXT_PUBLIC_LOG_API_HEALTH_FAILURE === "true";
const SHOW_API_BASE_HINT = process.env.NEXT_PUBLIC_SHOW_API_BASE_HINT === "true";
const IS_DEV = process.env.NODE_ENV !== "production";
const IS_TEST = typeof process !== "undefined" && process.env.VITEST;

export function ApiHealthBanner() {
  const locale = useLocale();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  useEffect(() => {
    if (!IS_DEV || IS_TEST) return;

    if (!ENABLE_HEALTH_BANNER && !LOG_HEALTH_FAILURE) {
      console.info(
        "[healtharchive] API health banner/logging disabled. Set NEXT_PUBLIC_SHOW_API_HEALTH_BANNER=true or NEXT_PUBLIC_LOG_API_HEALTH_FAILURE=true in dev/staging to surface failures.",
      );
    }

    if (SHOW_API_BASE_HINT) {
      console.info(
        "[healtharchive] API base URL (from NEXT_PUBLIC_API_BASE_URL or default):",
        getApiBaseUrl(),
      );
    }
  }, []);

  useEffect(() => {
    if (!ENABLE_HEALTH_BANNER && !LOG_HEALTH_FAILURE) return;
    let cancelled = false;
    fetchHealth()
      .then(() => {
        if (!cancelled) setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          if (LOG_HEALTH_FAILURE) {
            console.warn(
              "[healtharchive] API health check failed. Verify NEXT_PUBLIC_API_BASE_URL.",
            );
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ENABLE_HEALTH_BANNER || status === "ok" || status === "idle") {
    return null;
  }

  return (
    <div className="ha-callout mb-4 border-amber-300 bg-amber-50 text-amber-900">
      <h3 className="ha-callout-title">
        {locale === "fr" ? "Backend inaccessible" : "Backend unreachable"}
      </h3>
      <p className="text-xs leading-relaxed sm:text-sm">
        {locale === "fr" ? (
          <>
            La vérification de santé de l’API a échoué. Assurez-vous que{" "}
            <code>NEXT_PUBLIC_API_BASE_URL</code> pointe vers un backend en cours d’exécution et que
            le paramètre <code>HEALTHARCHIVE_CORS_ORIGINS</code> du backend autorise l’origine de ce
            frontend.
          </>
        ) : (
          <>
            The API health check failed. Make sure <code>NEXT_PUBLIC_API_BASE_URL</code> points to a
            running backend and that the backend&apos;s <code>HEALTHARCHIVE_CORS_ORIGINS</code>{" "}
            setting allows this frontend origin.
          </>
        )}
      </p>
    </div>
  );
}
