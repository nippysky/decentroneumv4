// app/tokens/submit/page.tsx
//
// This is the URL the wallet's registry already documents as the intake
// point (see src/lib/tokens/registry.ts in decent-wallet). It existed only
// as a comment until now.
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/src/ui/Container";
import { SiteFooter } from "@/src/ui/SiteFooter";
import SubmitClient from "./submitClient";

export const metadata: Metadata = {
  title: "Submit a token",
  description:
    "Apply to have your Electroneum Smart Chain token listed in Decent Wallet. We verify the contract on-chain automatically.",
  alternates: { canonical: "/tokens/submit" },
  openGraph: {
    title: "Submit a token • Decentroneum",
    description:
      "Apply to have your Electroneum Smart Chain token listed in Decent Wallet.",
    url: "/tokens/submit",
  },
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-card text-xs font-semibold">
        {n}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

export default function SubmitTokenPage() {
  return (
    <div className="min-h-screen">
      <div
        aria-hidden="true"
        className="
          pointer-events-none fixed inset-0
          bg-[radial-gradient(900px_520px_at_20%_-10%,color-mix(in_oklab,var(--glow)_16%,transparent),transparent_60%)]
        "
      />

      <main className="relative py-16 sm:py-24">
        <Container className="max-w-3xl">
          <nav className="mb-8 text-sm">
            <Link
              href="/"
              className="text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
            >
              ← Back to Decentroneum
            </Link>
          </nav>

          <header>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Submit a token</h1>
            <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">
              Get your Electroneum Smart Chain token listed in Decent Wallet. Once approved it
              appears for every user automatically — no app update required.
            </p>
          </header>

          <ol className="mt-10 space-y-5">
            <Step n={1} title="You submit the contract address and a logo URL">
              We read the name, symbol and decimals straight from the chain, so there&apos;s nothing
              to type wrong.
            </Step>
            <Step n={2} title="We verify it's a real ERC-20">
              Verification runs the moment you submit. If the contract isn&apos;t a standard ERC-20,
              or the logo isn&apos;t reachable, you&apos;ll know immediately rather than days later.
            </Step>
            <Step n={3} title="Our team reviews and publishes">
              Approved tokens are added to the public registry and picked up by every wallet on its
              next refresh. We reply to your contact email either way.
            </Step>
          </ol>

          <div className="mt-10 rounded-2xl border border-border bg-card px-5 py-4">
            <p className="text-sm font-semibold">Before you start</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted">
              <li>• The token must already be deployed on Electroneum Smart Chain (chain 52014).</li>
              <li>• Your logo must be hosted at a public https URL — link directly to the image file.</li>
              <li>• Square images work best; PNG, SVG or WebP.</li>
            </ul>
          </div>

          <div className="mt-10">
            <SubmitClient />
          </div>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
}
