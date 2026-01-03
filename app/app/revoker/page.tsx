// app/app/revoker/page.tsx
import type { Metadata } from "next";
import { APP_URL } from "@/src/lib/appEnv";
import RevokerClient from "./revokerClient";

const canonical = `${APP_URL.replace(/\/+$/, "")}/revoker`;

export const metadata: Metadata = {
  title: "Revoker",
  description:
    "Scan and revoke token approvals on Electroneum Smart Chain — ERC-20, ERC-721, and ERC-1155.",
  alternates: { canonical },
  keywords: ["ETN-SC", "Electroneum", "Revoker", "Token Approvals", "ERC20", "ERC721", "ERC1155"],
  openGraph: {
    title: "Revoker • Decentroneum App",
    description:
      "Scan and revoke token approvals on Electroneum Smart Chain — ERC-20, ERC-721, and ERC-1155.",
    url: canonical,
    siteName: "Decentroneum",
    type: "website",
    images: [
      { url: "/opengraph-image.png", width: 1200, height: 630, alt: "Revoker" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Revoker • Decentroneum App",
    description:
      "Scan and revoke token approvals on Electroneum Smart Chain — ERC-20, ERC-721, and ERC-1155.",
    images: ["/opengraph-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function RevokerPage() {
  return <RevokerClient />;
}
