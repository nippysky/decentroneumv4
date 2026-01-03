// app/app/bulk-sender/bulkSenderClient.tsx
"use client";

import * as React from "react";
import { ethers } from "ethers";
import { useActiveAccount } from "thirdweb/react";
import { FiUpload, FiTrash2, FiCheck, FiAlertTriangle } from "react-icons/fi";

import { Container } from "@/src/ui/Container";
import { Button } from "@/src/ui/Button";
import { AppField, AppInput } from "@/src/ui/app/AppForm";
import { AppToast } from "@/src/ui/app/AppFeedback";
import { useTxState } from "@/src/ui/app/useTxState";

import {
  APPROVE_ERC_20_ABI,
  decentBulkSenderABI,
  decentBulSenderCA,
} from "@/src/lib/requisites";
import { AppCard } from "@/src/ui/app/AppCard";
import { LoadingSpinner } from "@/src/ui/LoadingSpinner";

/**
 * Bulk Sender
 * - AppGate handles connect gate (no WalletPill/ConnectWallet here)
 * - Upload CSV or paste list (segmented control to avoid confusion)
 * - Validates addresses + numeric amounts
 * - Fetches token meta (name/symbol/decimals/balance)
 * - Smart approval: only if allowance < total; fallback "approve(0) then approve(total)"
 * - Clean preview + summary
 */

const MAX_ROWS = 1000;

type InputRow = { address: string; amountText: string };
type CleanRow = { to: string; amountText: string; amount: bigint };

type TokenMeta = {
  address: string; // checksum
  name: string;
  symbol: string;
  decimals: number;
  balance: bigint;
  allowance: bigint;
};

function isProbablyHeader(line: string) {
  const s = line.toLowerCase();
  return s.includes("address") && s.includes("amount");
}

function splitLine(line: string) {
  // address,amount OR address amount
  const comma = line
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (comma.length >= 2) return [comma[0], comma[1]] as const;

  const ws = line.trim().split(/\s+/).filter(Boolean);
  if (ws.length >= 2) return [ws[0], ws[1]] as const;

  return [null, null] as const;
}

function parseRowsFromText(text: string): InputRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: InputRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && isProbablyHeader(line)) continue;

    const [a, b] = splitLine(line);
    if (!a || !b) continue;
    out.push({ address: a.trim(), amountText: b.trim() });
  }
  return out;
}

function clampTokenAddress(input: string) {
  return input.trim();
}

function formatUnitsSafe(v: bigint, decimals: number) {
  try {
    return ethers.formatUnits(v, decimals);
  } catch {
    return v.toString();
  }
}

