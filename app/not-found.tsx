// app/not-found.tsx
//
// Branded 404 for both hosts. This file backs decentroneum.com *and*
// app.decentroneum.com (the proxy rewrites the app subdomain onto /app/*),
// so it can't assume which one the visitor is on — the recovery links
// below deliberately cover both: back to the landing page, and into the
// D-App.
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { Container } from "@/src/ui/Container";
import { Button } from "@/src/ui/Button";
import { DECENT_APPS } from "@/src/lib/decentApps";
import { appUrlHref, MAIN_SITE_URL } from "@/src/lib/appEnv";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist or has moved.",
  // A 404 should never be indexed, and shouldn't leak link equity.
  robots: { index: false, follow: false },
};

/** A few tools to offer as a way out — most 404s here are mistyped paths. */
const SUGGESTIONS = DECENT_APPS.slice(0, 4);

export default function NotFound() {
  return (
    <>
      {/* Same ambient glow as the landing page so a 404 still feels like
          part of the product rather than a bare framework error page. */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none fixed inset-0
          bg-[radial-gradient(900px_520px_at_20%_-10%,color-mix(in_oklab,var(--glow)_16%,transparent),transparent_60%),
              radial-gradient(700px_460px_at_90%_10%,color-mix(in_oklab,var(--glow)_10%,transparent),transparent_55%)]
        "
      />

      <main className="relative min-h-[80vh] flex items-center py-20 sm:py-28">
        <Container className="max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-border bg-card">
              <Image
                src="/DECENT-ICON.png"
                alt=""
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </div>
            <span className="text-sm font-medium text-muted">Decentroneum</span>
          </div>

          <p className="mt-10 text-sm font-semibold tracking-widest text-accent">404</p>

          <h1 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.08] text-balance">
            We couldn&apos;t find that page.
          </h1>

          <p className="mt-5 max-w-xl text-base sm:text-lg text-muted leading-relaxed">
            It may have moved, or the link might be mistyped. Nothing is wrong with your
            wallet — your funds and connections are untouched.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Button href={appUrlHref("")} size="lg">
              Go to the D-App
            </Button>
            <Button href={MAIN_SITE_URL} variant="secondary" size="lg">
              Back to homepage
            </Button>
          </div>

          <div className="mt-14 border-t border-border pt-8">
            <h2 className="text-sm font-semibold">Popular tools</h2>

            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((app) => (
                <li key={app.title}>
                  <Link
                    href={appUrlHref(app.href)}
                    className="
                      group flex items-center justify-between gap-3
                      rounded-2xl border border-border bg-card px-4 py-3
                      transition hover:border-foreground/15
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
                    "
                  >
                    <span className="text-sm font-medium">{app.title}</span>
                    <span
                      aria-hidden="true"
                      className="text-accent transition-transform group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm text-muted">
              Still stuck?{" "}
              <a
                href="https://t.me/DecentroneumGroupChat"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4 decoration-border transition hover:decoration-foreground"
              >
                Ask on Telegram
              </a>
              .
            </p>
          </div>
        </Container>
      </main>
    </>
  );
}
