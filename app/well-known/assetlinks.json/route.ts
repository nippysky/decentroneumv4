// app/.well-known/assetlinks.json/route.ts
//
// Android App Links verification file (Digital Asset Links).
//
// Android's verifier fetches this when the app is installed and checks that
// the SHA-256 fingerprint here matches the certificate the installed APK was
// actually signed with. If it doesn't match, `autoVerify` silently fails and
// links keep opening in Chrome.
//
// IMPORTANT: the fingerprint depends on the signing key, and you will likely
// have more than one:
//   • Play App Signing  — Google re-signs your upload. The fingerprint that
//     matters for production is the one Play Console shows under
//     "App integrity → App signing key certificate".
//   • Local/EAS debug builds use a different key entirely.
// Both can be listed; Android accepts an array of statements. That's why
// ANDROID_SHA256_FINGERPRINTS is comma-separated.
import { NextResponse } from "next/server";

// Matches android.package in the wallet's app.json.
const PACKAGE_NAME = "com.decentroneum.wallet";

/**
 * Comma-separated SHA-256 fingerprints, colon-delimited hex, e.g.
 *   AA:BB:CC:...:FF,11:22:33:...:99
 * Set ANDROID_SHA256_FINGERPRINTS in Vercel → Environment Variables.
 */
const FINGERPRINTS = (process.env.ANDROID_SHA256_FINGERPRINTS ?? "")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

export const revalidate = 3600;

export async function GET() {
  if (FINGERPRINTS.length === 0) {
    console.error("[assetlinks] ANDROID_SHA256_FINGERPRINTS is not set — App Links cannot verify.");
    return NextResponse.json([], {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: PACKAGE_NAME,
          sha256_cert_fingerprints: FINGERPRINTS,
        },
      },
    ],
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=3600",
      },
    }
  );
}