function prettyNumber(s: string, maxFrac = 6) {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

async function readFileText(file: File) {
  return await file.text();
}

async function getProviderOrThrow() {
  if (!window.ethereum) throw new Error("Wallet provider not found");
  return new ethers.BrowserProvider(window.ethereum);
}

async function safeApproveExact(
  token: ethers.Contract,
  spender: string,
  amount: bigint
) {
  try {
    const tx = await token.approve(spender, amount);
    await tx.wait();
    return;
  } catch {
    const tx0 = await token.approve(spender, 0);
    await tx0.wait();
    const tx1 = await token.approve(spender, amount);
    await tx1.wait();
  }
}

function shortErr(e: unknown) {
  if (!e) return "Transaction failed";
  if (typeof e === "string") return e;

  // ethers v6 error shapes vary
  const maybe = e as { shortMessage?: string; message?: string; reason?: string };
  return maybe.shortMessage || maybe.reason || maybe.message || "Transaction failed";
}

export default function BulkSenderClient() {
  const account = useActiveAccount();
  const address = account?.address;
  const connected = !!address;

  const [tokenAddress, setTokenAddress] = React.useState("");
  const [tokenMeta, setTokenMeta] = React.useState<TokenMeta | null>(null);
  const [warning, setWarning] = React.useState<string>("");

  const [inputMode, setInputMode] = React.useState<"csv" | "paste">("csv");

  const [paste, setPaste] = React.useState("");
  const [rows, setRows] = React.useState<InputRow[]>([]);
  const [invalidAddrs, setInvalidAddrs] = React.useState<string[]>([]);
  const [invalidAmts, setInvalidAmts] = React.useState<string[]>([]);

  const [toast, setToast] = React.useState<{
    show: boolean;
    msg: string;
    tone: "neutral" | "success" | "danger";
  }>({ show: false, msg: "", tone: "neutral" });

  const showToast = React.useCallback(
    (msg: string, tone: "neutral" | "success" | "danger" = "neutral") => {
      setToast({ show: true, msg, tone });
      window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 1700);
    },
    []
  );

  // Customize labels for this dApp (so not “Deploy token”)
  const tx = useTxState({
    idle: "Send",
    signing: "Confirming…",
    pending: "Processing…",
  });

  // Fetch token meta (debounced)
  React.useEffect(() => {
    let alive = true;

    const t = tokenAddress.trim();
    setTokenMeta(null);
    setWarning("");

    if (!connected) return;
    if (!t || !ethers.isAddress(t)) return;

    const timer = window.setTimeout(async () => {
      try {
        const provider = await getProviderOrThrow();
        const token = new ethers.Contract(t, APPROVE_ERC_20_ABI, provider);

        const [name, symbol, decimals, bal, allowance] = await Promise.all([
          token.name().catch(() => "Token"),
          token.symbol().catch(() => "TOKEN"),
          token.decimals().catch(() => 18),
          token.balanceOf(address).catch(() => BigInt(0)),
          token.allowance(address, decentBulSenderCA).catch(() => BigInt(0)),
        ]);

        if (!alive) return;

        setTokenMeta({
          address: ethers.getAddress(t),
          name: String(name),
          symbol: String(symbol),
          decimals: Number(decimals) || 18,
          balance: BigInt(bal),
          allowance: BigInt(allowance),
        });
      } catch {
        if (!alive) return;
        setWarning("Could not fetch token details. Check the token address.");
      }
    }, 350);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [tokenAddress, address, connected]);

  // Validate rows + totals
  const computed = React.useMemo(() => {
    const invalidA: string[] = [];
    const invalidV: string[] = [];

    const cleanDraft: { to: string; amountText: string }[] = [];

    for (const r of rows) {
      const toRaw = r.address.trim();
      const amt = r.amountText.trim();

      if (!ethers.isAddress(toRaw)) {
        invalidA.push(toRaw);
        continue;
      }

      // numeric only, no scientific notation
      if (!/^\d+(\.\d+)?$/.test(amt) || Number(amt) <= 0) {
        invalidV.push(`${toRaw} → ${amt}`);
        continue;
      }

      cleanDraft.push({ to: ethers.getAddress(toRaw), amountText: amt });
    }

    const decimals = tokenMeta?.decimals ?? 18;

    const clean: CleanRow[] = [];
    let total = BigInt(0);

    try {
      for (const x of cleanDraft) {
        const amount = ethers.parseUnits(x.amountText, decimals);
        clean.push({ to: x.to, amountText: x.amountText, amount });
        total += amount;
      }
    } catch {
      if (cleanDraft.length) invalidV.push("One or more amounts could not be parsed.");
      return { clean: [] as CleanRow[], total: BigInt(0), invalidA, invalidV };
    }

    return { clean, total, invalidA, invalidV };
  }, [rows, tokenMeta]);

  React.useEffect(() => {
    setInvalidAddrs(computed.invalidA);
    setInvalidAmts(computed.invalidV);
  }, [computed.invalidA, computed.invalidV]);

  const canSend =
    connected &&
    ethers.isAddress(tokenAddress) &&
    !!tokenMeta &&
    computed.clean.length > 0 &&
    computed.invalidA.length === 0 &&
    computed.invalidV.length === 0 &&
    computed.total > BigInt(0) &&
    !tx.isBusy;

  const totalDisplay =
    tokenMeta && computed.total > BigInt(0)
      ? prettyNumber(ethers.formatUnits(computed.total, tokenMeta.decimals), 6)
      : "0";

  const balanceDisplay = tokenMeta
    ? prettyNumber(formatUnitsSafe(tokenMeta.balance, tokenMeta.decimals), 6)
    : "—";

  const preview = computed.clean.slice(0, 12);

  async function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-upload same file
    if (!file) return;

    try {
      const text = await readFileText(file);
      const parsed = parseRowsFromText(text);

      if (parsed.length > MAX_ROWS) {
        showToast(`Max ${MAX_ROWS} rows. Your file has ${parsed.length}.`, "danger");
        setRows([]);
        return;
      }

      setPaste("");
      setRows(parsed);
      showToast(`Loaded ${parsed.length} rows`, "success");
    } catch {
      showToast("Failed to read CSV", "danger");
    }
  }

  function onUsePaste() {
    const parsed = parseRowsFromText(paste);

    if (!parsed.length) {
      showToast("No rows found", "danger");
      return;
    }

    if (parsed.length > MAX_ROWS) {
      showToast(`Max ${MAX_ROWS} rows. You pasted ${parsed.length}.`, "danger");
      return;
    }

    setRows(parsed);
    showToast(`Loaded ${parsed.length} rows`, "success");
  }

  function resetAll() {
    setTokenAddress("");
    setTokenMeta(null);
    setWarning("");
    setPaste("");
    setRows([]);
    setInvalidAddrs([]);
    setInvalidAmts([]);
    setInputMode("csv");
    tx.reset();
    showToast("Cleared", "neutral");
  }

  async function send() {
    if (!address) return showToast("Not connected", "danger");
    if (!tokenMeta) return showToast("Enter a valid token", "danger");
    if (!canSend) return showToast("Fix inputs first", "danger");

    try {
      tx.startSigning();

      const provider = await getProviderOrThrow();
      const signer = await provider.getSigner(address);

      const token = new ethers.Contract(tokenMeta.address, APPROVE_ERC_20_ABI, signer);
      const bulk = new ethers.Contract(decentBulSenderCA, decentBulkSenderABI, signer);

      const total = computed.total;

      // refresh allowance
      const allowanceNow: bigint = await token
        .allowance(address, decentBulSenderCA)
        .catch(() => BigInt(0));

      // Approve only if needed
      if (allowanceNow < total) {
        tx.startPending();
        await safeApproveExact(token, decentBulSenderCA, total);
      }

      tx.startPending();

      const recipients = computed.clean.map((x) => x.to);
      const amounts = computed.clean.map((x) => x.amount);

      const txSend = await bulk.bulkSend(tokenMeta.address, recipients, amounts);
      tx.startPending(txSend?.hash ?? null);
      await txSend.wait();

      tx.succeed();
      showToast("Tokens sent", "success");

      // Keep token address & meta for convenience, clear list
      setPaste("");
      setRows([]);
    } catch (e) {
      const msg = shortErr(e);
      tx.fail(msg);
      showToast(msg, "danger");
    }
  }

  return (
    <div className="pt-10 sm:pt-14 pb-16">
      <Container>
        <AppCard
          title="Bulk Sender"
          subtitle="Upload or paste a list. Review totals. Approve if needed. Send."
        >
          {!connected ? (
            <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted">
              Not connected.
            </div>
          ) : (
            <>
              {/* Token */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <AppField label="Token contract" hint="ERC-20 address">
                    <AppInput
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(clampTokenAddress(e.target.value))}
                      placeholder="0x…"
                      disabled={tx.isBusy}
                      inputMode="text"
                      spellCheck={false}
                    />
                  </AppField>

                  {warning ? (
                    <div className="mt-2 inline-flex items-center gap-2 text-sm text-red-500">
                      <FiAlertTriangle className="h-4 w-4" />
                      {warning}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-border bg-card p-5">
                  <div className="text-xs text-muted">Token</div>
                  <div className="mt-1 text-sm font-semibold">
                    {tokenMeta ? `${tokenMeta.name} (${tokenMeta.symbol})` : "—"}
                  </div>

                  <div className="mt-3 text-xs text-muted">Balance</div>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    {tokenMeta ? `${balanceDisplay} ${tokenMeta.symbol}` : "—"}
                  </div>
                </div>
              </div>

              {/* Input mode (segmented) */}
              <div className="mt-6">
                <div
                  className="
                    inline-flex rounded-2xl border border-border bg-card p-1
                    shadow-[0_1px_0_rgba(255,255,255,0.06)]
                  "
                  role="tablist"
                  aria-label="Recipient input mode"
                >
                  <button
                    type="button"
                    onClick={() => setInputMode("csv")}
                    className={`
                      h-10 px-4 rounded-xl text-sm font-semibold transition
                      ${
                        inputMode === "csv"
                          ? "bg-background border border-border shadow-sm"
                          : "text-muted hover:text-foreground"
                      }
                    `}
                    role="tab"
                    aria-selected={inputMode === "csv"}
                  >
                    Upload CSV
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputMode("paste")}
                    className={`
                      h-10 px-4 rounded-xl text-sm font-semibold transition
                      ${
                        inputMode === "paste"
                          ? "bg-background border border-border shadow-sm"
                          : "text-muted hover:text-foreground"
                      }
                    `}
                    role="tab"
                    aria-selected={inputMode === "paste"}
                  >
                    Paste list
                  </button>
                </div>

                <div className="mt-4">
                  {inputMode === "csv" ? (
                    <div className="rounded-3xl border border-border bg-card p-6">
                      <div className="text-sm font-semibold">Upload CSV</div>
                      <div className="mt-1 text-sm text-muted">
                        Format: <span className="font-semibold">address,amount</span>
                      </div>

                      <label
                        className="
                          mt-4 inline-flex w-full items-center justify-center gap-2
                          h-11 rounded-2xl border border-border bg-background
                          text-sm font-semibold
                          hover:border-foreground/15 hover:bg-card transition
                          cursor-pointer
                          focus-within:ring-2 focus-within:ring-accent/50
                        "
                      >
                        <FiUpload className="h-4 w-4" />
                        Choose CSV
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="sr-only"
                          onChange={onUploadFile}
                          disabled={tx.isBusy}
                        />
                      </label>

                      <div className="mt-4 text-xs text-muted">
                        Max {MAX_ROWS} rows. Amount must be numeric (e.g. 10 or 10.5).
                      </div>

                      <button
                        type="button"
                        onClick={() => setInputMode("paste")}
                        disabled={tx.isBusy}
                        className="
                          mt-4 text-xs font-semibold text-muted hover:text-foreground transition
                          disabled:opacity-50 disabled:pointer-events-none
                        "
                      >
                        Prefer pasting instead?
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-border bg-card p-6">
                      <div className="text-sm font-semibold">Paste list</div>
                      <div className="mt-1 text-sm text-muted">One per line.</div>

                      <textarea
                        value={paste}
                        onChange={(e) => setPaste(e.target.value)}
                        placeholder={`0xabc...,10\n0xdef...,25.5`}
                        className="
                          mt-4 w-full min-h-32 resize-none
                          rounded-2xl border border-border bg-background
                          px-4 py-3 text-sm
                          outline-none
                          focus:ring-2 focus:ring-accent/50
                        "
                        disabled={tx.isBusy}
                      />

                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={onUsePaste}
                          disabled={!paste.trim() || tx.isBusy}
                        >
                          Use pasted list
                        </Button>

                        <Button
                          variant="ghost"
                          onClick={() => setPaste("")}
                          disabled={!paste.trim() || tx.isBusy}
                        >
                          Clear
                        </Button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setInputMode("csv")}
                        disabled={tx.isBusy}
                        className="
                          mt-4 text-xs font-semibold text-muted hover:text-foreground transition
                          disabled:opacity-50 disabled:pointer-events-none
                        "
                      >
                        Prefer uploading a CSV instead?
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview + Summary */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Preview</div>
                    <div className="text-xs text-muted">
                      {rows.length ? `${rows.length} row(s)` : "No list loaded"}
                    </div>
                  </div>

                  {!rows.length ? (
                    <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm text-muted">
                      Upload a CSV or paste a list to preview recipients.
                    </div>
                  ) : (
                    <>
                      {invalidAddrs.length || invalidAmts.length ? (
                        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
                          Fix errors before sending.
                          {invalidAddrs.length ? (
                            <div className="mt-2 text-xs">
                              Invalid addresses: {invalidAddrs.slice(0, 5).join(", ")}
                              {invalidAddrs.length > 5 ? "…" : ""}
                            </div>
                          ) : null}
                          {invalidAmts.length ? (
                            <div className="mt-2 text-xs">
                              Invalid amounts: {invalidAmts.slice(0, 3).join(" • ")}
                              {invalidAmts.length > 3 ? "…" : ""}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                        <div className="grid grid-cols-12 bg-background px-4 py-2 text-xs text-muted">
                          <div className="col-span-7">Address</div>
                          <div className="col-span-5 text-right">Amount</div>
                        </div>

                        <div className="divide-y divide-border">
                          {preview.map((r, idx) => (
                            <div
                              key={`${r.to}:${idx}`}
                              className="grid grid-cols-12 px-4 py-3 text-sm"
                            >
                              <div className="col-span-7 font-semibold truncate">{r.to}</div>
                              <div className="col-span-5 text-right tabular-nums text-muted">
                                {r.amountText}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {rows.length > preview.length ? (
                        <div className="mt-3 text-xs text-muted">
                          Showing first {preview.length} of {rows.length}.
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="rounded-3xl border border-border bg-card p-6">
                  <div className="text-sm font-semibold">Summary</div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted">Recipients</div>
                      <div className="font-semibold tabular-nums">{computed.clean.length}</div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted">Total</div>
                      <div className="font-semibold tabular-nums">
                        {tokenMeta ? `${totalDisplay} ${tokenMeta.symbol}` : totalDisplay}
                      </div>
                    </div>

                    {tokenMeta ? (
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-muted">Allowance (current)</div>
                        <div className="font-semibold tabular-nums">
                          {prettyNumber(formatUnitsSafe(tokenMeta.allowance, tokenMeta.decimals), 6)}{" "}
                          {tokenMeta.symbol}
                        </div>
                      </div>
                    ) : null}

                    {tx.error ? (
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                        {tx.error}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 space-y-2">
                    <Button onClick={send} disabled={!canSend} className="w-full justify-center">
                      {tx.isBusy ? (
                        <>
                          <LoadingSpinner />
                          <span>{tx.label}</span>
                        </>
                      ) : tx.stage === "success" ? (
                        <>
                          <FiCheck className="h-4 w-4" />
                          <span>Sent</span>
                        </>
                      ) : (
                        <span>{tx.label}</span>
                      )}
                    </Button>

                    <button
                      onClick={resetAll}
                      disabled={tx.isBusy}
                      className="
                        w-full inline-flex items-center justify-center gap-2
                        h-11 rounded-2xl border border-border bg-background
                        text-sm font-semibold
                        hover:border-foreground/15 hover:bg-card transition
                        disabled:opacity-50 disabled:pointer-events-none
                      "
                    >
                      <FiTrash2 className="h-4 w-4" />
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </AppCard>

        <AppToast show={toast.show} message={toast.msg} tone={toast.tone} />
      </Container>
    </div>
  );
}
