// src/ui/legal/LegalPage.tsx
//
// Shared shell for the Privacy Policy and Terms of Service pages so both
// stay visually identical and only differ in content. Kept as a server
// component (no "use client") — these pages are static text and shouldn't
// ship any JS.
import * as React from "react";
import Link from "next/link";
import { Container } from "@/src/ui/Container";

export function LegalPage({
  title,
  intro,
  lastUpdated,
  children,
}: {
  title: string;
  intro: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="py-16 sm:py-24">
      <Container className="max-w-3xl">
        <nav className="mb-8 text-sm">
          <Link
            href="/"
            className="text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
          >
            ← Back to Decentroneum
          </Link>
        </nav>

        <header className="border-b border-border pb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">{intro}</p>
          <p className="mt-6 text-sm text-muted">
            Last updated{" "}
            <time dateTime={lastUpdated}>
              {new Date(lastUpdated).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </p>
        </header>

        <div className="legal-prose mt-10">{children}</div>

        <footer className="mt-16 border-t border-border pt-8 text-sm text-muted">
          <p>
            Questions about this page? Reach us on{" "}
            <a
              href="https://t.me/DecentroneumGroupChat"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-4 decoration-border transition hover:decoration-foreground"
            >
              Telegram
            </a>{" "}
            or{" "}
            <a
              href="https://x.com/decentroneum"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-4 decoration-border transition hover:decoration-foreground"
            >
              X
            </a>
            .
          </p>
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/privacy" className="transition hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-foreground">
              Terms of Service
            </Link>
          </p>
        </footer>
      </Container>
    </main>
  );
}

/** Section heading + body, so page content stays declarative. */
export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0 scroll-mt-24">
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{heading}</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-muted">{children}</div>
    </section>
  );
}

/** Callout for the points that genuinely matter (self-custody, key loss). */
export function LegalCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-base leading-relaxed">
      {children}
    </div>
  );
}
