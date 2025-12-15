"use client";

import { useId, useState } from "react";

type CopyButtonProps = {
    text: string;
    label: string;
    className?: string;
};

export function CopyButton({ text, label, className }: CopyButtonProps) {
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
            aria-describedby={statusId}
        >
            {label}
            <span id={statusId} className="sr-only" aria-live="polite">
                {copied ? "Copied to clipboard." : ""}
            </span>
        </button>
    );
}

