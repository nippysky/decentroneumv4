// app/app/bulk-sender/page.tsx
import type { Metadata } from "next";
import { APP_URL } from "@/src/lib/appEnv";
import BulkSenderClient from "./bulkSenderClient";


const canonical = `${APP_URL.replace(/\/+$/, "")}/bulk-sender`;

export const metadata: Metadata = {
  title: "Bulk Sender",
  description:
    "Send ERC-20 tokens to many addresses in one transaction. Upload or paste a CSV, review totals, approve, and send.",
  alternates: { canonical },
  keywords: [
    "Electroneum",
    "ETN-SC",
    "Bulk Sender",
    "Airdrop",
    "ERC20",
    "Token Distribution",
  ],
  openGraph: {
    title: "Bulk Sender • Decentroneum App",
    description:
      "Send ERC-20 tokens to many addresses in one transaction. Upload or paste a CSV, review totals, approve, and send.",
    url: canonical,
    siteName: "Decentroneum",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Bulk Sender",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bulk Sender • Decentroneum App",
    description:
      "Send ERC-20 tokens to many addresses in one transaction. Upload or paste a CSV, review totals, approve, and send.",
    images: ["/opengraph-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function BulkSenderPage() {
  return <BulkSenderClient />;
}
