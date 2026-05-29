"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import { useState, ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { getEvmConfig } from "@/lib/wallet/evmConfig";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { DevConsoleErrorFilter } from "@/lib/browser/DevConsoleErrorFilter";
import { ToastProvider } from "@/components/common/Toast";

export function Providers({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const content = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <DevConsoleErrorFilter />
      <ThemeProvider>
        <ToastProvider>
          <SessionProvider>
            <WagmiProvider config={getEvmConfig()}>{content}</WagmiProvider>
          </SessionProvider>
        </ToastProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
