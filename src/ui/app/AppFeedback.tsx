// src/ui/app/AppFeedback.tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(" ");
}

export function AppModal({
  open,
  title,
  icon,
  subtitle = "Transaction complete",
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-200">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="
          absolute left-1/2 top-1/2 w-[92vw] max-w-md
          -translate-x-1/2 -translate-y-1/2
          rounded-3xl border border-border bg-card shadow-2xl
          animate-[fadeUp_220ms_cubic-bezier(0.2,0.8,0.2,1)_both]
        "
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border/70">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-background">
              {icon}
            </div>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-1 text-xs text-muted">{subtitle}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="
              inline-flex h-9 w-9 items-center justify-center rounded-full
              border border-border bg-background
              hover:bg-card hover:border-foreground/15 transition
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
            "
            aria-label="Close"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function AppToast({
  show,
  message,
  tone = "neutral",
}: {
  show: boolean;
  message: string;
  tone?: "neutral" | "success" | "danger";
}) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);
  if (!ready) return null;

  return createPortal(
    <div
      className={cx(
        "pointer-events-none fixed left-1/2 bottom-6 z-9999",
        "-translate-x-1/2 transition duration-200",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={cx(
          "rounded-full border px-4 py-2 text-xs font-semibold shadow-[0_18px_60px_rgba(0,0,0,0.22)]",
          tone === "neutral" && "border-border bg-card text-foreground",
          tone === "success" && "border-border bg-card text-foreground",
          tone === "danger" && "border-red-500/40 bg-red-500/10 text-red-500"
        )}
      >
        {message}
      </div>
    </div>,
    document.body
  );
}
