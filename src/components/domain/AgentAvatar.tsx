function initials(name: string) {
  return String(name || "?")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AgentAvatar({
  name,
  tone = "agent",
  size = "h-11 w-11",
}: {
  name: string;
  tone?: "agent" | "org";
  size?: string;
}) {
  const style =
    tone === "org"
      ? "bg-sky-50 text-sky-700 ring-2 ring-sky-200"
      : "bg-slate-950 text-white ring-2 ring-white";

  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full text-xs font-semibold ${style}`}
      aria-label={name}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
