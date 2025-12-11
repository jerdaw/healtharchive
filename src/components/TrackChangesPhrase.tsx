"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type Phase =
    | "initial"
    | "cursor"
    | "backspacing"
    | "jump"
    | "inserting"
    | "final";

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
    const beforeWord = "before";
    const afterWord = "after";
    const beforeChars = beforeWord.split("");
    const beforeLength = beforeChars.length;
    const afterLength = afterWord.length;

    const [phase, setPhase] = useState<Phase>(() =>
        prefersReducedMotion ? "final" : "initial",
    );
    const [deletedCount, setDeletedCount] = useState(() =>
        prefersReducedMotion ? beforeLength : 0,
    );
    const [typedAfterLength, setTypedAfterLength] = useState(() =>
        prefersReducedMotion ? afterLength : 0,
    );
    const [hasAnimated, setHasAnimated] = useState(prefersReducedMotion);

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
                                        const next = Math.max(
                                            previous,
                                            currentTyped,
                                        );
                                        return next > afterLength
                                            ? afterLength
                                            : next;
                                    });

                                    if (currentTyped >= afterLength) {
                                        if (typingIntervalId != null) {
                                            window.clearInterval(
                                                typingIntervalId,
                                            );
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

    const caret = (
        <span className="inline-block h-[1.1em] w-px ha-typing-caret align-middle" />
    );

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
            const baseClasses =
                "inline-block text-slate-900 transition-colors transition-opacity duration-150 ease-out";
            const deletedClasses = isDeleted ? "line-through" : "";

            nodes.push(
                <span
                    key={`before-${index}`}
                    className={`${baseClasses} ${deletedClasses}`}
                >
                    {beforeChars[index]}
                </span>,
            );
        }

        return nodes;
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
            <span
                aria-hidden="true"
                className="whitespace-nowrap align-baseline"
            >
                {phase === "initial" && <span>{beforeWord}</span>}

                {(phase === "cursor" ||
                    phase === "backspacing" ||
                    phase === "jump") &&
                    renderBeforeWithCursor(caretIndexForBefore)}

                {(phase === "inserting" || phase === "final") && (
                    <>
                        <span className="inline-block text-slate-900 line-through">
                            {beforeWord}
                        </span>
                        <span>{" "}</span>
                        {showAfter && (
                            <span className="inline-block text-ha-accent">
                                {afterText}
                            </span>
                        )}
                        {phase === "inserting" && (
                            <span className="inline-block ml-[1px]">
                                {caret}
                            </span>
                        )}
                    </>
                )}
            </span>
            <span className="sr-only">after they change</span>
        </span>
    );
}
