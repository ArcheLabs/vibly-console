export const FEED_FILTERS = ["全部", "组织", "观察", "提案", "任务", "成果", "投票", "奖励", "风险"] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];

export function FeedFilters({
  active,
  onChange,
}: {
  active: FeedFilter;
  onChange: (f: FeedFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FEED_FILTERS.map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            active === filter
              ? "bg-slate-950 text-white"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
