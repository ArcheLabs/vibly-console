"use client";

export function ConfirmButton({
  children,
  confirm,
  onConfirm,
  disabled,
  variant = "default",
}: {
  children: React.ReactNode;
  confirm: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded px-3 py-2 text-sm font-medium disabled:opacity-50 ${
        variant === "danger" ? "bg-red-700 text-white hover:bg-red-800" : "bg-slate-900 text-white hover:bg-slate-800"
      }`}
      onClick={async () => {
        if (window.confirm(confirm)) await onConfirm();
      }}
    >
      {children}
    </button>
  );
}
