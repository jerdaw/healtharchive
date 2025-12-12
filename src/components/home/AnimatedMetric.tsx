// Animated metric with count-up value and fill-up bar
"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedMetricProps = {
    id?: string;
    label: string;
    value: number;
    unit?: string;
    barPercent?: number;
    durationMs?: number;
    start?: boolean;
    startEvent?: string;
    startDelayMs?: number;
    onComplete?: (id?: string) => void;
    completeEvent?: string;
};

export function AnimatedMetric({
    id,
    label,
    value,
    unit,
    barPercent = 100,
    durationMs = 900,
    start = true,
    startEvent,
    startDelayMs = 0,
    onComplete,
    completeEvent,
}: AnimatedMetricProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const [fillPercent, setFillPercent] = useState(0);
    const frameRef = useRef<number | null>(null);
    const [isActive, setIsActive] = useState(start);
    const completedRef = useRef(false);

    useEffect(() => {
        setIsActive(start);
    }, [start]);

    useEffect(() => {
        if (isActive) {
            return;
        }

        let timeoutId: number | null = null;
        const handlers: Array<() => void> = [];

        if (startDelayMs > 0) {
            timeoutId = window.setTimeout(() => setIsActive(true), startDelayMs);
        }

        if (startEvent) {
            const listener = () => setIsActive(true);
            window.addEventListener(startEvent, listener);
            handlers.push(() => window.removeEventListener(startEvent, listener));
        }

        return () => {
            if (timeoutId != null) {
                window.clearTimeout(timeoutId);
            }
            handlers.forEach((handler) => handler());
        };
    }, [isActive, startDelayMs, startEvent]);

    useEffect(() => {
        if (!isActive) {
            return;
        }

        completedRef.current = false;
        const start = performance.now();
        setDisplayValue(0);
        setFillPercent(0);
        const animate = (timestamp: number) => {
            const progress = Math.min((timestamp - start) / durationMs, 1);
            setDisplayValue(Math.round(progress * value));
            setFillPercent(Math.max(0, Math.min(100, progress * barPercent)));
            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            } else if (!completedRef.current) {
                completedRef.current = true;
                onComplete?.(id);
                if (completeEvent) {
                    window.dispatchEvent(
                        new CustomEvent(completeEvent, {
                            detail: { id, label },
                        }),
                    );
                }
            }
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [
        value,
        barPercent,
        durationMs,
        isActive,
        completeEvent,
        id,
        label,
        onComplete,
    ]);

    return (
        <div>
            <dt className="ha-metric-label">{label}</dt>
            <dd className="ha-metric-primary">
                <span className="ha-metric-primary-value">{displayValue}</span>
                {unit ? (
                    <span className="ha-metric-primary-unit">{unit}</span>
                ) : null}
            </dd>
            <div className="ha-metric-bar">
                <div
                    className="ha-metric-bar-fill"
                    style={{ width: `${fillPercent}%` }}
                />
            </div>
        </div>
    );
}
