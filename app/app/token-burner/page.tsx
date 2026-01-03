// app/app/token-burner/page.tsx
import type { Metadata } from "next";
import { APP_URL } from "@/src/lib/appEnv";
import TokenBurnerClient from "./tokenBurnerClient";


const canonical = `${APP_URL.replace(/\/+$/, "")}/token-burner`;

export const metadata: Metadata = {
  title: "Token Burner",
  description:
    "Burn tokens by sending them to the burn address. Irreversible — use carefully.",
  alternates: { canonical },
  keywords: ["ETN-SC", "Electroneum", "Token Burner", "ERC20", "Burn"],
  openGraph: {
    title: "Token Burner • Decentroneum App",
    description:
      "Burn tokens by sending them to the burn address. Irreversible — use carefully.",
    url: canonical,
    siteName: "Decentroneum",
    type: "website",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Token Burner" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Token Burner • Decentroneum App",
    description:
      "Burn tokens by sending them to the burn address. Irreversible — use carefully.",
    images: ["/opengraph-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function TokenBurnerPage() {
  return <TokenBurnerClient />;
}
