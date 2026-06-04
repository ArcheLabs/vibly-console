"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DetailPageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title?: string;
  description?: string;
  icon?: LucideIcon;
  right?: React.ReactNode;
  sticky?: boolean;
  emphasized?: boolean;
  containerClassName?: string;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DetailPageHeader({
  breadcrumbs,
  right,
  sticky = false,
  emphasized = false,
  containerClassName,
}: DetailPageHeaderProps) {
  return (
    <div
      className={cx(
        sticky && "sticky top-0 z-20",
        emphasized
          ? "border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className={cx("w-full px-4 py-4 sm:px-8", containerClassName)}>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {breadcrumbs.map((item, index) => {
              const current = index === breadcrumbs.length - 1;
              const content = item.href && !current ? (
                <Link href={item.href} className="text-[var(--text-muted)] transition hover:text-[var(--text)]">
                  {item.label}
                </Link>
              ) : (
                <span className={current ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]"}>
                  {item.label}
                </span>
              );
              return (
                <span key={`${item.label}:${index}`} className="inline-flex items-center gap-2">
                  {index > 0 ? <span className="text-[var(--text-subtle)]">/</span> : null}
                  {content}
                </span>
              );
            })}
          </div>
          {right ? <div className="flex-shrink-0">{right}</div> : null}
        </div>
      </div>
    </div>
  );
}
