// src/ui/ConnectGate.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { client } from "@/src/lib/client";
import { electroneum } from "@/src/lib/chain";
import { Button } from "@/src/ui/Button";

import {
  ConnectButton,
  useActiveAccount,
  useConnect,
  darkTheme,
  lightTheme,
} from "thirdweb/react";
import { createWallet, EIP1193 } from "thirdweb/wallets";

/**
 * Strict EIP-1193 shape required by thirdweb's adapter:
 * - request()
 * - on()
 * - removeListener()
 */
type StrictEip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on: (event: unknown, listener: (params: unknown) => unknown) => void;
  removeListener: (event: unknown, listener: (params: unknown) => unknown) => void;
};

type LooseInjectedProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: unknown, listener: (params: unknown) => unknown) => void;
  removeListener?: (event: unknown, listener: (params: unknown) => unknown) => void;

  // common flags (not always present / reliable)
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isBraveWallet?: boolean;

  // metamask-specific object (helps us be confident when it actually is MetaMask)
  _metamask?: unknown;

  // some environments expose multiple injected providers
  providers?: LooseInjectedProvider[];
};

// Thirdweb modal wallets
const wallets = [
  createWallet("io.metamask"),
  createWallet("io.rabby"),
  createWallet("com.coinbase.wallet"),
];
const recommendedWallets = [createWallet("io.metamask"), createWallet("io.rabby")];

function useInjectedEthereum() {
  const [eth, setEth] = React.useState<LooseInjectedProvider | null>(null);

  React.useEffect(() => {
    const w = globalThis as unknown as { ethereum?: LooseInjectedProvider };
    setEth(w.ethereum ?? null);
  }, []);

  return eth;
}

function pickInjectedProvider(eth: LooseInjectedProvider | null) {
  if (!eth) return null;

  const list = Array.isArray(eth.providers) && eth.providers.length > 0 ? eth.providers : null;
  if (!list) return eth;

  // Prefer explicit providers if multiple exist
  const rabby = list.find((p) => p.isRabby);
  if (rabby) return rabby;

  const coinbase = list.find((p) => p.isCoinbaseWallet);
  if (coinbase) return coinbase;

  // MetaMask-like providers are common; only treat as MetaMask when confident later
  const metaLike = list.find((p) => p.isMetaMask);
  if (metaLike) return metaLike;

  return list[0] ?? eth;
}

function detectInjectedLabel(p: LooseInjectedProvider | null): { label: string; confident: boolean } {
  if (!p) return { label: "No wallet detected", confident: false };

  if (p.isRabby) return { label: "Rabby", confident: true };
  if (p.isCoinbaseWallet) return { label: "Coinbase Wallet", confident: true };
  if (p.isBraveWallet) return { label: "Brave Wallet", confident: true };

  // MetaMask flag is often spoofed for compatibility — only call it MetaMask if it exposes _metamask
  if (p.isMetaMask && p._metamask) return { label: "MetaMask", confident: true };

  // Otherwise stay neutral
  return { label: "Injected wallet", confident: false };
}

function toStrictProvider(p: LooseInjectedProvider): StrictEip1193Provider {
  const noop = () => undefined;

  return {
    request: p.request,
    on: p.on ?? noop,
    removeListener: p.removeListener ?? noop,
  };
}

