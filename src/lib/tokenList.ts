// src/lib/tokenList.ts
//
// THE canonical Electroneum Smart Chain token registry for Decentroneum.
//
// This is the single source of truth consumed by:
//   • Decent Wallet  — fetches /api/token-list.json on launch (6h cache) to
//                      decide which tokens every user sees in their wallet.
//   • The push server — its TRACKED_TOKENS list should be derived from the
//                      same addresses, or users get no notification for a
//                      token the wallet happily displays.
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
];

/** Only the entries wallets should actually show. */
export const APPROVED_TOKENS = TOKEN_LIST.filter((t) => t.status === "approved");

/**
 * Comma-separated addresses, ready to paste into the push server's
 * TRACKED_TOKENS env var. Exposed via the API response's `trackedTokens`
 * field so the two systems can be reconciled without hand-copying.
 */
export const TRACKED_TOKENS_CSV = APPROVED_TOKENS.map((t) => t.address).join(",");
