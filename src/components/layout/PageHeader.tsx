import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional content rendered to the right of the title block */
  right?: ReactNode;
}

/**
 * Standard page-level header used across all shell pages.
 * Renders an icon badge, title (h2 text-2xl) and optional description/right slot.
 * Callers are responsible for the outer padding wrapper (px-4 py-6 sm:px-8).
 */
export function PageHeader({ icon: Icon, title, description, right }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--text)] shadow-sm ring-1 ring-[var(--border)]">
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p> : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
