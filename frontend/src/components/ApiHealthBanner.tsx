"use client";

import { useEffect, useState } from "react";
import { fetchHealth, getApiBaseUrl } from "@/lib/api";
import { getArchiveCopy } from "@/lib/archiveCopy";

import { useLocale } from "@/components/i18n/LocaleProvider";

const ENABLE_HEALTH_BANNER = process.env.NEXT_PUBLIC_SHOW_API_HEALTH_BANNER === "true";
const LOG_HEALTH_FAILURE = process.env.NEXT_PUBLIC_LOG_API_HEALTH_FAILURE === "true";
const SHOW_API_BASE_HINT = process.env.NEXT_PUBLIC_SHOW_API_BASE_HINT === "true";
const IS_DEV = process.env.NODE_ENV !== "production";
const IS_TEST = typeof process !== "undefined" && process.env.VITEST;

export function ApiHealthBanner() {
  const locale = useLocale();
  const copy = getArchiveCopy(locale).apiHealth;
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
      <h3 className="ha-callout-title">{copy.heading}</h3>
      <p className="text-xs leading-relaxed sm:text-sm">
        {copy.beforeApiBase}
        <code>NEXT_PUBLIC_API_BASE_URL</code>
        {copy.betweenSettings}
        <code>HEALTHARCHIVE_CORS_ORIGINS</code>
        {copy.afterCorsOrigins}
      </p>
    </div>
  );
}
