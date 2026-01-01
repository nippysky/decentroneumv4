/* eslint-disable @typescript-eslint/no-explicit-any */
// app/app/page.tsx
"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { Container } from "@/src/ui/Container";

function GateCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-7">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted leading-relaxed">{desc}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

type EthDebug = {
  hasEthereum: boolean;
  isDecentWallet: boolean;
  isMetaMask: boolean;
  hasRequest: boolean;
  hasOn: boolean;
  hasRemoveListener: boolean;
  chainId?: string;
  selectedAddress?: string | null;
  accounts?: string[];
  ua: string;
};

function shortAddr(a?: string | null) {
  if (!a) return "";
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function readEthDebug(): EthDebug {
  const w = window as unknown as {
    ethereum?: any;
    navigator: Navigator;
  };

  const eth = w.ethereum;
  const hasEthereum = !!eth;

  const safeBool = (v: any) => Boolean(v);

  return {
    hasEthereum,
    isDecentWallet: safeBool(eth?.isDecentWallet),
    isMetaMask: safeBool(eth?.isMetaMask),
    hasRequest: typeof eth?.request === "function",
    hasOn: typeof eth?.on === "function",
    hasRemoveListener: typeof eth?.removeListener === "function",
    chainId: typeof eth?.chainId === "string" ? eth.chainId : undefined,
    selectedAddress: typeof eth?.selectedAddress === "string" ? eth.selectedAddress : null,
    accounts: Array.isArray(eth?.selectedAddress)
      ? eth.selectedAddress
      : Array.isArray(eth?.accounts)
        ? eth.accounts
        : undefined,
    ua: w.navigator.userAgent,
  };
}

function DebugBanner() {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [snap, setSnap] = React.useState<EthDebug | null>(null);

  React.useEffect(() => {
    setMounted(true);

    const update = () => {
      try {
        setSnap(readEthDebug());
      } catch {
        setSnap({
          hasEthereum: false,
          isDecentWallet: false,
          isMetaMask: false,
          hasRequest: false,
          hasOn: false,
          hasRemoveListener: false,
          ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
        });
      }
    };

    update();

    // Listen for late injections (common in WebViews)
    const onInit = () => update();
    window.addEventListener("ethereum#initialized" as any, onInit);

    // Some providers emit these
    const eth = (window as any).ethereum;
    const onAccounts = () => update();
    const onChain = () => update();
    const onConnect = () => update();
    const onDisconnect = () => update();

    try {
      eth?.on?.("accountsChanged", onAccounts);
      eth?.on?.("chainChanged", onChain);
      eth?.on?.("connect", onConnect);
      eth?.on?.("disconnect", onDisconnect);
    } catch {
      // ignore
    }

    // Also poll briefly because some WebViews inject without events
    let ticks = 0;
    const iv = window.setInterval(() => {
      ticks += 1;
      update();
      if (ticks >= 10) window.clearInterval(iv); // ~2.5s total
    }, 250);

    return () => {
      window.removeEventListener("ethereum#initialized" as any, onInit);
      window.clearInterval(iv);
      try {
        eth?.removeListener?.("accountsChanged", onAccounts);
        eth?.removeListener?.("chainChanged", onChain);
        eth?.removeListener?.("connect", onConnect);
        eth?.removeListener?.("disconnect", onDisconnect);
      } catch {
        // ignore
      }
    };
  }, []);

  if (!mounted || !snap) return null;

  const status =
    snap.hasEthereum && snap.hasRequest
      ? snap.isDecentWallet
        ? "Injected: Decent Wallet"
        : snap.isMetaMask
          ? "Injected: MetaMask"
          : "Injected: Unknown"
      : "No injected provider";

  const badgeTone =
    status === "No injected provider"
      ? "border-danger/40 text-danger"
      : snap.isDecentWallet
        ? "border-accent/40 text-accent"
        : "border-foreground/20 text-foreground";

  const isBad = status === "No injected provider" || !snap.hasOn || !snap.hasRemoveListener;

  return (
    <div className="mt-6">
      <div
        className={[
          "rounded-2xl border bg-background px-4 py-3",
          isBad ? "border-danger/30" : "border-border",
        ].join(" ")}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${badgeTone}`}>
              {status}
            </span>

            {snap.chainId ? (
              <span className="text-xs text-muted">
                chainId: <span className="text-foreground/90">{snap.chainId}</span>
              </span>
            ) : null}

            {snap.selectedAddress ? (
              <span className="text-xs text-muted">
                addr: <span className="text-foreground/90">{shortAddr(snap.selectedAddress)}</span>
              </span>
            ) : null}

            <span className="text-xs text-muted">
              request: <span className="text-foreground/90">{snap.hasRequest ? "yes" : "no"}</span> • on:{" "}
              <span className="text-foreground/90">{snap.hasOn ? "yes" : "no"}</span> • removeListener:{" "}
              <span className="text-foreground/90">{snap.hasRemoveListener ? "yes" : "no"}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-muted hover:text-foreground transition"
          >
            {open ? "Hide debug" : "Show debug"}
          </button>
        </div>

        {open ? (
          <div className="mt-3 rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted leading-relaxed">
              <div>
                <span className="font-medium text-foreground/90">User agent:</span> {snap.ua}
              </div>
              <div className="mt-2">
                <span className="font-medium text-foreground/90">Notes:</span>{" "}
                If you’re inside Decent Wallet and this says “No injected provider”, your WebView injection is happening
                too late. In Expo WebView, the provider must be injected with{" "}
                <span className="text-foreground/90">injectedJavaScriptBeforeContentLoaded</span>.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AppHome() {
  const { isConnected } = useAccount();

  return (
    <div className="pt-10 sm:pt-14">
      <Container>
        {/* Debug banner (temporary while we validate Decent Wallet injection) */}
        <DebugBanner />

        {!isConnected ? (
          <div className="mt-6 rounded-3xl border border-border bg-card p-8 sm:p-10">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Connect once. Access everything.
            </h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted leading-relaxed">
              Connect your wallet to unlock the Decentroneum app. Your connection will be
              reused across tools so you don’t have to reconnect for every dApp.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <GateCard
                title="Recommended"
                desc="Use the Connect button in the top-right to connect with your preferred wallet."
              >
                <div className="text-xs text-muted">
                  Tip: If you’re using Decent Wallet, open this page inside the wallet’s browser.
                </div>
              </GateCard>

              <GateCard
                title="Why this matters"
                desc="Fewer prompts, fewer failed sessions, and a consistent connection experience across the app."
              >
                <div className="text-xs text-muted">
                  RainbowKit handles injected wallets and WalletConnect under one UX.
                </div>
              </GateCard>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-border bg-card p-8 sm:p-10">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Welcome to Decentroneum
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
              You’re connected. Next we’ll drop in the dApp grid and route each tool into a
              unified shell.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {["Token Tools", "Approvals", "NFTs", "Utilities", "Community", "More"].map((t) => (
                <div key={t} className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="mt-1 text-xs text-muted">Coming next.</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
