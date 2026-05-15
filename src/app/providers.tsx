"use client";

import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useEffect, useState, ReactNode } from "react";
import { getEvmConfig } from "@/lib/wallet/evmConfig";

const WagmiProviderClient = dynamic(() => import("wagmi").then((mod) => mod.WagmiProvider), {
  ssr: false,
});

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const content = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  return (
    <SessionProvider>
      {mounted ? (
        <WagmiProviderClient config={getEvmConfig()}>
          {content}
        </WagmiProviderClient>
      ) : (
        content
      )}
    </SessionProvider>
  );
}
