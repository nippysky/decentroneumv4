"use client";

import * as React from "react";
import Link from "next/link";
import { useActiveAccount } from "thirdweb/react";
import { Container } from "@/src/ui/Container";
import { Button } from "@/src/ui/Button";
import { ConnectGate } from "@/src/ui/ConnectGate";
import { WalletHeaderPill } from "../WalletHeaderPill";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="
          h-9 w-9 rounded-xl
          bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--accent)_55%,transparent),transparent_60%),linear-gradient(180deg,color-mix(in_oklab,var(--accent)_18%,transparent),transparent)]
          border border-border
        "
        aria-hidden="true"
      />
      <span className="text-sm font-semibold tracking-tight">Decentroneum App</span>
    </div>
  );
}

function DappCard({
  title,
  desc,
  href,
  comingSoon,
}: {
  title: string;
  desc: string;
  href: string;
  comingSoon?: boolean;
}) {
  const inner = (
    <div
      className={[
        "rounded-3xl border border-border bg-card p-6",
        "shadow-[0_1px_0_rgba(255,255,255,0.06)] transition",
        "hover:border-foreground/15 hover:-translate-y-px",
        comingSoon ? "opacity-70" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <p className="mt-2 text-sm text-muted leading-relaxed">{desc}</p>
        </div>

        {comingSoon ? (
          <span className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted">
            Coming soon
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground/80">
            Open
          </span>
        )}
      </div>
    </div>
  );

  return comingSoon ? (
    <div aria-disabled="true">{inner}</div>
  ) : (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-3xl">
      {inner}
    </Link>
  );
}

export function AppHome() {
  const account = useActiveAccount();

  return (
    <div className="min-h-screen">
      <div
        aria-hidden="true"
        className="
          pointer-events-none fixed inset-0
          bg-[radial-gradient(900px_520px_at_20%_-10%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_60%),
              radial-gradient(700px_460px_at_90%_10%,color-mix(in_oklab,var(--accent)_8%,transparent),transparent_55%)]
        "
      />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur">
        <Container className="h-16 flex items-center justify-between">
          <Logo />
 <div className="flex items-center gap-3">
  <WalletHeaderPill />
  <Button href="/" variant="ghost" size="sm">
    Landing
  </Button>
</div>

        </Container>
      </header>

      <main className="pt-10 pb-16">
        <Container>
          {!account ? (
            <ConnectGate />
          ) : (
            <>
              <header className="max-w-3xl">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  Welcome to the Decentroneum app
                </h1>
                <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
                  You’re connected once — now you can access all dApps and utilities without reconnecting each time.
                </p>
              </header>

              <section className="mt-10">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <DappCard
                    title="Token Locker"
                    desc="Lock tokens with clear schedules and transparent on-chain visibility."
                    href="/app/token-locker"
                    comingSoon
                  />
                  <DappCard
                    title="Token Creator"
                    desc="Create tokens with safe defaults and a clean review step."
                    href="/app/token-creator"
                    comingSoon
                  />
                  <DappCard
                    title="Bulk Sender"
                    desc="Distribute tokens at scale with predictable fees and previews."
                    href="/app/bulk-sender"
                    comingSoon
                  />
                  <DappCard
                    title="Revoker"
                    desc="Review and revoke risky approvals with a clean, readable UI."
                    href="/app/revoker"
                    comingSoon
                  />
                  <DappCard
                    title="Panthart"
                    desc="Explore and trade NFTs in the Electroneum ecosystem."
                    href="/app/panthart"
                    comingSoon
                  />
                  <DappCard
                    title="More utilities"
                    desc="Additional ecosystem tools will live here as the suite grows."
                    href="/app/utilities"
                    comingSoon
                  />
                </div>
              </section>
            </>
          )}
        </Container>
      </main>
    </div>
  );
}
