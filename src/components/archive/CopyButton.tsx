"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";

type CopyButtonProps = {
  text: string;
  label: string;
  className?: string;
  children?: ReactNode;
};

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.3a1 1 0 0 1-1.43.006l-3.79-3.74a1 1 0 1 1 1.404-1.424l3.078 3.038 6.492-6.58a1 1 0 0 1 1.44-.014Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type CopyState = "idle" | "copied" | "failed";

function copyWithExecCommand(text: string): boolean {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.left = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    const ok = typeof document.execCommand === "function" ? document.execCommand("copy") : false;

    document.body.removeChild(textarea);
    return Boolean(ok);
  } catch {
    return false;
  }
}

export function CopyButton({ text, label, className, children }: CopyButtonProps) {
  const locale = useLocale();
  const [state, setState] = useState<CopyState>("idle");
  const statusId = useId();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const scheduleReset = (delayMs: number) => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setState("idle");
    }, delayMs);
  };

  const onCopy = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setState("failed");
      scheduleReset(1600);
      return;
    }

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(trimmed);
        setState("copied");
        scheduleReset(1200);
        return;
      }

      const ok = copyWithExecCommand(trimmed);
      setState(ok ? "copied" : "failed");
      scheduleReset(ok ? 1200 : 1600);
    } catch {
      const ok = copyWithExecCommand(trimmed);
      setState(ok ? "copied" : "failed");
      scheduleReset(ok ? 1200 : 1600);
    }
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className={className}
        onClick={onCopy}
        title={label}
        aria-label={label}
        aria-describedby={statusId}
      >
        {children ? state === "copied" ? <CheckIcon /> : children : label}
      </button>

      {state !== "idle" && (
        <span
          className={`pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-[calc(100%+0.4rem)] rounded-md px-2 py-1 text-[11px] whitespace-nowrap shadow ${
            state === "copied" ? "bg-slate-900 text-white" : "bg-rose-700 text-white"
          }`}
        >
          {state === "copied"
            ? locale === "fr"
              ? "Copié"
              : "Copied"
            : locale === "fr"
              ? "Échec de la copie"
              : "Copy failed"}
        </span>
      )}

      <span id={statusId} className="sr-only" aria-live="polite">
        {state === "copied"
          ? locale === "fr"
            ? "Copié dans le presse-papiers."
            : "Copied to clipboard."
          : state === "failed"
            ? locale === "fr"
              ? "Échec de la copie."
              : "Copy failed."
            : ""}
      </span>
    </span>
  );
}
