// app/app/decent-giver/page.tsx
import type { Metadata } from "next";
import { APP_URL } from "@/src/lib/appEnv";
import DecentGiverClient from "./giverClient";


const canonical = `${APP_URL.replace(/\/+$/, "")}/decent-giver`;

export const metadata: Metadata = {
  title: "Decent Giver",
  description:
    "Create donation campaigns and withdraw funds securely. A streamlined on-chain donation experience.",
  alternates: { canonical },
  keywords: ["decent giver", "donation", "campaigns", "funds", "on-chain", "electroneum"],
  openGraph: {
    title: "Decent Giver • Decentroneum App",
    description:
      "Create donation campaigns and withdraw funds securely. A streamlined on-chain donation experience.",
    url: canonical,
    siteName: "Decentroneum",
    type: "website",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Decent Giver" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Decent Giver • Decentroneum App",
    description:
      "Create donation campaigns and withdraw funds securely. A streamlined on-chain donation experience.",
    images: ["/opengraph-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function DecentGiverPage() {
  return <DecentGiverClient />;
}
