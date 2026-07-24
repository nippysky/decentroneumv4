// src/lib/chain/erc20.ts
//
// The shared ERC-20 surface for every Decentroneum tool.
//
// Each dApp client used to carry its own hand-rolled ABI fragment —
// ERC20_MIN_ABI in the burner, ERC20_ABI in the locker,
// APPROVE_ERC_20_ABI in the bulk sender — all overlapping subsets of the
// same standard. That's four ways to be subtly wrong about one interface.
"use client";

import { ethers } from "ethers";
import { getProviderOrThrow } from "@/src/lib/chain/provider";

/**
 * Full read+write ERC-20 surface used across the tools. It's a standard
 * interface — there's no cost to declaring it once, completely.
 */
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
] as const;

export type TokenMeta = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  /** Raw on-chain balance of the queried owner, if one was supplied. */
  balance?: bigint;
};

/** Read-only ERC-20 contract handle bound to the injected provider. */
export async function getErc20(address: string) {
  const provider = await getProviderOrThrow();
  return new ethers.Contract(address, ERC20_ABI as unknown as string[], provider);
}

/** Signer-bound ERC-20 contract handle, for approve/transfer. */
export async function getErc20WithSigner(address: string, owner: string) {
  const provider = await getProviderOrThrow();
  const signer = await provider.getSigner(owner);
  return new ethers.Contract(address, ERC20_ABI as unknown as string[], signer);
}

/**
 * Loads a token's metadata (and optionally the owner's balance) in one
 * round of parallel calls. Throws if the address isn't a readable ERC-20,
 * which is what callers want — a token picker should reject junk input
 * rather than render a half-populated row.
 */
export async function readTokenMeta(address: string, owner?: string): Promise<TokenMeta> {
  if (!ethers.isAddress(address)) throw new Error("That doesn't look like a valid contract address");

  const contract = await getErc20(address);

  const [name, symbol, decimals, balance] = await Promise.all([
    contract.name() as Promise<string>,
    contract.symbol() as Promise<string>,
    contract.decimals() as Promise<bigint | number>,
    owner ? (contract.balanceOf(owner) as Promise<bigint>) : Promise.resolve(undefined),
  ]);

  return {
    address,
    name,
    symbol,
    decimals: Number(decimals),
    balance: balance as bigint | undefined,
  };
}

/**
 * Approve `spender` for exactly `amount`.
 *
 * Some tokens (USDT-style) revert when you change a non-zero allowance
 * directly, so on failure we reset to zero first and retry — the standard
 * workaround, kept in one place instead of re-derived per tool.
 */
export async function approveExact(
  token: ethers.Contract,
  spender: string,
  amount: bigint
): Promise<void> {
  try {
    const tx = await token.approve(spender, amount);
    await tx.wait();
  } catch {
    const reset = await token.approve(spender, BigInt(0));
    await reset.wait();
    const tx = await token.approve(spender, amount);
    await tx.wait();
  }
}

/** True when `owner` has already approved at least `amount` to `spender`. */
export async function hasSufficientAllowance(
  token: ethers.Contract,
  owner: string,
  spender: string,
  amount: bigint
): Promise<boolean> {
  const current: bigint = await token.allowance(owner, spender);
  return current >= amount;
}