function useThirdwebBrandTheme() {
  const { resolvedTheme } = useTheme();

  const [vars, setVars] = React.useState({
    bg: "#ffffff",
    card: "#ffffff",
    text: "#000000",
    border: "#e5e5e5",
    accent: "#4DEE54",
    primary: "#0B1220",
    muted: "#6B7280",
  });

  React.useEffect(() => {
    const root = document.documentElement;
    const s = getComputedStyle(root);
    const get = (k: string, fallback: string) => s.getPropertyValue(k).trim() || fallback;

    setVars({
      bg: get("--background", "#ffffff"),
      card: get("--card", "#ffffff"),
      text: get("--foreground", "#000000"),
      border: get("--border", "#e5e5e5"),
      accent: get("--accent", "#4DEE54"),
      primary: get("--primary", "#0B1220"),
      muted: get("--muted", "#6B7280"),
    });
  }, [resolvedTheme]);

  const isDark = resolvedTheme === "dark";

  // Critical: green buttons must use “ink” text (not green)
  const accentInk = vars.bg;

  return isDark
    ? darkTheme({
        colors: {
          modalBg: vars.card,
          borderColor: vars.border,
          primaryText: vars.text,
          secondaryText: vars.muted,

          accentButtonBg: vars.accent,
          accentText: accentInk,

          primaryButtonBg: vars.accent,
          primaryButtonText: accentInk,

          secondaryButtonBg: vars.bg,
          secondaryButtonText: vars.text,

          connectedButtonBg: vars.bg,
          connectedButtonBgHover: vars.card,
        },
        fontFamily: "Lexend",
      })
    : lightTheme({
        colors: {
          modalBg: vars.card,
          borderColor: vars.border,
          primaryText: vars.text,
          secondaryText: vars.muted,

          accentButtonBg: vars.primary,
          accentText: vars.bg,

          primaryButtonBg: vars.primary,
          primaryButtonText: vars.bg,

          secondaryButtonBg: vars.bg,
          secondaryButtonText: vars.text,

          connectedButtonBg: vars.bg,
          connectedButtonBgHover: vars.card,
        },
        fontFamily: "Lexend",
      });
}

export function ConnectGate({
  title = "Connect once. Access everything.",
  subtitle = "Connect your wallet to unlock the Decentroneum app and use all ecosystem dApps in one place.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const account = useActiveAccount();
  const injectedEth = useInjectedEthereum();
  const injected = pickInjectedProvider(injectedEth);
  const injectedInfo = detectInjectedLabel(injected);

  const { connect, isConnecting } = useConnect();
  const thirdwebTheme = useThirdwebBrandTheme();

  const onQuickConnect = async () => {
    if (!injected) return;

    const strict = toStrictProvider(injected);

    await connect(async () => {
      const wallet = EIP1193.fromProvider({ provider: strict });
      await wallet.connect({ client, chain: electroneum });
      return wallet;
    });
  };

  // Once connected, we show the dApp grid; header pill handles status + disconnect globally.
  if (account) return null;

  return (
    <section
      aria-label="Connect wallet gate"
      className="rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-[0_1px_0_rgba(255,255,255,0.06)]"
    >
      <header className="max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">{subtitle}</p>
      </header>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-border/80 bg-background p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Wallet Extension / In-App Browser</div>

            {injected ? (
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground/80">
                {injectedInfo.confident ? `Detected: ${injectedInfo.label}` : "Wallet detected"}
              </span>
            ) : (
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted">
                Not detected
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-muted leading-relaxed">
            Recommended for wallets that inject a provider (extensions and in-app wallet browsers).
          </p>

          <div className="mt-5">
            <Button
              size="lg"
              onClick={onQuickConnect}
              disabled={!injected || isConnecting}
              className="w-full sm:w-auto"
              title={!injected ? "No injected wallet detected in this browser" : undefined}
            >
              {!injected ? "Open in a wallet browser" : isConnecting ? "Connecting…" : "Continue"}
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted">
            Tip: If you’re using Decent Wallet, open this page inside the wallet browser.
          </p>
        </div>

        <div className="rounded-3xl border border-border/80 bg-background p-6">
          <div className="text-sm font-semibold">Other connection methods</div>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Use the standard connector to choose from supported wallets.
          </p>

          <div className="mt-5">
            <ConnectButton
              client={client}
              chain={electroneum}
              wallets={wallets}
              recommendedWallets={recommendedWallets}
              theme={thirdwebTheme}
              connectModal={{
                size: "compact",
                title: "Connect Wallet",
                showThirdwebBranding: false,
              }}
            />
          </div>

          <p className="mt-3 text-xs text-muted">
            For the smoothest in-wallet experience, use the option on the left.
          </p>
        </div>
      </div>
    </section>
  );
}
