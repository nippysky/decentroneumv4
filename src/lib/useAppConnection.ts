// src/lib/useAppConnection.ts
"use client";

/**
 * useAppConnection — the hook the dApp screens use to read wallet state.
 *
 * This is now a thin adapter over UnifiedWalletProvider rather than its own
 * independent subscription. Previously it called useDecentWalletAccount()
 * directly, so every screen using it spun up yet another copy of
 * injected-provider detection and account state, in parallel with the
 * provider(s) above it. Those copies could drift out of sync, and each one
 * registered its own event listeners.
 *
 * The returned shape is kept identical to the old hook on purpose, so all
 * six dApp clients and AppGate keep working without edits.
 */
import * as React from "react";
import { useUnifiedWallet } from "@/src/providers/UnifiedWalletProvider";

export function useAppConnection() {
  const wallet = useUnifiedWallet();

  // Hydration guard: the server render has no wallet, so hold off on
  // reporting connection state until we're mounted on the client.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDecentWallet = wallet.walletType === "decent";

  return {
    mounted,
    isDecentWallet,
    address: mounted ? wallet.address ?? undefined : undefined,
    isConnected: mounted ? wallet.isConnected : false,
    /** "Connect now" CTA — routes through the one unified connect flow. */
    connectDW: wallet.connect,
  };
}
