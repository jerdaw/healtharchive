"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";

type CopyButtonProps = {
    text: string;
    label: string;
    className?: string;
    children?: ReactNode;
};

export function CopyButton({
    text,
    label,
    className,
    children,
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false);
    const statusId = useId();

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        } catch {
            setCopied(false);
        }
    };

    return (
        <button
            type="button"
            className={className}
            onClick={onCopy}
            title={label}
            aria-label={label}
            aria-describedby={statusId}
        >
            {children ?? label}
            <span id={statusId} className="sr-only" aria-live="polite">
                {copied ? "Copied to clipboard." : ""}
            </span>
        </button>
    );
}
