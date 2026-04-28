export function JsonViewer({ value, title = "Raw JSON" }: { value: unknown; title?: string }) {
  return (
    <details className="rounded border border-slate-200 bg-slate-950 text-slate-100">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{title}</summary>
      <pre className="max-h-[520px] overflow-auto border-t border-slate-800 p-4 text-xs leading-5">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}
