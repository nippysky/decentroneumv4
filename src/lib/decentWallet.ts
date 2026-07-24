/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/decentWallet.ts
"use client";

import * as React from "react";

export type Eip1193Provider = {
  isDecentWallet?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, fn: (...args: any[]) => void) => void;
  removeListener?: (event: string, fn: (...args: any[]) => void) => void;
};

const DW_ADDRESS_STORAGE_KEY = "decent_wallet_address";
const DW_EVENT = "decent-wallet-address-changed";

function normalizeAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getEthereum(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

function readStoredAddress(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeAddress(window.localStorage.getItem(DW_ADDRESS_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStoredAddress(address: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (address) {
      window.localStorage.setItem(DW_ADDRESS_STORAGE_KEY, address);
    } else {
      window.localStorage.removeItem(DW_ADDRESS_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }

  window.dispatchEvent(
    new CustomEvent(DW_EVENT, {
      detail: { address },
    })
  );
}

export function isDecentWalletEnv() {
  const eth = getEthereum();
  return !!eth?.isDecentWallet;
}

export async function dwGetAccounts(): Promise<string[]> {
  const eth = getEthereum();
  if (!eth) return [];
  try {
    const acc = await eth.request({ method: "eth_accounts" });
    const accounts = Array.isArray(acc) ? acc.map(normalizeAddress).filter(Boolean) as string[] : [];
    writeStoredAddress(accounts[0] ?? null);
    return accounts;
  } catch {
    return [];
  }
}

export async function dwRequestAccounts(): Promise<string[]> {
  const eth = getEthereum();
  if (!eth) throw new Error("No injected provider");
  const acc = await eth.request({ method: "eth_requestAccounts" });
  const accounts = Array.isArray(acc) ? acc.map(normalizeAddress).filter(Boolean) as string[] : [];
  writeStoredAddress(accounts[0] ?? null);
  return accounts;
}

/**
 * “Disconnect” for injected wallets is not standardized, so we try the
 * available methods in order of how authoritative they are:
 *
 *  1. `dw_disconnect` — Decent Wallet's own method. This is the ONLY one
 *     that actually revokes the site's permission inside the native app.
 *     Without it, the site would clear its own UI while the wallet still
 *     considered this domain connected — so re-opening the page would
 *     silently reconnect, and the user would think disconnect was broken.
 *  2. `wallet_revokePermissions` — MetaMask and similar.
 *  3. `wallet_requestPermissions` — older fallback.
 *
 * Local state is cleared regardless, so the UI is always consistent even
 * if the wallet refuses or doesn't implement any of them.
 */
export async function dwDisconnect(): Promise<void> {
  const eth = getEthereum();
  if (!eth) {
    writeStoredAddress(null);
    return;
  }

  const attempts: { method: string; params?: any[] }[] = [];

  // Only Decent Wallet implements dw_disconnect — try it first when we're
  // actually running inside it.
  if (eth.isDecentWallet) {
    attempts.push({ method: "dw_disconnect" });
  }
  attempts.push({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
  attempts.push({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });

  for (const attempt of attempts) {
    try {
      await eth.request(attempt);
      break; // first one that succeeds is enough
    } catch {
      // try the next strategy
    }
  }

  writeStoredAddress(null);
}

export function useDecentWalletAccount() {
  const [ready, setReady] = React.useState(false);
  const [address, setAddress] = React.useState<string | null>(null);

  // The injected provider is NOT reliably present on first render:
  //  • during SSR there is no `window` at all;
  //  • inside the mobile app the provider is injected before page scripts,
  //    but the underlying RN bridge can attach a beat later.
  // Detecting once at mount would therefore sometimes conclude "not Decent
  // Wallet" permanently and fall back to the generic connect flow while
  // running *inside* Decent Wallet. So we poll briefly until it appears.
  const [eth, setEth] = React.useState<Eip1193Provider | null>(null);

  React.useEffect(() => {
    const found = getEthereum();
    if (found) {
      setEth(found);
      return;
    }

    let cancelled = false;
    let elapsed = 0;
    const STEP = 50;
    const MAX_WAIT = 2000;

    const timer = setInterval(() => {
      if (cancelled) return;
      const p = getEthereum();
      elapsed += STEP;
      if (p) {
        setEth(p);
        clearInterval(timer);
      } else if (elapsed >= MAX_WAIT) {
        // Genuinely no injected wallet — stop burning cycles.
        clearInterval(timer);
        setReady(true);
      }
    }, STEP);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const isDW = !!eth?.isDecentWallet;

  React.useEffect(() => {
    let alive = true;

    (async () => {
      const stored = readStoredAddress();
      if (alive && stored) {
        setAddress(stored);
      }

      // Wait for provider detection to settle before asking for accounts.
      if (!eth) return;

      const accounts = await dwGetAccounts();
      if (!alive) return;

      setAddress(accounts[0] ?? stored ?? null);
      setReady(true);
    })();

    return () => {
      alive = false;
    };
  }, [eth]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const onAddressChanged = (event: Event) => {
      const custom = event as CustomEvent<{ address?: string | null }>;
      setAddress(normalizeAddress(custom.detail?.address) ?? null);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === DW_ADDRESS_STORAGE_KEY) {
        setAddress(normalizeAddress(event.newValue) ?? null);
      }
    };

    window.addEventListener(DW_EVENT, onAddressChanged as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(DW_EVENT, onAddressChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  React.useEffect(() => {
    if (!eth?.on) return;

    const handler = (accounts: string[]) => {
      const next = Array.isArray(accounts)
        ? normalizeAddress(accounts[0]) ?? null
        : null;
      setAddress(next);
      writeStoredAddress(next);
    };

    eth.on("accountsChanged", handler);
    return () => eth.removeListener?.("accountsChanged", handler);
  }, [eth]);

  const connect = React.useCallback(async () => {
    const accounts = await dwRequestAccounts();
    const next = accounts[0] ?? null;
    setAddress(next);
    writeStoredAddress(next);
  }, []);

  const disconnect = React.useCallback(async () => {
    await dwDisconnect();
    setAddress(null);
    writeStoredAddress(null);
  }, []);

  return {
    ready,
    isDecentWallet: isDW,
    address,
    isConnected: !!address,
    connect,
    disconnect,
  };
}