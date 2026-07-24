"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThirdwebProvider } from "thirdweb/react";
import { UnifiedWalletProvider } from "@/src/providers/UnifiedWalletProvider";

/**
 * UnifiedWalletProvider is the single source of truth for wallet state.
 *
 * There used to be a second provider (ConnectedWalletProvider) wrapped
 * around this one, plus a standalone useAppConnection hook — three
 * independent copies of the same state, each separately subscribing to the
 * injected provider. Nothing consumed the second provider's context, and
 * three copies can disagree with each other. Now: one provider, one hook.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <ThirdwebProvider>
          <UnifiedWalletProvider>{children}</UnifiedWalletProvider>
        </ThirdwebProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
