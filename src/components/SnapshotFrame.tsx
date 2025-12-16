"use client";

import { useState } from "react";

type SnapshotFrameProps = {
  src: string;
  title: string;
  browseLink?: string;
  rawLink?: string;
  apiLink?: string;
};

export function SnapshotFrame({
  src,
  title,
  browseLink,
  rawLink,
  apiLink,
}: SnapshotFrameProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  return (
    <div className="relative h-full w-full">
      {status === "error" ? (
        <div className="flex h-full min-h-[320px] items-center justify-center px-4 text-center text-xs text-ha-muted sm:min-h-[560px] sm:text-sm">
          <div className="space-y-2">
            <p className="font-semibold text-slate-900">
              Archived content unavailable
            </p>
            <p>
              The archived page failed to load. Try opening it in a new tab or
              reloading the page.
            </p>
            <div className="flex justify-center gap-2 text-[11px] font-medium">
              {browseLink && (
                <a
                  href={browseLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ha-accent hover:text-blue-700"
                >
                  Open archived page →
                </a>
              )}
              {rawLink && (
                <a
                  href={rawLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ha-accent hover:text-blue-700"
                >
                  Open raw HTML →
                </a>
              )}
              {apiLink && (
                <a
                  href={apiLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ha-accent hover:text-blue-700"
                >
                  View metadata JSON
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
          className="h-[480px] w-full border-0 sm:h-[560px]"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40 text-xs text-ha-muted">
          Loading snapshot…
        </div>
      )}
    </div>
  );
}
