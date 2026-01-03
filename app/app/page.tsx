// app/app/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Container } from "@/src/ui/Container";
import { WalletPill } from "@/src/ui/WalletPill";
import { DECENT_APPS } from "@/src/lib/decentApps";
import { useDecentWalletAccount } from "@/src/lib/decentWallet";
import { useActiveAccount } from "thirdweb/react";
import { FiSearch } from "react-icons/fi";
import { HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";

function ShellCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section
      className="
        rounded-3xl border border-border bg-card
        p-6 sm:p-8
        shadow-[0_1px_0_rgba(255,255,255,0.06)]
      "
    >
      {children}
    </section>
  );
}

function AppTile({
  title,
  desc,
  href,
  external,
  tag,
}: {
  title: string;
  desc: string;
  href: string;
  external?: boolean;
  tag?: string;
}) {
  const content = (
    <div
      className="
        group relative rounded-3xl border border-border bg-background
        p-5 sm:p-6
        transition
        hover:border-foreground/15 hover:bg-card
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold truncate">{title}</div>
            {tag ? (
              <span className="shrink-0 inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted">
                {tag}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-2">
            {desc}
          </p>
        </div>

        {external ? (
          <HiOutlineArrowTopRightOnSquare
            className="h-5 w-5 text-muted group-hover:text-foreground transition"
            aria-hidden="true"
          />
        ) : (
          <div
            className="
              h-8 w-8 shrink-0 rounded-full border border-border bg-card
              grid place-items-center
              text-muted
              group-hover:text-foreground group-hover:border-foreground/15 transition
            "
            aria-hidden="true"
          >
            →
          </div>
        )}
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={title}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} aria-label={title}>
      {content}
    </Link>
  );
}

export default function AppHome() {
  const dw = useDecentWalletAccount();
  const twAccount = useActiveAccount();

  const isConnected = dw.isDecentWallet ? dw.isConnected : !!twAccount;

  const [query, setQuery] = React.useState("");

  const apps = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DECENT_APPS;

    return DECENT_APPS.filter((a) => {
      return (
        a.title.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q) ||
        (a.tag || "").toLowerCase().includes(q)
      );
    });
  }, [query]);

  return (
    <div className="pt-10 sm:pt-14 pb-16">
      <Container>
        {!isConnected ? (
          <ShellCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Not connected
                </h1>
                <p className="mt-2 text-sm text-muted">
                  Connect your wallet to continue.
                </p>
              </div>

              {/* Gate connect button (re-uses WalletPill so it stays consistent) */}
              <div className="flex sm:justify-end">
                <WalletPill />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border/70 bg-background p-4 text-xs text-muted leading-relaxed">
              Tip: If you’re using Decent Wallet, open this inside the wallet browser for the smoothest session.
            </div>
          </ShellCard>
        ) : (
          <div className="space-y-4">
            {/* Top row: title + search */}
            <ShellCard>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                    Apps
                  </h1>
                  <p className="mt-1 text-sm text-muted">
                    Connected. Pick a tool.
                  </p>
                </div>

                <div className="w-full md:w-105">
                  <div
                    className="
                      flex items-center gap-2
                      rounded-2xl border border-border bg-background
                      px-4 h-11
                      focus-within:border-foreground/15
                      transition
                    "
                  >
                    <FiSearch className="h-4 w-4 text-muted" aria-hidden="true" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search apps"
                      className="
                        w-full bg-transparent outline-none
                        text-sm text-foreground placeholder:text-muted
                      "
                      aria-label="Search apps"
                    />
                  </div>
                </div>
              </div>
            </ShellCard>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map((a) => (
                <AppTile
                  key={a.title}
                  title={a.title}
                  desc={a.desc}
                  href={a.href}
                  external={a.external}
                  tag={a.tag}
                />
              ))}
            </div>

            {apps.length === 0 ? (
              <div className="text-sm text-muted px-1">
                No matches.
              </div>
            ) : null}
          </div>
        )}
      </Container>
    </div>
  );
}
