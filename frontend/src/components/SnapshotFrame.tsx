"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";

const LOADING_OVERLAY_DELAY_MS = 1600;
const LONG_LOAD_NOTICE_SECONDS = 8;

type SnapshotFrameProps = {
  src: string;
  title: string;
  browseLink?: string;
  rawLink?: string;
  apiLink?: string;
  iframeClassName?: string;
};

type ReplayHeightMessage = {
  type?: unknown;
  height?: unknown;
};

export function SnapshotFrame({
  src,
  title,
  browseLink,
  rawLink,
  apiLink,
  iframeClassName,
}: SnapshotFrameProps) {
  return (
    <SnapshotFrameInner
      key={src}
      src={src}
      title={title}
      browseLink={browseLink}
      rawLink={rawLink}
      apiLink={apiLink}
      iframeClassName={iframeClassName}
    />
  );
}

function LoadingOverlay({ locale }: { locale: ReturnType<typeof useLocale> }) {
  const [isVisible, setIsVisible] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const showHandle = window.setTimeout(() => {
      setIsVisible(true);
    }, LOADING_OVERLAY_DELAY_MS);

    const tickHandle = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => {
      window.clearTimeout(showHandle);
      window.clearInterval(tickHandle);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="text-ha-muted pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--surface-bg)]/40 px-4 text-center text-xs">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] motion-reduce:animate-none"
      />
      <span className="font-medium">
        {locale === "fr" ? "Chargement de la capture…" : "Loading snapshot…"}
        {elapsedSeconds >= 1 ? ` (${elapsedSeconds}s)` : ""}
      </span>
      {elapsedSeconds >= LONG_LOAD_NOTICE_SECONDS ? (
        <span className="text-ha-muted">
          {locale === "fr"
            ? "Certaines captures peuvent prendre plus de temps à charger (WARC volumineux)."
            : "Some captures can take longer to load (large WARC)."}
        </span>
      ) : null}
    </div>
  );
}

function SnapshotFrameInner({
  src,
  title,
  browseLink,
  rawLink,
  apiLink,
  iframeClassName,
}: SnapshotFrameProps) {
  const locale = useLocale();
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [maxHeightPx, setMaxHeightPx] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const expectedOrigin = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return new URL(src, window.location.href).origin;
    } catch {
      return null;
    }
  }, [src]);

  const iframeClasses = iframeClassName ?? "h-[480px] w-full border-0 sm:h-[560px]";

  useEffect(() => {
    if (!expectedOrigin) return;

    const handler = (event: MessageEvent) => {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow) return;
      if (event.source !== frameWindow) return;
      if (event.origin !== expectedOrigin) return;

      const data = (event.data ?? null) as ReplayHeightMessage | null;
      if (!data || typeof data !== "object") return;
      if (data.type !== "haReplayHeight") return;

      const rawHeight = data.height;
      const parsedHeight =
        typeof rawHeight === "number"
          ? rawHeight
          : typeof rawHeight === "string"
            ? Number.parseFloat(rawHeight)
            : Number.NaN;

      if (!Number.isFinite(parsedHeight)) return;
      const nextHeight = Math.max(0, Math.floor(parsedHeight));
      if (nextHeight < 120) return;

      setMaxHeightPx(nextHeight);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [expectedOrigin]);

  return (
    <div className="relative h-full w-full">
      {status === "error" ? (
        <div className="text-ha-muted flex h-full min-h-[320px] items-center justify-center px-4 text-center text-xs sm:min-h-[560px] sm:text-sm">
          <div className="space-y-2">
            <p className="font-semibold text-[var(--text)]">
              {locale === "fr" ? "Contenu archivé indisponible" : "Archived content unavailable"}
            </p>
            <p>
              {locale === "fr"
                ? "Cette vue archivée n’a pas pu être chargée. Essayez de l’ouvrir dans un nouvel onglet ou de recharger cette page."
                : "This archived view failed to load. Try opening it in a new tab or reloading this page."}
            </p>
            <div className="flex justify-center gap-2 text-[11px] font-medium">
              {browseLink && (
                <a
                  href={browseLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ha-accent hover:text-ha-accent"
                >
                  {locale === "fr" ? "Ouvrir la page archivée →" : "Open archived page →"}
                </a>
              )}
              {rawLink && (
                <a
                  href={rawLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ha-accent hover:text-ha-accent"
                >
                  {locale === "fr" ? "Ouvrir le HTML brut →" : "Open raw HTML →"}
                </a>
              )}
              {apiLink && (
                <a
                  href={apiLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ha-accent hover:text-ha-accent"
                >
                  {locale === "fr" ? "Voir les métadonnées (JSON)" : "View metadata JSON"}
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          sandbox="allow-same-origin allow-scripts allow-forms"
          className={iframeClasses}
          style={maxHeightPx != null ? { maxHeight: `${maxHeightPx}px` } : undefined}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}
      {status === "loading" ? <LoadingOverlay locale={locale} /> : null}
    </div>
  );
}
