// src/ui/app/AppCard.tsx
import * as React from "react";

export function AppCard({
  title,
  subtitle,
  right,
  children,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
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
      {(title || subtitle || right) && (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {title ? (
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            ) : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      )}

      {children}
    </section>
  );
}
