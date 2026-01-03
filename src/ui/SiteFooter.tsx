"use client";

import React from "react";
import { Container } from "@/src/ui/Container";
import { ThemeToggle } from "@/src/ui/ThemeToggle";
import { FaTelegramPlane } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const SOCIALS = {
  x: "https://x.com/decentroneum",
  telegram: "https://t.me/DecentroneumGroupChat",
};

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

function SocialButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="
        group inline-flex items-center justify-center gap-2
        rounded-full border border-border bg-background
        px-5 h-11 text-sm font-semibold
        transition
        hover:border-foreground/20 hover:bg-card
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
        shadow-[0_1px_0_rgba(255,255,255,0.06)]
      "
    >
      <span
        className="
          grid place-items-center h-8 w-8 rounded-full
          border border-border bg-card
          transition
          group-hover:border-foreground/15
          group-hover:shadow-[0_8px_28px_color-mix(in_oklab,var(--accent)_18%,transparent)]
        "
        aria-hidden="true"
      >
        {icon}
      </span>

      <span>{label}</span>
    </a>
  );
}

export function SiteFooter() {
  const year = React.useMemo(() => new Date().getFullYear(), []);

  return (
    <section className="pt-16 sm:pt-24 pb-20">
      <Container>
        <div
          className="
            rounded-3xl border border-border bg-card p-8 sm:p-10
            shadow-[0_1px_0_rgba(255,255,255,0.06)]
          "
        >
          <SectionTitle
            title="Stay connected"
            desc="Follow announcements, releases, and ecosystem updates through the official community channels."
          />

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <SocialButton
              href={SOCIALS.x}
              label="Follow on X"
              icon={<FaXTwitter className="h-4 w-4 text-primary" />}
            />
            <SocialButton
              href={SOCIALS.telegram}
              label="Join Telegram"
              icon={<FaTelegramPlane className="h-4 w-4 text-primary" />}
            />
          </div>

          <footer className="mt-10 border-t border-border/70 pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="text-xs text-muted" suppressHydrationWarning>
                © {year} Decentroneum. All rights reserved.
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                <ThemeToggle />
              </div>
            </div>
          </footer>
        </div>
      </Container>
    </section>
  );
}
