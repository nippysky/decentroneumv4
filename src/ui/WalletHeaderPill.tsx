// src/ui/WalletHeaderPill.tsx
"use client";

import * as React from "react";
import { useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletHeaderPill() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = React.useState(false);

  if (!account) return null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  };

  return (
    <details className="relative group">
      <summary
        className="
          list-none cursor-pointer
          inline-flex items-center gap-2
          rounded-full border border-border bg-card px-3 py-2
          text-sm font-semibold
          hover:border-foreground/20 hover:bg-card/80 transition
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
        "
        aria-label="Wallet menu"
      >
        <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_18%,transparent)]" />
        <span>{shortAddress(account.address)}</span>
      </summary>

      <div
        className="
          absolute right-0 mt-2 w-60
          rounded-2xl border border-border bg-card p-2
          shadow-[0_10px_40px_rgba(0,0,0,0.35)]
        "
      >
        <button
          type="button"
          onClick={onCopy}
          className="
            w-full text-left rounded-xl px-3 py-2 text-sm
            hover:bg-background transition
          "
        >
          {copied ? "Copied address" : "Copy address"}
        </button>

        <div className="my-1 h-px bg-border/70" />

        <button
          type="button"
          onClick={() => {
            if (wallet) disconnect(wallet);
          }}
          className="
            w-full text-left rounded-xl px-3 py-2 text-sm
            hover:bg-background transition
          "
        >
          Disconnect
        </button>
      </div>
    </details>
  );
}
