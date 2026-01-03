// app/app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { WalletPill } from "@/src/ui/WalletPill";
import { Container } from "@/src/ui/Container";
import { AppTopNav } from "@/src/ui/AppTopNav";
import { APP_URL, appHref } from "@/src/lib/appEnv";
import { AppGate } from "./AppGate";
import { SiteFooter } from "@/src/ui/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: "App",
    template: "%s • Decentroneum App",
  },
  description:
    "Decentroneum App — connect once and access ecosystem tools across the Electroneum Smart Chain.",
  alternates: { canonical: APP_URL },
  openGraph: {
    title: "Decentroneum App",
    description:
      "Connect once and access Electroneum ecosystem tools — in one clean shell.",
    url: APP_URL,
    siteName: "Decentroneum",
    type: "website",
    images: [
      { url: "/opengraph-image.png", width: 1200, height: 630, alt: "Decentroneum App" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Decentroneum App",
    description:
      "Connect once and access Electroneum ecosystem tools — in one clean shell.",
    images: ["/opengraph-image.png"],
  },
  robots: { index: true, follow: true },
};

function IconOnlyMark() {
  return (
    <div
      className="
        relative h-9 w-9 rounded-xl overflow-hidden
        border border-border bg-card
        shadow-[0_1px_0_rgba(255,255,255,0.06)]
      "
      aria-hidden="true"
    >
      <Image
        src="/DECENT-ICON.png"
        alt=""
        fill
        sizes="36px"
        className="object-cover"
        priority
      />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur">
        <Container className="h-16 flex items-center justify-between">
          <Link href={appHref("")} className="hover:opacity-90" aria-label="App home">
            <IconOnlyMark />
          </Link>

          {/* ✅ THE ONLY CONNECT SURFACE IN THE APP */}
          <div id="app-connect" className="flex items-center gap-3">
            <WalletPill />
          </div>
        </Container>
      </header>

      <AppTopNav />

      <main className="page-enter">
        <AppGate>{children}</AppGate>
      </main>

      {/* Shared footer for ALL dApps */}
      <SiteFooter />
    </div>
  );
}
