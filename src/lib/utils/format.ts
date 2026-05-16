export function compactId(value: unknown, head = 10, tail = 6): string {
  const text = String(value ?? "");
  if (text.length <= head + tail + 3) return text || "unknown";
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTime(value: unknown): string {
  const date = parseDate(value);
  if (!date) return value ? String(value) : "unknown";
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export function timeAgo(value: unknown): string {
  const date = parseDate(value);
  if (!date) return value ? String(value) : "unknown";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0 || diffMs >= 60 * 60 * 1000) return formatDateTime(value);
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 10) return "刚刚";
  if (seconds < 60) return `${seconds}秒前`;
  return `${Math.floor(seconds / 60)}分钟前`;
}

export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function pickString(value: unknown, fallback = "unknown"): string {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

export function readableKey(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
