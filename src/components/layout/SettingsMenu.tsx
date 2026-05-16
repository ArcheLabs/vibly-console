"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Languages, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { locales, localeCookieName, type AppLocale } from "@/lib/i18n/config";
import { useTheme, type ThemeMode } from "@/lib/theme/ThemeProvider";

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} satisfies Record<ThemeMode, typeof Sun>;

export function SettingsMenu() {
  const t = useTranslations("settings");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function switchLocale(next: AppLocale) {
    document.cookie = `${localeCookieName}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={t("label")}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] shadow-sm transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow)]">
          <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase text-[var(--text-subtle)]">
            <Languages className="h-3.5 w-3.5" />
            {t("language")}
          </div>
          <div className="mt-1 grid gap-1">
            {locales.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => switchLocale(item)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-muted)]"
              >
                <span>{item === "zh-CN" ? t("localeZh") : t("localeEn")}</span>
                {locale === item ? <Check className="h-4 w-4 text-[var(--accent)]" /> : null}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase text-[var(--text-subtle)]">
            <Monitor className="h-3.5 w-3.5" />
            {t("theme")}
          </div>
          <div className="mt-1 grid gap-1">
            {(["light", "dark", "system"] as const).map((item) => {
              const Icon = themeIcons[item];
              const label =
                item === "light" ? t("themeLight") : item === "dark" ? t("themeDark") : t("themeSystem");
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTheme(item)}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-muted)]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[var(--text-muted)]" />
                    {label}
                  </span>
                  {theme === item ? <Check className="h-4 w-4 text-[var(--accent)]" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
