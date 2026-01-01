// src/ui/WalletPill.tsx
"use client";

// If you currently use RainbowKit's ConnectButton, keep this import:
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { useDecentWalletAccount } from "@/src/lib/decentWallet";

function short(addr?: string | null) {
  if (!addr) return "";
  return addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function WalletPill() {
  const dw = useDecentWalletAccount();

  // Inside Decent Wallet: bypass RainbowKit and connect via injected provider
  if (dw.isDecentWallet) {
    return (
      <button
        onClick={() => {
          if (!dw.isConnected) dw.connect().catch(() => {});
        }}
        className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:opacity-95 transition"
        aria-label="Connect with Decent Wallet"
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            dw.isConnected ? "bg-emerald-500" : "bg-zinc-500"
          }`}
          aria-hidden="true"
        />
        {dw.isConnected ? short(dw.address) : "Connect"}
      </button>
    );
  }

  // Normal web: keep your existing RainbowKit behavior
  // This will show the wallet modal (Rainbow/MetaMask/WalletConnect/etc)
  return <ConnectButton />;
}
