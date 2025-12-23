"use client";

import { useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";

type SnapshotFrameProps = {
  src: string;
  title: string;
  browseLink?: string;
  rawLink?: string;
  apiLink?: string;
  iframeClassName?: string;
};

export function SnapshotFrame({
  src,
  title,
  browseLink,
  rawLink,
  apiLink,
  iframeClassName,
}: SnapshotFrameProps) {
  const locale = useLocale();
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const iframeClasses = iframeClassName ?? "h-[480px] w-full border-0 sm:h-[560px]";

  return (
    <div className="relative h-full w-full">
      {status === "error" ? (
        <div className="text-ha-muted flex h-full min-h-[320px] items-center justify-center px-4 text-center text-xs sm:min-h-[560px] sm:text-sm">
          <div className="space-y-2">
            <p className="font-semibold text-slate-900">
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
                  className="text-ha-accent hover:text-blue-700"
                >
                  {locale === "fr" ? "Ouvrir la page archivée →" : "Open archived page →"}
                </a>
              )}
              {rawLink && (
                <a
                  href={rawLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ha-accent hover:text-blue-700"
                >
                  {locale === "fr" ? "Ouvrir le HTML brut →" : "Open raw HTML →"}
                </a>
              )}
              {apiLink && (
                <a
                  href={apiLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ha-accent hover:text-blue-700"
                >
                  {locale === "fr" ? "Voir les métadonnées (JSON)" : "View metadata JSON"}
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <iframe
          src={src}
          title={title}
          sandbox="allow-same-origin allow-scripts allow-forms"
          className={iframeClasses}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}
      {status === "loading" && (
        <div className="text-ha-muted pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40 text-xs">
          {locale === "fr" ? "Chargement de la capture…" : "Loading snapshot…"}
        </div>
      )}
    </div>
  );
}
