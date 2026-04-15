"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";

type Phase = "initial" | "cursor" | "backspacing" | "jump" | "inserting" | "final";

type BeforeVisibility = "visible" | "fading" | "hidden";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (event: MediaQueryListEvent) => {
      setReduced(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return reduced;
}

export function TrackChangesPhrase() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const locale = useLocale();
  const beforeWord = locale === "fr" ? "avant" : "before";
  const afterWord = locale === "fr" ? "après" : "after";
  const beforeChars = beforeWord.split("");
  const beforeLength = beforeChars.length;
  const afterLength = afterWord.length;

  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion ? "final" : "initial"));
  const [deletedCount, setDeletedCount] = useState(() => (prefersReducedMotion ? beforeLength : 0));
  const [typedAfterLength, setTypedAfterLength] = useState(() =>
    prefersReducedMotion ? afterLength : 0,
  );
  const [hasAnimated, setHasAnimated] = useState(prefersReducedMotion);
  const [beforeVisibility, setBeforeVisibility] = useState<BeforeVisibility>("visible");
  const [beforeWidth, setBeforeWidth] = useState<number | null>(null);
  const hasNotifiedRef = useRef(false);
  const beforeFadeTimeoutRef = useRef<number | null>(null);
  const beforeHideTimeoutRef = useRef<number | null>(null);
  const beforeVisibilityRef = useRef<BeforeVisibility>("visible");
  const beforeRef = useRef<HTMLSpanElement | null>(null);

  const fadeDelayMs = 750;
  const fadeDurationMs = 5400;

  useEffect(() => {
    beforeVisibilityRef.current = beforeVisibility;
  }, [beforeVisibility]);

  useEffect(() => {
    if ((phase === "inserting" || phase === "final") && beforeRef.current && beforeWidth == null) {
      const measured = beforeRef.current.getBoundingClientRect().width;
      if (measured > 0) {
        setBeforeWidth(measured);
      }
    }
  }, [phase, beforeWidth]);

  useEffect(() => {
    if (prefersReducedMotion || hasAnimated) {
      return;
    }

    let backspaceIntervalId: number | null = null;
    let typingIntervalId: number | null = null;
    const timeouts: number[] = [];

    // Reset to the starting animation state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase("initial");
    setDeletedCount(0);
    setTypedAfterLength(0);

    timeouts.push(
      window.setTimeout(() => {
        setPhase("cursor");
      }, 400),
    );

    timeouts.push(
      window.setTimeout(() => {
        setPhase("backspacing");

        let currentDeleted = 0;
        const delayPerChar = 130;

        backspaceIntervalId = window.setInterval(() => {
          currentDeleted += 1;

          setDeletedCount((previous) => {
            const next = Math.max(previous, currentDeleted);
            return next > beforeLength ? beforeLength : next;
          });

          if (currentDeleted >= beforeLength) {
            if (backspaceIntervalId != null) {
              window.clearInterval(backspaceIntervalId);
              backspaceIntervalId = null;
            }

            setPhase("jump");

            timeouts.push(
              window.setTimeout(() => {
                setPhase("inserting");

                let currentTyped = 0;
                const delayForTyping = 140;

                typingIntervalId = window.setInterval(() => {
                  currentTyped += 1;

                  setTypedAfterLength((previous) => {
                    const next = Math.max(previous, currentTyped);
                    return next > afterLength ? afterLength : next;
                  });

                  if (currentTyped >= afterLength) {
                    if (typingIntervalId != null) {
                      window.clearInterval(typingIntervalId);
                      typingIntervalId = null;
                    }

                    setPhase("final");
                    setHasAnimated(true);
                  }
                }, delayForTyping);
              }, 220),
            );
          }
        }, delayPerChar);
      }, 800),
    );

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
      if (backspaceIntervalId != null) {
        window.clearInterval(backspaceIntervalId);
      }
      if (typingIntervalId != null) {
        window.clearInterval(typingIntervalId);
      }
    };
  }, [afterLength, beforeLength, prefersReducedMotion, hasAnimated]);

  useEffect(() => {
    if (phase === "final" && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      window.dispatchEvent(new CustomEvent("ha-trackchanges-finished"));
    }
  }, [phase]);

  useEffect(() => {
    const handleProjectSnapshotFinished = () => {
      if (beforeVisibilityRef.current !== "visible") {
        return;
      }

      const width = beforeRef.current?.getBoundingClientRect().width ?? beforeWidth ?? 0;

      if (beforeWidth == null && width > 0) {
        setBeforeWidth(width);
      }

      const startFade = () => {
        if (prefersReducedMotion) {
          setBeforeVisibility("hidden");
          beforeVisibilityRef.current = "hidden";
          return;
        }

        setBeforeVisibility("fading");
        beforeVisibilityRef.current = "fading";

        if (beforeHideTimeoutRef.current != null) {
          window.clearTimeout(beforeHideTimeoutRef.current);
        }

        beforeHideTimeoutRef.current = window.setTimeout(() => {
          setBeforeVisibility("hidden");
          beforeVisibilityRef.current = "hidden";
        }, fadeDurationMs + 80);
      };

      if (beforeFadeTimeoutRef.current != null) {
        window.clearTimeout(beforeFadeTimeoutRef.current);
      }

      beforeFadeTimeoutRef.current = window.setTimeout(startFade, fadeDelayMs);
    };

    window.addEventListener("ha-project-snapshot-finished", handleProjectSnapshotFinished);

    return () => {
      window.removeEventListener("ha-project-snapshot-finished", handleProjectSnapshotFinished);
      if (beforeFadeTimeoutRef.current != null) {
        window.clearTimeout(beforeFadeTimeoutRef.current);
      }
      if (beforeHideTimeoutRef.current != null) {
        window.clearTimeout(beforeHideTimeoutRef.current);
      }
    };
  }, [prefersReducedMotion, fadeDelayMs, fadeDurationMs, beforeWidth]);

  const caret = <span className="ha-typing-caret inline-block h-[1.1em] w-0 align-middle" />;

  const renderBeforeWithCursor = (caretIndex: number | null) => {
    const deletedFromIndex = Math.max(beforeLength - deletedCount, 0);
    const nodes: ReactNode[] = [];

    for (let index = 0; index <= beforeLength; index += 1) {
      if (caretIndex === index) {
        nodes.push(
          <span key={`caret-${index}`} className="inline-block">
            {caret}
          </span>,
        );
      }

      if (index === beforeLength) {
        break;
      }

      const isDeleted = index >= deletedFromIndex;
      const baseClasses = "inline-block transition-colors transition-opacity duration-150 ease-out";
      const deletedClasses = isDeleted ? "ha-before-word-text" : "";

      nodes.push(
        <span key={`before-${index}`} className={`${baseClasses} ${deletedClasses}`}>
          {beforeChars[index]}
        </span>,
      );
    }

    return nodes;
  };

  const renderFinalBeforeWord = () => {
    if (beforeVisibility === "hidden") {
      return null;
    }

    const fading = beforeVisibility === "fading";
    const widthVar = beforeWidth != null ? `${beforeWidth}px` : `${beforeLength + 1}ch`;

    return (
      <span
        ref={beforeRef}
        className={`ha-before-word ${fading ? "ha-before-word--fading" : ""}`}
        style={{ ["--ha-before-width" as string]: widthVar }}
      >
        <span className="ha-before-word-text">{beforeWord}</span>
        {"\u00a0"}
      </span>
    );
  };

  const caretIndexForBefore =
    phase === "cursor"
      ? beforeLength
      : phase === "backspacing"
        ? Math.max(beforeLength - deletedCount, 0)
        : phase === "jump"
          ? beforeLength
          : null;

  const afterText = afterWord.slice(0, typedAfterLength);
  const showAfter = phase === "inserting" || phase === "final";

  return (
    <span className="inline-block align-baseline">
      <span aria-hidden="true" className="align-baseline whitespace-nowrap">
        {phase === "initial" && <span>{beforeWord}</span>}

        {(phase === "cursor" || phase === "backspacing" || phase === "jump") &&
          renderBeforeWithCursor(caretIndexForBefore)}

        {(phase === "inserting" || phase === "final") && (
          <>
            {renderFinalBeforeWord()}
            {showAfter && <span className="text-ha-accent inline-block">{afterText}</span>}
            {phase === "inserting" && <span className="ml-[1px] inline-block">{caret}</span>}
          </>
        )}
      </span>
      <span className="sr-only">{afterWord}</span>
      <noscript>
        <span className="text-ha-accent inline">{afterWord}</span>
      </noscript>
    </span>
  );
}
