import { riskTone, statusTone } from "@/lib/utils/risk";

type Tone = "neutral" | "success" | "warning" | "danger" | "critical";

const toneClass: Record<Tone, string> = {
  neutral: "border-slate-300 bg-slate-50 text-slate-700",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  danger: "border-rose-300 bg-rose-50 text-rose-800",
  critical: "border-red-500 bg-red-50 text-red-900",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClass[tone]}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: unknown }) {
  return <Badge tone={statusTone(status)}>{String(status ?? "unknown")}</Badge>;
}

export function RiskBadge({ risk }: { risk: unknown }) {
  return <Badge tone={riskTone(String(risk ?? "unknown"))}>{String(risk ?? "unknown")}</Badge>;
}

export function RoleBadge({ role }: { role: unknown }) {
  return <Badge>{String(role ?? "unknown")}</Badge>;
}
