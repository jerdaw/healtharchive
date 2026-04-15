"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChangingPhraseProps = {
  text: string;
  className?: string;
};

function toLeet(value: string) {
  return value
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();

      switch (lower) {
        case "a":
          return "4";
        case "e":
          return "3";
        case "i":
          return "1";
        case "o":
          return "0";
        case "t":
          return "7";
        case "s":
          return "5";
        default:
          return char;
      }
    })
    .join("");
}

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

    const handler = (event: MediaQueryListEvent) => {
      setReduced(event.matches);
    };

    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, []);

  return reduced;
}

export function ChangingPhrase({ text, className }: ChangingPhraseProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const finalChars = useMemo(() => text.split(""), [text]);
  const leetChars = useMemo(() => toLeet(text).split(""), [text]);
  const [displayedChars, setDisplayedChars] = useState<string[]>(finalChars);
  const [hasAnimated, setHasAnimated] = useState(prefersReducedMotion);
  const resolveIntervalRef = useRef<number | null>(null);
  const resolveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion || hasAnimated) {
      return;
    }

    const HOLD_DURATION_MS = 500;
    const PER_CHAR_DELAY_MS = 333;

    const indices = finalChars.map((char, index) => (char === " " ? null : index));
    const nonSpaceIndices = indices.filter((index): index is number => index !== null);
    if (nonSpaceIndices.length === 0) {
      return;
    }

    let pointer = 0;
    let cancelled = false;

    // Intentionally set initial scrambled state before starting the animation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayedChars(leetChars);

    resolveTimeoutRef.current = window.setTimeout(() => {
      resolveIntervalRef.current = window.setInterval(() => {
        if (cancelled) {
          return;
        }

        setDisplayedChars((prev) => {
          if (pointer >= nonSpaceIndices.length) {
            if (resolveIntervalRef.current != null) {
              window.clearInterval(resolveIntervalRef.current);
              resolveIntervalRef.current = null;
            }
            setHasAnimated(true);
            return finalChars;
          }

          const next = [...prev];
          const index = nonSpaceIndices[pointer]!;
          next[index] = finalChars[index]!;
          pointer += 1;
          return next;
        });
      }, PER_CHAR_DELAY_MS);
    }, HOLD_DURATION_MS);

    return () => {
      cancelled = true;
      if (resolveTimeoutRef.current != null) {
        window.clearTimeout(resolveTimeoutRef.current);
        resolveTimeoutRef.current = null;
      }
      if (resolveIntervalRef.current != null) {
        window.clearInterval(resolveIntervalRef.current);
        resolveIntervalRef.current = null;
      }
    };
  }, [finalChars, leetChars, prefersReducedMotion, hasAnimated]);

  return (
    <span className={className}>
      <span aria-hidden="true" className="inline-block whitespace-nowrap">
        {displayedChars.map((char, index) => (
          <span
            key={`${char}-${index}`}
            className="inline-block align-baseline transition-opacity transition-transform duration-150 ease-out"
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
