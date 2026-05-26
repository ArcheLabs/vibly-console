"use client";

import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

type NativeSelectVariant = "default" | "sidebar";

interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  variant?: NativeSelectVariant;
}

export function NativeSelect({ className = "", variant = "default", children, ...props }: NativeSelectProps) {
  const variantClass =
    variant === "sidebar"
      ? "border-[var(--sidebar-border)] bg-[var(--sidebar-surface-muted)] text-[var(--sidebar-text)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/25"
      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/20";

  return (
    <span className={`relative inline-flex min-w-0 ${className}`}>
      <select
        {...props}
        className={`h-9 w-full min-w-0 appearance-none rounded-full border px-3 pr-8 text-sm font-medium outline-none transition focus:ring-2 ${variantClass}`}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]"
        aria-hidden="true"
      />
    </span>
  );
}
