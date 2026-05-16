import { useTranslations } from "next-intl";

export const FEED_FILTERS = ["all", "organization", "observation", "proposal", "task", "artifact", "voting", "reward", "risk"] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];

export function FeedFilters({
  active,
  onChange,
}: {
  active: FeedFilter;
  onChange: (f: FeedFilter) => void;
}) {
  const t = useTranslations("feed.filters");
  return (
    <div className="flex flex-wrap gap-2">
      {FEED_FILTERS.map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            active === filter
              ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
          }`}
        >
          {t(filter)}
        </button>
      ))}
    </div>
  );
}
