import type { ReactNode } from "react";
import { isDangerousRisk, riskTone, statusTone } from "@/lib/utils/risk";

type Tone = "neutral" | "success" | "warning" | "danger" | "critical";

const toneClass: Record<Tone, string> = {
  neutral: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]",
  success: "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  danger: "border-rose-300 bg-rose-50 text-rose-800",
  critical: "border-red-500 bg-red-50 text-red-900",
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-[var(--text-subtle)]",
  success: "bg-[var(--accent)]",
  warning: "bg-amber-400",
  danger: "bg-rose-500",
  critical: "bg-red-600",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-normal ring-1 ring-inset ${toneClass[tone]}`}>
      <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotClass[tone]}`} />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: unknown }) {
  return <Badge tone={statusTone(status)}>{String(status ?? "unknown")}</Badge>;
}

export function RiskBadge({ risk }: { risk: unknown }) {
  if (!isDangerousRisk(String(risk ?? ""))) return null;
  return <Badge tone={riskTone(String(risk ?? "unknown"))}>{String(risk ?? "unknown")}</Badge>;
}

export function RoleBadge({ role }: { role: unknown }) {
  return <Badge>{String(role ?? "unknown")}</Badge>;
}

type PillTone = "default" | "good" | "warning" | "danger";

const pillToneClass: Record<PillTone, string> = {
  default: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]",
  good: "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  danger: "border-rose-400/30 bg-rose-400/10 text-rose-400",
};

/** Pill-shaped status tag (rounded-full). Use for connection / agent duty states. */
export function StatusPill({ children, tone = "default" }: { children: ReactNode; tone?: PillTone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-normal ${pillToneClass[tone]}`}>
      {children}
    </span>
  );
}

/** Compact capability / role tag. Use for agent capability lists. */
export function CapTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-normal text-[var(--text-muted)]">
      {children}
    </span>
  );
}
