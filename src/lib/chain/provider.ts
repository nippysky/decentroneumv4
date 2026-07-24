// src/lib/chain/provider.ts
//
// One place to reach the connected wallet's provider/signer.
//
// `getProviderOrThrow` was previously copy-pasted into five separate dApp
// clients (bulk-sender, token-burner, token-locker, decent-giver, and the
// giver package page). Identical bodies, five chances to drift.
"use client";

import { ethers } from "ethers";

/**
 * Returns an ethers provider wrapping the injected wallet.
 * Throws a user-presentable error if no wallet is available.
 */
export async function getProviderOrThrow(): Promise<ethers.BrowserProvider> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Wallet provider not found");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

/** Provider + signer for `address`, in one call — the common case. */
export async function getSignerOrThrow(address: string): Promise<ethers.JsonRpcSigner> {
  const provider = await getProviderOrThrow();
  return provider.getSigner(address);
}
