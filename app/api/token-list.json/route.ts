// app/api/token-list.json/route.ts
//
// Serves the canonical token registry to Decent Wallet.
//
// The wallet has always fetched this URL (see REGISTRY_URL in
// src/lib/tokens/registry.ts) but the route did not exist — the request
// failed silently and every wallet fell back to its hardcoded
// DEFAULT_TOKENS forever. That made the whole "list a token once, it shows
// up in every wallet" workflow inert. This is that missing endpoint.
//
// Response shape matches TokenListResponseSchema on the wallet side. The
// wallet also tolerates a bare array and drops malformed entries
// individually, so adding fields here is safe.
import { NextResponse } from "next/server";
import { APPROVED_TOKENS } from "@/src/lib/tokenList";

// Static content — let the CDN hold it, and let the wallet's own 6h cache
// do the rest. Revalidate hourly so a newly listed token propagates
// reasonably fast without hammering the origin.
export const revalidate = 3600;

export async function GET() {
  return NextResponse.json(
    {
      name: "Decentroneum Token List",
      timestamp: new Date().toISOString(),
      // Bump when the shape changes in a breaking way.
      version: { major: 1, minor: 0, patch: 0 },
      tokens: APPROVED_TOKENS.map(({ address, symbol, name, decimals, logoURI }) => ({
        address,
        symbol,
        name,
        decimals,
        logoURI,
        chainId: 52014,
        status: "approved" as const,
      })),
    },
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Wallets are on mobile networks; allow a stale copy while revalidating.
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
        // The wallet fetches this cross-origin from the app's WebView/runtime.
        "access-control-allow-origin": "*",
      },
    }
  );
}
