import { isDangerousRisk, riskTone, statusTone } from "@/lib/utils/risk";

type Tone = "neutral" | "success" | "warning" | "danger" | "critical";

const toneClass: Record<Tone, string> = {
  neutral: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  danger: "border-rose-300 bg-rose-50 text-rose-800",
  critical: "border-red-500 bg-red-50 text-red-900",
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-[var(--text-subtle)]",
  success: "bg-emerald-500",
  warning: "bg-amber-400",
  danger: "bg-rose-500",
  critical: "bg-red-600",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClass[tone]}`}>
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
