// app/.well-known/apple-app-site-association/route.ts
//
// iOS Universal Links verification file.
//
// Why a route handler instead of a static file in public/:
// this file has NO extension, and Next serves unknown extensions as
// application/octet-stream. Apple requires application/json and will
// silently refuse to verify the domain otherwise — with no error anywhere,
// links just keep opening in Safari. A route handler lets us set the
// content type explicitly.
//
// Apple fetches this over HTTPS with no redirects allowed, from every domain
// listed in the app's associated-domains entitlement (see app.json in the
// decent-wallet repo: decentroneum.com AND app.decentroneum.com).
import { NextResponse } from "next/server";

// Matches ios.bundleIdentifier in the wallet's app.json.
const BUNDLE_ID = "com.decentroneum.wallet";

// 10-character Apple Developer Team ID. Set APPLE_TEAM_ID in Vercel →
// Settings → Environment Variables. Found at developer.apple.com →
// Membership details. Kept in env rather than hardcoded so it can be fixed
// without a code change, and so a placeholder can't silently ship.
const TEAM_ID = process.env.APPLE_TEAM_ID ?? "";

export const revalidate = 3600;

export async function GET() {
  if (!TEAM_ID) {
    // Fail loudly rather than serving a malformed file. A wrong appID is
    // worse than a missing one: iOS caches the association result, so a bad
    // file can keep links broken even after it's corrected.
    console.error("[aasa] APPLE_TEAM_ID is not set — universal links cannot verify.");
    return NextResponse.json(
      { error: "Not configured" },
      { status: 503, headers: { "content-type": "application/json" } }
    );
  }

  return NextResponse.json(
    {
      applinks: {
        // `apps` must be present and empty — legacy requirement.
        apps: [],
        details: [
          {
            appID: `${TEAM_ID}.${BUNDLE_ID}`,
            // Only claim the WalletConnect pairing path. Claiming "*" would
            // hijack every link to the domain — including the marketing site
            // and the D-App — and open them in the wallet instead of the
            // browser, which is emphatically not what we want.
            paths: ["/wc", "/wc/*"],
          },
        ],
      },
      // Not used yet, but harmless and expected by some tooling.
      webcredentials: { apps: [`${TEAM_ID}.${BUNDLE_ID}`] },
    },
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=3600",
      },
    }
  );
}
