"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSubmitActionIntent } from "@/lib/query/hooks";
import { useAuthState } from "@/lib/store/authStore";

type IntentType = "request_info" | "flag_important" | "pause_settlement";

interface ActionIntentDialogProps {
  open: boolean;
  onClose: () => void;
  intentType: IntentType;
  targetRef: string;
}

const intentKeys = {
  request_info: "requestInfo",
  flag_important: "flagImportant",
  pause_settlement: "pauseSettlement",
} as const satisfies Record<IntentType, string>;

function ActionIntentDialog({ open, onClose, intentType, targetRef }: ActionIntentDialogProps) {
  const t = useTranslations("guardianActions");
  const key = intentKeys[intentType];
  const { mutate, isPending, error } = useSubmitActionIntent();
  const { register, handleSubmit, reset } = useForm<{ reason: string }>();

  function onSubmit(data: { reason: string }) {
    mutate(
      { intentType, targetRef, reason: data.reason },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-[var(--text-muted)]" />
          <h2 className="text-lg font-semibold text-[var(--text)]">{t(`${key}.title`)}</h2>
        </div>

        <div className="mt-4 space-y-3 rounded-xl bg-[var(--surface-muted)] p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-subtle)]">{t("target")}</span>
            <span className="font-mono text-xs font-medium text-[var(--text)]">{targetRef}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-subtle)]">{t("permissionScope")}</span>
            <span className="font-medium text-[var(--text)]">{t(`${key}.scope`)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-subtle)]">{t("downstreamEffect")}</span>
            <span className="max-w-[60%] text-right font-medium text-[var(--text)]">{t(`${key}.effect`)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-subtle)]">{t("auditVisibility")}</span>
            <span className="font-medium text-[var(--success)]">{t("public")}</span>
          </div>
        </div>

        <p className="mt-3 text-sm text-[var(--text-muted)]">{t(`${key}.description`)}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
          <textarea
            {...register("reason", { required: true })}
            placeholder={t("reasonPlaceholder")}
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--border-strong)] focus:ring-0"
          />

          {error && (
            <p className="text-xs text-[var(--danger)]">
              {error instanceof Error ? error.message : t("submitError")}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                intentType === "pause_settlement" ? "bg-[var(--danger)] text-white" : "bg-[var(--accent)] text-[var(--accent-foreground)]"
              }`}
            >
              {isPending ? t("submitting") : t("confirm")}
            </button>
            <button
              type="button"
              onClick={() => { reset(); onClose(); }}
              className="flex-1 rounded-full bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] ring-1 ring-[var(--border)]"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function GuardianActionsPanel({ targetRef }: { targetRef: string }) {
  const t = useTranslations("guardianActions");
  const [open, setOpen] = useState(false);
  const [intentType, setIntentType] = useState<IntentType>("pause_settlement");
  const { mutate: quickMutate, isPending } = useSubmitActionIntent();
  const auth = useAuthState();
  const canExecute = auth.connected;

  function quickAction(type: IntentType) {
    if (!canExecute) return;
    if (type === "pause_settlement") {
      setIntentType(type);
      setOpen(true);
    } else {
      quickMutate({ intentType: type, targetRef });
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <ShieldAlert className="h-4 w-4" />
          {t("title")}
        </div>
        {!canExecute ? (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t("readonly")}
          </p>
        ) : null}
        <div className="space-y-2">
          <button
            onClick={() => quickAction("request_info")}
            disabled={isPending || !canExecute}
            className="w-full rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-50"
          >
            {t("requestInfo.title")}
          </button>
          <button
            onClick={() => quickAction("flag_important")}
            disabled={isPending || !canExecute}
            className="w-full rounded-full bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] ring-1 ring-[var(--border)] disabled:opacity-50"
          >
            {t("flagImportant.title")}
          </button>
          <button
            onClick={() => quickAction("pause_settlement")}
            disabled={!canExecute}
            className="w-full rounded-full bg-[var(--danger-surface)] px-4 py-2 text-sm font-semibold text-[var(--danger)] ring-1 ring-[var(--danger)] disabled:opacity-50"
          >
            {t("pauseSettlement.title")}
          </button>
        </div>
      </section>

      <ActionIntentDialog
        open={open}
        onClose={() => setOpen(false)}
        intentType={intentType}
        targetRef={targetRef}
      />
    </>
  );
}
