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
  useActiveWallet,
  useConnect,
  useDisconnect,
  darkTheme,
  lightTheme,
} from "thirdweb/react";
import { createWallet, EIP1193 } from "thirdweb/wallets";

/**
 * Strict EIP-1193 shape required by thirdweb's EIP1193 adapter:
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
  isMetaMask?: boolean;
  isRabby?: boolean;
};

// “More options” wallets (thirdweb modal)
const wallets = [
  createWallet("io.metamask"),
  createWallet("io.rabby"),
  createWallet("com.coinbase.wallet"),
];

const recommendedWallets = [createWallet("io.metamask"), createWallet("io.rabby")];

function useInjectedProvider() {
  const [provider, setProvider] = React.useState<LooseInjectedProvider | null>(null);

  React.useEffect(() => {
    const w = globalThis as unknown as { ethereum?: LooseInjectedProvider };
    setProvider(w.ethereum ?? null);
  }, []);

  return provider;
}

/**
 * Normalize an injected provider into the strict shape thirdweb expects.
 * Some wallets omit `on` / `removeListener`, so we supply safe no-ops.
 */
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

  return isDark
    ? darkTheme({
        colors: {
          modalBg: vars.card,
          borderColor: vars.border,
          primaryText: vars.text,
          secondaryText: vars.muted,

          accentButtonBg: vars.accent,
          accentText: vars.primary,

          primaryButtonBg: vars.accent,
          primaryButtonText: vars.primary,

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
  const activeWallet = useActiveWallet();
  const injected = useInjectedProvider();
  const { connect, isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
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

  if (account) {
    const addr = account.address;
    const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`;

    return (
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Connected</div>
            <div className="mt-1 text-sm text-muted">Wallet: {short}</div>
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              if (activeWallet) disconnect(activeWallet);
            }}
            className="w-full sm:w-auto"
          >
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

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
          <div className="text-sm font-semibold">Browser Wallet</div>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Best for injected wallets (including in-app browsers and most extensions).
          </p>

          <div className="mt-5">
            <Button
              size="lg"
              onClick={onQuickConnect}
              disabled={!injected || isConnecting}
              className="w-full sm:w-auto"
              title={!injected ? "No injected wallet detected in this browser" : undefined}
            >
              {!injected
                ? "No Browser Wallet Found"
                : isConnecting
                ? "Connecting…"
                : "Continue with Browser Wallet"}
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted">
            Tip: If you’re using Decent Wallet, open this page inside the wallet browser.
          </p>
        </div>

        <div className="rounded-3xl border border-border/80 bg-background p-6">
          <div className="text-sm font-semibold">More options</div>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Use the standard connector for supported wallets and connection methods.
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
        </div>
      </div>
    </section>
  );
}
