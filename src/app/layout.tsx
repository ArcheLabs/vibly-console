import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { defaultLocale, isAppLocale, localeCookieName, type AppLocale } from "@/lib/i18n/config";
import zhMessages from "../../messages/zh-CN.json";
import enMessages from "../../messages/en-US.json";

export const metadata: Metadata = {
  title: "Vibly Console",
  description: "Human-facing console for Vibly and Concord coordination networks.",
  icons: {
    icon: "/vibly.ico",
    shortcut: "/vibly.ico",
    apple: "/vibly.ico",
  },
};

const messageCatalog: Record<AppLocale, Record<string, unknown>> = {
  "zh-CN": zhMessages,
  "en-US": enMessages,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isAppLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <Providers locale={locale} messages={messageCatalog[locale]}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
