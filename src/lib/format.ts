// src/lib/format.ts
//
// Display + error-message helpers shared by every dApp client.
//
// `shorten`, `prettyNumber` and `shortErr` were each defined separately in
// three or more clients — same intent, slightly different implementations,
// so the same address could render differently on two pages.
"use client";

/** 0x1234…abcd — consistent address truncation everywhere. */
export function shorten(addr: string, lead = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= lead + tail + 1) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

/** Human-readable amount with thousands separators. */
export function prettyNumber(value: string | number, maxFrac = 6): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

/**
 * Turns a wallet/RPC error into something worth showing a user.
 *
 * Wallet errors are notoriously verbose — a rejected signature can arrive
 * as a multi-paragraph JSON-RPC dump. The most important case is the user
 * simply declining, which should read as a calm cancellation, not a
 * failure.
 */
export function shortErr(e: unknown): string {
  if (!e) return "Transaction failed";
  if (typeof e === "string") return e;

  const err = e as {
    code?: string | number;
    reason?: string;
    shortMessage?: string;
    info?: { error?: { message?: string } };
    message?: string;
  };

  // User rejected in their wallet — EIP-1193 code 4001 / ethers ACTION_REJECTED.
  if (err.code === 4001 || err.code === "ACTION_REJECTED") {
    return "You rejected the request in your wallet.";
  }

  const candidate =
    err.shortMessage ?? err.reason ?? err.info?.error?.message ?? err.message ?? "Transaction failed";

  // Trim the giant RPC payloads some wallets attach.
  const firstLine = String(candidate).split("\n")[0].trim();
  return firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine;
}
