import { ArrowDown } from "lucide-react";
import { StatusBadge } from "@/components/common/Badge";
import type { Entity } from "@/lib/coordinator/types";

interface CausalGroup {
  group: string;
  items: Entity[];
}

export function CausalChain({ chain }: { chain: CausalGroup[] }) {
  if (chain.length === 0) return null;

  return (
    <div className="space-y-4">
      {chain.map((group, gIdx) => (
        <div key={group.group}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {group.group}
          </div>
          <div className="space-y-2">
            {group.items.map((item, iIdx) => (
              <div key={iIdx} className="rounded-2xl bg-slate-50 p-3">
                <div className="text-sm font-semibold text-slate-800">
                  {String(item.title ?? item.type ?? "")}
                </div>
                {!!(item.body ?? item.description) && (
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {String(item.body ?? item.description)}
                  </p>
                )}
                {!!(item.status ?? item.stage) && (
                  <div className="mt-2">
                    <StatusBadge status={String(item.status ?? item.stage)} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {gIdx < chain.length - 1 && (
            <div className="mt-3 flex justify-center">
              <ArrowDown className="h-4 w-4 text-slate-300" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
