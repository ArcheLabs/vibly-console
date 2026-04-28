import { formatDistanceToNowStrict } from "date-fns";

export function compactId(value: unknown, head = 10, tail = 6): string {
  const text = String(value ?? "");
  if (text.length <= head + tail + 3) return text || "unknown";
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

export function formatDateTime(value: unknown): string {
  if (!value) return "unknown";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function timeAgo(value: unknown): string {
  if (!value) return "unknown";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${formatDistanceToNowStrict(date)} ago`;
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
