"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "info" | "success" | "warning" | "danger";

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}

interface ToastContextValue {
  notify(input: Omit<ToastItem, "id">): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((input: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const item = { ...input, id };
    setItems((current) => [item, ...current].slice(0, 4));
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[200] grid w-[min(24rem,calc(100vw-2rem))] gap-3">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider");
  return value;
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss(): void }) {
  const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "info" ? Info : AlertTriangle;
  const tone = item.tone === "danger"
    ? "border-[var(--danger)]/30 bg-[var(--danger-surface)] text-[var(--danger)]"
    : item.tone === "warning"
      ? "border-[var(--warning)]/30 bg-[var(--warning-surface)] text-[var(--warning)]"
      : item.tone === "success"
        ? "border-[var(--accent)]/30 bg-[var(--success-surface)] text-[var(--accent)]"
        : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]";
  return (
    <div className={`rounded-2xl border p-4 shadow-[var(--shadow)] ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{item.title}</div>
          {item.body ? <div className="mt-1 text-xs leading-5 opacity-85">{item.body}</div> : null}
        </div>
        <button type="button" onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
