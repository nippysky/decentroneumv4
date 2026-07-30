// src/lib/tokenList.ts
//
// THE canonical Electroneum Smart Chain token registry for Decentroneum.
//
// This is the single source of truth consumed by:
//   • Decent Wallet  — fetches /api/token-list.json on launch (6h cache) to
//                      decide which tokens every user sees in their wallet.
//   • The push server — fetches this same endpoint to decide which tokens to
//                      watch for incoming transfers, and to price. There is no
//                      second list to keep in step; this file is the only one.
//
// To list a new token: add an entry here with status "approved" and deploy.
// Every wallet picks it up within the cache window — no app release needed.
// That is the entire point of this file; do not hardcode token lists
// anywhere else.

export type TokenStatus = "approved" | "pending" | "rejected";

export type TokenEntry = {
  /** Checksummed contract address. */
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  /** Only "approved" entries are served to wallets. */
  status: TokenStatus;
};

export const TOKEN_LIST: TokenEntry[] = [
  {
    address: "0xE74e4E7A064310466f3bdBd3F3Ce4e8c8F7CF1d5",
    symbol: "DCNT",
    name: "Decentroneum",
    decimals: 18,
    logoURI:
      "https://static.electroswap.io/launchpad/presales/0x34b0dde73Ce7Dc241444B2d8A6Fe3dcB44c5FbEC_logo.webp",
    status: "approved",
  },
  {
    // Verified on-chain 2026-07-25 via the Electroneum block explorer:
    // name "ElectroSwap", symbol "BOLT", decimals 18, ERC-20,
    // total supply 100,000,000. Address is checksummed.
    address: "0x043fAa1b5C5FC9a7dc35171f290c29ECDE0cCff1",
    symbol: "BOLT",
    name: "ElectroSwap",
    decimals: 18,
    // CoinGecko-hosted asset. The ?1741576480 query string is CoinGecko's
    // cache-buster and is part of the canonical URL — dropping it can 404.
    logoURI: "https://assets.coingecko.com/coins/images/54787/standard/bolt.jpg?1741576480",
    status: "approved",
  },
];

/** Only the entries wallets should actually show. */
export const APPROVED_TOKENS = TOKEN_LIST.filter((t) => t.status === "approved");
