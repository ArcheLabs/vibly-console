import Link from "next/link";
import { CopyButton } from "./CopyButton";
import { RiskBadge, StatusBadge } from "./Badge";
import { JsonViewer } from "./JsonViewer";
import { compactId, formatDateTime, pickString } from "@/lib/utils/format";

export function PageHeader({ title, eyebrow, actions }: { title: string; eyebrow?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-sm font-medium text-slate-500">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const content = (
    <div className="rounded border border-slate-200 bg-white p-4 hover:border-slate-300">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export function DetailGrid({ item }: { item: Record<string, unknown> | null | undefined }) {
  if (!item) return null;
  const entries = ["id", "name", "title", "displayName", "status", "kind", "type", "riskLevel", "createdAt", "updatedAt"]
    .filter((key) => item[key] !== undefined)
    .map((key) => [key, item[key]] as const);
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase text-slate-500">{key}</p>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900">
            {key === "status" ? <StatusBadge status={value} /> : key === "riskLevel" ? <RiskBadge risk={value} /> : key.endsWith("At") ? formatDateTime(value) : pickString(value)}
            {key === "id" ? <CopyButton value={value} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EntityCard({ title, item }: { title: string; item: Record<string, unknown> | null | undefined }) {
  if (!item) return null;
  return (
    <div className="space-y-4 rounded border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        {"id" in item ? <span className="text-xs text-slate-500">{compactId(item.id)}</span> : null}
      </div>
      <DetailGrid item={item} />
      <JsonViewer value={item} />
    </div>
  );
}
