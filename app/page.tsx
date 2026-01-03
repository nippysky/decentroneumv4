// app/page.tsx
import Link from "next/link";
import Image from "next/image";
import { FaApple, FaGooglePlay } from "react-icons/fa";

import { Container } from "@/src/ui/Container";
import { Button } from "@/src/ui/Button";
import { StoreButton } from "@/src/ui/StoreButtons";
import { ScrollTo } from "@/src/ui/ScrollTo";
import { SiteFooter } from "@/src/ui/SiteFooter";


const STORE = {
  ios: "", // add App Store URL when available
  android: "", // add Play Store URL when available
};

function LogoMark() {
  return (
    <div className="flex items-center">
      <div
        className="
          relative h-9 w-9 rounded-xl overflow-hidden
          border border-border bg-card
          shadow-[0_1px_0_rgba(255,255,255,0.06)]
        "
      >
        <Image
          src="/DECENT-ICON.png"
          alt="Decentroneum"
          fill
          sizes="36px"
          className="object-cover"
          priority
        />
      </div>
      {/* icon-only as requested (no text) */}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground/80">
      {children}
    </span>
  );
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <header className="max-w-3xl">
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
        {desc}
      </p>
    </header>
  );
}

function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <article
      className="
        rounded-3xl border border-border bg-card p-6 sm:p-7
        shadow-[0_1px_0_rgba(255,255,255,0.06)]
        transition hover:border-foreground/15
      "
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted leading-relaxed">{desc}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </article>
  );
}

function DownloadCtaLabel() {
  return (
    <span className="inline-flex items-center gap-2">
      <span>Download Decent Wallet</span>

      <span className="inline-flex items-center gap-1.5">
        <span className="grid place-items-center h-6 w-6 rounded-full border border-border bg-card">
          <FaApple className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        </span>
        <span className="grid place-items-center h-6 w-6 rounded-full border border-border bg-card">
          <FaGooglePlay className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        </span>
      </span>
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* premium background glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none fixed inset-0
          bg-[radial-gradient(900px_520px_at_20%_-10%,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_60%),
              radial-gradient(700px_460px_at_90%_10%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_55%)]
        "
      />

      <a
        href="#content"
        className="
          sr-only focus:not-sr-only
          fixed left-4 top-4 z-50 rounded-full
          bg-card border border-border px-4 py-2 text-sm
        "
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur">
        <Container className="h-16 flex items-center justify-between">
          <Link
            href="/"
            className="hover:opacity-90"
            aria-label="Decentroneum home"
          >
            <LogoMark />
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-2">
            {/* Make Launch D-App POP (glow + stronger contrast) */}
            <Button
              href="/app"
              size="sm"
              className="
                relative overflow-hidden rounded-full
                border border-foreground/10
                bg-primary text-background
                shadow-[0_10px_30px_color-mix(in_oklab,var(--accent)_22%,transparent)]
                hover:shadow-[0_14px_40px_color-mix(in_oklab,var(--accent)_28%,transparent)]
                hover:opacity-[0.98]
                focus-visible:ring-2 focus-visible:ring-accent/50
              "
            >
              <span
                aria-hidden="true"
                className="
                  pointer-events-none absolute inset-0
                  bg-[radial-gradient(120px_60px_at_30%_10%,color-mix(in_oklab,var(--accent)_35%,transparent),transparent_60%)]
                "
              />
              <span className="relative">Launch D-App</span>
            </Button>
          </nav>
        </Container>
      </header>

      <main id="content">
        <section className="pt-14 sm:pt-20">
          <Container>
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <Pill>Electroneum Smart Chain</Pill>
                <Pill>Platform & Ecosystem</Pill>
                <Pill>Mobile Wallet</Pill>
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.06] text-balance">
                Decentroneum is a Web3 platform for the{" "}
                <span className="text-accent">Electroneum</span> ecosystem.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-muted leading-relaxed max-w-3xl">
                A clean, dependable place to access ecosystem utilities and
                community tools on the web — with a non-custodial mobile wallet
                for secure self-custody and everyday use.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button href="/app" size="lg">
                  Launch the D-App
                </Button>

                <ScrollTo targetId="download">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="justify-between"
                  >
                    <DownloadCtaLabel />
                  </Button>
                </ScrollTo>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card
                  title="One place to access the ecosystem"
                  desc="Decentroneum brings utilities and community tools into a single, fast experience — designed for real usage and built to scale."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border/80 bg-background p-4">
                      <div className="text-xs text-muted">Web App</div>
                      <div className="mt-1 text-sm font-medium">
                        Utilities and dApps
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/80 bg-background p-4">
                      <div className="text-xs text-muted">Sessions</div>
                      <div className="mt-1 text-sm font-medium">
                        Clear wallet connections
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/80 bg-background p-4">
                      <div className="text-xs text-muted">Performance</div>
                      <div className="mt-1 text-sm font-medium">
                        Responsive on any device
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Button href="/app" variant="secondary">
                      Explore D-App
                    </Button>
                  </div>
                </Card>
              </div>

              <Card
                title="Decent Wallet"
                desc="A non-custodial mobile wallet built for secure access to the Electroneum ecosystem."
              >
                <ul className="mt-2 space-y-2 text-sm text-muted leading-relaxed">
                  <li>• You control your keys</li>
                  <li>• Smooth approvals and dApp access</li>
                  <li>• Built for clarity and safety</li>
                </ul>

                <div className="mt-6">
                  <ScrollTo targetId="download">
                    <Button variant="secondary">
                      <DownloadCtaLabel />
                    </Button>
                  </ScrollTo>
                </div>
              </Card>
            </div>
          </Container>
        </section>

        <section className="pt-16 sm:pt-24">
          <Container>
            <SectionTitle
              title="Built to be simple, reliable, and fast"
              desc="We focus on a clean surface area and strong foundations — so the platform stays easy to use as the ecosystem grows."
            />

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                title="Clear UX"
                desc="Straightforward flows designed to reduce mistakes and improve confidence."
              />
              <Card
                title="Robust foundations"
                desc="Built for stability, scalability, and clean integrations across the ecosystem."
              />
              <Card
                title="Community distribution"
                desc="Updates and releases shared through official channels where the community already is."
              />
            </div>
          </Container>
        </section>

        <section id="download" className="pt-16 sm:pt-24">
          <Container>
            <div className="rounded-3xl border border-border bg-card p-8 sm:p-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="max-w-3xl">
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                    Decent Wallet for iOS and Android
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
                    A mobile-first, non-custodial wallet for secure access to the
                    Electroneum ecosystem — designed for everyday use with a
                    clean, modern experience.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
                  <StoreButton store="ios" href={STORE.ios || undefined} />
                  <StoreButton store="android" href={STORE.android || undefined} />
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card title="Non-custodial" desc="Designed around self-custody. You control your keys." />
                <Card title="Reliable connections" desc="Clean wallet connections for dApps and sessions across the ecosystem." />
                <Card title="Responsive by default" desc="Built to work smoothly across devices, screen sizes, and network conditions." />
              </div>
            </div>
          </Container>
        </section>

        {/* Shared Footer */}
        <SiteFooter />
      </main>
    </div>
  );
}
