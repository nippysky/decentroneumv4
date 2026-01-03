// app/app/AppGate.tsx
"use client";

import * as React from "react";
import { Container } from "@/src/ui/Container";
import { Button } from "@/src/ui/Button";
import { useAppConnection } from "@/src/lib/useAppConnection";
import { MAIN_SITE_URL } from "@/src/lib/appEnv";

export function AppGate({ children }: { children: React.ReactNode }) {
  const { mounted, isConnected, isDecentWallet, connectDW } = useAppConnection();

  // Stable initial render (avoids hydration issues)
  if (!mounted && !isDecentWallet) {
    return (
      <div className="pt-10 sm:pt-14">
        <Container>
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <div className="h-6 w-44 rounded bg-background/70 animate-pulse" />
            <div className="mt-3 h-4 w-72 rounded bg-background/60 animate-pulse" />
            <div className="mt-6 h-11 w-40 rounded-full bg-background/60 animate-pulse" />
          </div>
        </Container>
      </div>
    );
  }

  if (isConnected) return <>{children}</>;

  return (
    <div className="pt-10 sm:pt-14">
      <Container>
        <div
          className="
            rounded-3xl border border-border bg-card p-6 sm:p-10
            shadow-[0_1px_0_rgba(255,255,255,0.06)]
          "
        >
          <div className="text-sm font-semibold">Not connected</div>
          <p className="mt-2 text-sm text-muted leading-relaxed max-w-xl">
            Connect once to access all Decentroneum tools.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {/* Primary CTA: point to the single WalletPill in the header */}
            <Button
              variant="secondary"
              onClick={() => {
                // If inside Decent Wallet, we can trigger connect directly (clean UX)
                if (isDecentWallet) {
                  connectDW();
                  return;
                }

                // Otherwise, guide user to header connect
                window.scrollTo({ top: 0, behavior: "smooth" });
                document.getElementById("app-connect")?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }}
            >
              Connect
            </Button>

            <Button href={MAIN_SITE_URL} variant="ghost">
              Back to landing
            </Button>
          </div>

          <div className="mt-4 text-xs text-muted">
            Tip: For the smoothest experience, open the app inside Decent Wallet’s in-app browser.
          </div>
        </div>
      </Container>
    </div>
  );
}
