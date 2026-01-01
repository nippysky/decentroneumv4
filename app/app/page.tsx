// app/app/page.tsx
"use client";

import * as React from "react";
import { Container } from "@/src/ui/Container";
import { useDecentWalletAccount } from "@/src/lib/decentWallet";
import { useActiveAccount } from "thirdweb/react";

function GateCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-7">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted leading-relaxed">{desc}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AppHome() {
  const dw = useDecentWalletAccount();
  const twAccount = useActiveAccount();

  const isConnected = dw.isDecentWallet ? dw.isConnected : !!twAccount;

  return (
    <div className="pt-10 sm:pt-14">
      <Container>
        {!isConnected ? (
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Connect once. Access everything.
            </h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted leading-relaxed">
              Connect your wallet to unlock the Decentroneum app. Your connection will be
              reused across tools so you don’t have to reconnect for every dApp.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <GateCard
                title="Recommended"
                desc="Use the Connect button in the top-right to connect with your preferred wallet."
              >
                <div className="text-xs text-muted">
                  Tip: If you’re using Decent Wallet, open this page inside the wallet’s browser.
                </div>
              </GateCard>

              <GateCard
                title="Why this matters"
                desc="Fewer prompts, fewer failed sessions, and a consistent connection experience across the app."
              >
                <div className="text-xs text-muted">
                  Decent Wallet connects via injected provider. Other browsers use the Thirdweb connect modal.
                </div>
              </GateCard>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Welcome to Decentroneum
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
              You’re connected. Next we’ll drop in the dApp grid and route each tool into a
              unified shell.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {["Token Tools", "Approvals", "NFTs", "Utilities", "Community", "More"].map((t) => (
                <div key={t} className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="mt-1 text-xs text-muted">Coming next.</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
