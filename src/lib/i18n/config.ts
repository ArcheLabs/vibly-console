export const locales = ["zh-CN", "en-US"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "zh-CN";
export const localeCookieName = "NEXT_LOCALE";

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
