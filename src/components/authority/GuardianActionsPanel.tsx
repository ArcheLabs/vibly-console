"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { ShieldAlert } from "lucide-react";
import { useSubmitActionIntent } from "@/lib/query/hooks";
import { useAuthState } from "@/lib/store/authStore";

type IntentType = "request_info" | "flag_important" | "pause_settlement";

interface ActionIntentDialogProps {
  open: boolean;
  onClose: () => void;
  intentType: IntentType;
  targetRef: string;
}

const INTENT_LABELS: Record<IntentType, { title: string; description: string; scope: string; effect: string }> = {
  request_info: {
    title: "请求补充信息",
    description: "要求相关 Agent 补充证据或解释。",
    scope: "Observer / Reporter",
    effect: "对象进入 pending_info 状态，直至补充完成。",
  },
  flag_important: {
    title: "标记为重要",
    description: "将此对象标记为高优先级，以便人类审核团队跟踪。",
    scope: "Guardian / Human Authority",
    effect: "生成标记审计记录，不影响对象状态机。",
  },
  pause_settlement: {
    title: "Guardian 暂停下游结算",
    description: "暂停与此对象关联的所有下游结算批次。",
    scope: "Guardian (高权限)",
    effect: "结算暂停，生成公开审计记录，需手动恢复。",
  },
};

function ActionIntentDialog({ open, onClose, intentType, targetRef }: ActionIntentDialogProps) {
  const meta = INTENT_LABELS[intentType];
  const { mutate, isPending, error, isSuccess } = useSubmitActionIntent();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold">{meta.title}</h2>
        </div>

        <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Target</span>
            <span className="font-mono text-xs font-medium text-slate-700">{targetRef}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Permission Scope</span>
            <span className="font-medium text-slate-700">{meta.scope}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Downstream Effect</span>
            <span className="max-w-[60%] text-right font-medium text-slate-700">{meta.effect}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Audit Visibility</span>
            <span className="font-medium text-emerald-700">Public</span>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-600">{meta.description}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
          <textarea
            {...register("reason", { required: true })}
            placeholder="操作原因（必填）"
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-0"
          />

          {error && (
            <p className="text-xs text-red-600">
              {error instanceof Error ? error.message : "提交失败，请稍后重试。"}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                intentType === "pause_settlement" ? "bg-red-600" : "bg-slate-950"
              }`}
            >
              {isPending ? "提交中..." : "确认"}
            </button>
            <button
              type="button"
              onClick={() => { reset(); onClose(); }}
              className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function GuardianActionsPanel({ targetRef }: { targetRef: string }) {
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
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
          <ShieldAlert className="h-4 w-4" />
          人类 / Guardian 动作
        </div>
        {!canExecute ? (
          <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            公开浏览模式下仅可查看。连接钱包后才可执行 Guardian 写操作。
          </p>
        ) : null}
        <div className="space-y-2">
          <button
            onClick={() => quickAction("request_info")}
            disabled={isPending || !canExecute}
            className="w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            请求补充信息
          </button>
          <button
            onClick={() => quickAction("flag_important")}
            disabled={isPending || !canExecute}
            className="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-50"
          >
            标记为重要
          </button>
          <button
            onClick={() => quickAction("pause_settlement")}
            disabled={!canExecute}
            className="w-full rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 disabled:opacity-50"
          >
            Guardian 暂停下游结算
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
