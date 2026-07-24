"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/src/ui/Button";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "done"; token: { address: string; name: string; symbol: string; decimals: number } };

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">
          {label}
          {required ? <span className="text-muted"> *</span> : null}
        </span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground " +
  "placeholder:text-muted/70 transition " +
  "focus:outline-none focus:border-foreground/20 focus-visible:ring-2 focus-visible:ring-accent/40";

export default function SubmitClient() {
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });
  const busy = status.kind === "submitting";

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus({ kind: "submitting" });

    try {
      const res = await fetch("/api/tokens/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectName: form.get("projectName"),
          contact: form.get("contact"),
          website: form.get("website"),
          address: form.get("address"),
          logoURI: form.get("logoURI"),
          notes: form.get("notes"),
        }),
      });

      const json = (await res.json()) as
        | { ok: true; token: { address: string; name: string; symbol: string; decimals: number } }
        | { ok: false; error?: string };

      if (!json.ok) {
        setStatus({ kind: "error", message: json.error ?? "Something went wrong. Please try again." });
        return;
      }

      setStatus({ kind: "done", token: json.token });
    } catch {
      setStatus({
        kind: "error",
        message: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  };

  if (status.kind === "done") {
    const t = status.token;
    return (
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="text-sm font-semibold text-accent">Submission received</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          We verified {t.symbol} on-chain.
        </h2>
        <p className="mt-3 text-sm text-muted leading-relaxed max-w-xl">
          We read these values directly from your contract, so there&apos;s nothing further to
          confirm. Our team will review the listing and reply to the email you gave us.
        </p>

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {[
            ["Name", t.name],
            ["Symbol", t.symbol],
            ["Decimals", String(t.decimals)],
            ["Contract", t.address],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-border/70 pb-2">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium text-right break-all">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8">
          <Button href="/" variant="secondary">
            Back to homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-5">
        <Field label="Project name" required>
          <input name="projectName" required maxLength={80} className={inputCls} placeholder="Decentroneum" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Contact email" hint="we reply here" required>
            <input
              name="contact"
              type="email"
              required
              maxLength={160}
              className={inputCls}
              placeholder="team@yourproject.com"
            />
          </Field>

          <Field label="Website" hint="optional">
            <input name="website" type="url" maxLength={200} className={inputCls} placeholder="https://yourproject.com" />
          </Field>
        </div>

        <Field label="Token contract address" hint="Electroneum Smart Chain" required>
          <input
            name="address"
            required
            maxLength={64}
            spellCheck={false}
            autoComplete="off"
            className={`${inputCls} font-mono`}
            placeholder="0x…"
          />
        </Field>

        <Field label="Logo URL" hint="must be https, links directly to the image" required>
          <input
            name="logoURI"
            type="url"
            required
            maxLength={400}
            spellCheck={false}
            className={inputCls}
            placeholder="https://yourproject.com/logo.png"
          />
        </Field>

        <Field label="Anything else we should know?" hint="optional">
          <textarea
            name="notes"
            rows={4}
            maxLength={1000}
            className={`${inputCls} resize-y`}
            placeholder="Audit links, launch date, socials…"
          />
        </Field>
      </div>

      {status.kind === "error" ? (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {status.message}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
        <Button type="submit" size="lg" disabled={busy} className={busy ? "btn-shimmer" : undefined}>
          {busy ? "Verifying on-chain…" : "Submit for review"}
        </Button>
        <p className="text-xs text-muted">
          We read name, symbol and decimals from your contract — you don&apos;t need to enter them.
        </p>
      </div>

      <p className="mt-6 text-xs text-muted">
        By submitting you confirm you represent this project. See our{" "}
        <Link href="/terms" className="underline underline-offset-4 decoration-border hover:decoration-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-4 decoration-border hover:decoration-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
