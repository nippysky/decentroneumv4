"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThirdwebProvider } from "thirdweb/react";
import { ConnectedWalletProvider } from "@/src/providers/ConnectedWalletProvider";
import { UnifiedWalletProvider } from "@/src/providers/UnifiedWalletProvider";


export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <ThirdwebProvider>
          <ConnectedWalletProvider>
            <UnifiedWalletProvider>
              {children}
            </UnifiedWalletProvider>
          </ConnectedWalletProvider>
        </ThirdwebProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
