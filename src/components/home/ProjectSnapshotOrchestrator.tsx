"use client";

import { useEffect, useRef } from "react";

type ProjectSnapshotOrchestratorProps = {
    expectedIds: string[];
    metricEventName?: string;
    completeEventName?: string;
};

export function ProjectSnapshotOrchestrator({
    expectedIds,
    metricEventName = "ha-metric-finished",
    completeEventName = "ha-project-snapshot-finished",
}: ProjectSnapshotOrchestratorProps) {
    const completedRef = useRef<Set<string>>(new Set());
    const dispatchedRef = useRef(false);

    useEffect(() => {
        completedRef.current = new Set();
        dispatchedRef.current = false;

        const expectedSet = new Set(expectedIds);
        const handleMetricFinished = (event: Event) => {
            const customEvent = event as CustomEvent<{
                id?: string;
                label?: string;
            }>;
            const metricId = customEvent.detail?.id ?? customEvent.detail?.label;

            if (!metricId || !expectedSet.has(metricId)) {
                return;
            }

            completedRef.current.add(metricId);
            if (
                !dispatchedRef.current &&
                completedRef.current.size >= expectedSet.size
            ) {
                dispatchedRef.current = true;
                window.dispatchEvent(new CustomEvent(completeEventName));
            }
        };

        window.addEventListener(metricEventName, handleMetricFinished);
        return () => {
            window.removeEventListener(metricEventName, handleMetricFinished);
        };
    }, [expectedIds, metricEventName, completeEventName]);

    return null;
}
