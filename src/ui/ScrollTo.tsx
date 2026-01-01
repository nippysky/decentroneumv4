// src/ui/ScrollTo.tsx
"use client";

import * as React from "react";

type Props = {
  targetId: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
};

export function ScrollTo({ targetId, href, className, children }: Props) {
  return (
    <a
      href={href ?? `#${targetId}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();

        const el = document.getElementById(targetId);
        if (!el) return;

        // Update URL hash without relying on the browser to scroll
        const next = `#${targetId}`;
        if (window.location.hash !== next) {
          history.pushState(null, "", next);
        } else {
          // If already the same hash, keep it but still scroll (UX fix)
          history.replaceState(null, "", next);
        }

        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {children}
    </a>
  );
}
