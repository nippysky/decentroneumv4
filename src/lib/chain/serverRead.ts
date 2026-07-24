// src/lib/chain/serverRead.ts
//
// SERVER-ONLY chain reads.
//
// The helpers in ./erc20.ts are client-side — they wrap the *injected*
// wallet (BrowserProvider), which doesn't exist on the server. Route
// handlers that need to verify a contract must talk to an RPC node
// directly, which is what this file is for.
//
// Deliberately no "use client": importing this into a client component
// should be a mistake you notice.
import { ethers } from "ethers";
import { electroneumChain } from "./networks";

/** Minimal read-only ERC-20 surface — all we need to verify a submission. */
const ERC20_READ_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

const RPC_TIMEOUT_MS = 10_000;

function provider() {
  const url = electroneumChain.rpc;
  // staticNetwork avoids an extra eth_chainId round-trip per request.
  return new ethers.JsonRpcProvider(url, electroneumChain.id, { staticNetwork: true });
}

export type VerifiedToken = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
};

export class TokenVerificationError extends Error {}

/**
 * Reads a token's real metadata straight from the chain.
 *
 * This is the whole point of server-side verification: we never trust the
 * name/symbol/decimals a submitter types. Decimals in particular must be
 * exact — listing a token with the wrong value would render wrong balances
 * in every wallet that picks up the registry.
 */
export async function verifyErc20(addressInput: string): Promise<VerifiedToken> {
  const address = addressInput.trim();

  if (!ethers.isAddress(address)) {
    throw new TokenVerificationError("That isn't a valid contract address.");
  }

  const p = provider();

  // Reject EOAs and undeployed addresses before attempting ABI calls, so we
  // can give a precise error instead of a generic decode failure.
  let code: string;
  try {
    code = await withTimeout(p.getCode(address), RPC_TIMEOUT_MS);
  } catch {
    throw new TokenVerificationError(
      "We couldn't reach the Electroneum network to verify this contract. Please try again shortly."
    );
  }

  if (!code || code === "0x") {
    throw new TokenVerificationError(
      "No contract found at that address on Electroneum Smart Chain. Check the address and the network."
    );
  }

  const contract = new ethers.Contract(address, ERC20_READ_ABI, p);

  try {
    const [name, symbol, decimals, totalSupply] = await withTimeout(
      Promise.all([
        contract.name() as Promise<string>,
        contract.symbol() as Promise<string>,
        contract.decimals() as Promise<bigint | number>,
        contract.totalSupply() as Promise<bigint>,
      ]),
      RPC_TIMEOUT_MS
    );

    return {
      address: ethers.getAddress(address), // checksummed
      name: String(name),
      symbol: String(symbol),
      decimals: Number(decimals),
      totalSupply: totalSupply.toString(),
    };
  } catch {
    throw new TokenVerificationError(
      "That contract doesn't expose a standard ERC-20 interface (name, symbol, decimals). Only ERC-20 tokens can be listed."
    );
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("RPC timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Confirms a logo URL is actually a reachable https image, so we never list
 * a token with a broken icon. HEAD first (cheap), falling back to a ranged
 * GET for servers that don't implement HEAD.
 */
export async function verifyLogoUrl(url: string): Promise<{ contentType: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new TokenVerificationError("The logo URL isn't a valid URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new TokenVerificationError("The logo URL must start with https://");
  }

  const check = async (method: "HEAD" | "GET") => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      return await fetch(parsed.toString(), {
        method,
        signal: controller.signal,
        headers: method === "GET" ? { range: "bytes=0-0" } : undefined,
        redirect: "follow",
      });
    } finally {
      clearTimeout(t);
    }
  };

  let res: Response;
  try {
    res = await check("HEAD");
    if (!res.ok || !res.headers.get("content-type")) res = await check("GET");
  } catch {
    throw new TokenVerificationError("We couldn't load that logo URL. Make sure it's publicly reachable.");
  }

  if (!res.ok) {
    throw new TokenVerificationError(`The logo URL returned HTTP ${res.status}. It must be publicly reachable.`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new TokenVerificationError(
      "That logo URL doesn't point to an image. Link directly to the image file (PNG, SVG or WebP)."
    );
  }

  return { contentType };
}
