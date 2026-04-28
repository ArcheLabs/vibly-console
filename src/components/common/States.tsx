import { AlertTriangle, Loader2 } from "lucide-react";
import { errorMessage } from "@/lib/coordinator/errors";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center gap-2 rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-white p-6">
      <p className="font-medium text-slate-900">{title}</p>
      {body ? <p className="mt-1 text-sm text-slate-600">{body}</p> : null}
    </div>
  );
}

export function ErrorState({ error, title = "Something went wrong" }: { error: unknown; title?: string }) {
  return (
    <div className="rounded border border-rose-200 bg-rose-50 p-4 text-rose-900">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </div>
      <p className="mt-2 text-sm">{errorMessage(error)}</p>
    </div>
  );
}
