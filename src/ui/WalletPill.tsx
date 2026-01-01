// src/ui/WalletPill.tsx
"use client";

import * as React from "react";

import ConnectWallet from "@/src/ui/connectWallet";
import { useDecentWalletAccount } from "@/src/lib/decentWallet";

function shorten(addr: string) {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export function WalletPill() {
  const dw = useDecentWalletAccount();
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // ✅ If we’re NOT inside Decent Wallet, just render Thirdweb’s ConnectButton
  if (!dw.isDecentWallet) {
    return <ConnectWallet />;
  }

  // ✅ Inside Decent Wallet: our own clean pill + dropdown
  if (!dw.ready) {
    return (
      <div className="h-10 w-27.5 animate-pulse rounded-full border border-border bg-card" />
    );
  }

  if (!dw.isConnected || !dw.address) {
    return (
      <button
        onClick={() => dw.connect()}
        className="h-10 rounded-full bg-accent px-4 text-sm font-semibold text-black hover:opacity-95 active:opacity-90"
      >
        Connect
      </button>
    );
  }

  const address = dw.address;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-background/60 active:scale-[0.99]"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
        <span className="tabular-nums">{shorten(address)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-80">
          <path
            fill="currentColor"
            d="M7 10l5 5l5-5z"
          />
        </svg>
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setCopied(false);
        }}
      >
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold">Wallet</div>
              <div className="mt-1 text-xs text-muted">
                Connected via Decent Wallet (in-app browser)
              </div>
            </div>
            <button
              className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-card"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-background p-4">
            <div className="text-xs text-muted">Address</div>
            <div className="mt-1 break-all text-sm font-semibold">{address}</div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={async () => {
                  const ok = await copyToClipboard(address);
                  setCopied(ok);
                  setTimeout(() => setCopied(false), 1200);
                }}
                className="flex-1 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-background/60"
              >
                {copied ? "Copied!" : "Copy address"}
              </button>

              <button
                onClick={async () => {
                  await dw.disconnect();
                  setOpen(false);
                }}
                className="flex-1 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/15"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
