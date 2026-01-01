"use client";

import * as React from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  lightTheme,
  darkTheme,
} from "@rainbow-me/rainbowkit";

import { wagmiConfig } from "@/src/lib/wagmi";

function RainbowThemedProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <RainbowKitProvider
      modalSize="compact"
      appInfo={{
        appName: "Decentroneum",
        learnMoreUrl: "https://decentroneum.com",
      }}
      theme={
        isDark
          ? darkTheme({
              accentColor: "#4DEE54",
              accentColorForeground: "#060807",
              borderRadius: "large",
              overlayBlur: "small",
              fontStack: "system",
            })
          : lightTheme({
              accentColor: "#4DEE54",
              accentColorForeground: "#0B1220",
              borderRadius: "large",
              overlayBlur: "small",
              fontStack: "system",
            })
      }
    >
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowThemedProvider>{children}</RainbowThemedProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
