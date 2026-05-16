import { AlertTriangle, Loader2 } from "lucide-react";
import { errorMessage } from "@/lib/coordinator/errors";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="font-medium text-[var(--text)]">{title}</p>
      {body ? <p className="mt-1 text-sm text-[var(--text-muted)]">{body}</p> : null}
    </div>
  );
}

export function ErrorState({ error, title = "Something went wrong" }: { error: unknown; title?: string }) {
  return (
    <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-surface)] p-4 text-[var(--danger)]">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </div>
      <p className="mt-2 text-sm">{errorMessage(error)}</p>
    </div>
  );
}
