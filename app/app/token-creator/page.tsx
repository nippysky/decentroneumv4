// app/app/token-creator/page.tsx
import type { Metadata } from "next";
import { APP_URL } from "@/src/lib/appEnv";
import TokenCreatorClient from "./tokenCreatorClient";

const canonical = `${APP_URL.replace(/\/+$/, "")}/token-creator`;

export const metadata: Metadata = {
  title: "Token Creator",
  description:
    "Create an ETN-SC token in seconds. Set name, symbol, supply — deploy on-chain.",
  alternates: { canonical },
  keywords: ["ETN-SC", "Electroneum", "Token Creator", "ERC20", "Token Launch"],
  openGraph: {
    title: "Token Creator • Decentroneum App",
    description:
      "Create an ETN-SC token in seconds. Set name, symbol, supply — deploy on-chain.",
    url: canonical,
    siteName: "Decentroneum",
    type: "website",
    images: [
      { url: "/opengraph-image.png", width: 1200, height: 630, alt: "Token Creator" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Token Creator • Decentroneum App",
    description:
      "Create an ETN-SC token in seconds. Set name, symbol, supply — deploy on-chain.",
    images: ["/opengraph-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function TokenCreatorPage() {
  return <TokenCreatorClient />;
}
