// src/ui/StoreButtons.tsx
import * as React from "react";
import { FaApple, FaGooglePlay } from "react-icons/fa";

type StoreButtonProps = {
  href?: string;
  store: "ios" | "android";
};

export function StoreButton({ href, store }: StoreButtonProps) {
  const isIOS = store === "ios";
  const Icon = isIOS ? FaApple : FaGooglePlay;

  const top = isIOS ? "Download on the" : "Get it on";
  const bottom = isIOS ? "App Store" : "Google Play";

  const base =
    "group inline-flex items-center gap-3 rounded-2xl border border-border bg-background px-4 " +
    "h-14 min-w-[210px] shadow-[0_1px_0_rgba(255,255,255,0.06)] " +
    "transition hover:border-foreground/20 hover:bg-card/70 active:scale-[0.99] " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50";

  const disabled = "opacity-60 pointer-events-none select-none";

  const content = (
    <>
      <div className="grid place-items-center h-10 w-10 rounded-xl border border-border bg-card">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>

      <div className="leading-none">
        <div className="text-[11px] text-muted">{top}</div>
        <div className="mt-1 text-sm font-semibold tracking-tight text-foreground whitespace-nowrap">
          {bottom}
        </div>
      </div>
    </>
  );

  if (!href) {
    return (
      <div className={`${base} ${disabled}`} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <a className={base} href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  );
}
