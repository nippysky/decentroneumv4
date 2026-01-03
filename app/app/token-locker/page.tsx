// app/app/token-locker/page.tsx
import type { Metadata } from "next";
import { APP_URL, appHref } from "@/src/lib/appEnv";
import TokenLockerClient from "./tokenLockerClient";


const canonical = `${APP_URL.replace(/\/+$/, "")}${appHref("token-locker")}`;

export const metadata: Metadata = {
  title: "Token Locker",
  description:
    "Lock ERC-20 tokens for a set time — simple, transparent, and on-chain.",
  alternates: { canonical },
  keywords: ["ETN-SC", "Electroneum", "Token Locker", "Token Locking", "Vesting"],
  openGraph: {
    title: "Token Locker • Decentroneum App",
    description:
      "Lock ERC-20 tokens for a set time — simple, transparent, and on-chain.",
    url: canonical,
    siteName: "Decentroneum",
    type: "website",
    images: [
      { url: "/opengraph-image.png", width: 1200, height: 630, alt: "Token Locker" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Token Locker • Decentroneum App",
    description:
      "Lock ERC-20 tokens for a set time — simple, transparent, and on-chain.",
    images: ["/opengraph-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function TokenLockerPage() {
  return <TokenLockerClient />;
}
