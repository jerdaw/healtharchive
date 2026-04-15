// Button with cursor-follow glow, matching the hover effect used on hero CTAs
"use client";

import { type ButtonHTMLAttributes, type DetailedHTMLProps, useRef } from "react";

type HoverGlowButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & { className?: string };

export function HoverGlowButton({ className, children, ...rest }: HoverGlowButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    node.style.setProperty("--ha-glow-x", `${x}%`);
    node.style.setProperty("--ha-glow-y", `${y}%`);
  };

  return (
    <button
      ref={ref}
      {...rest}
      className={`ha-btn-glow ${className ?? ""}`}
      onMouseMove={handleMove}
      onMouseEnter={handleMove}
    >
      {children}
    </button>
  );
}
