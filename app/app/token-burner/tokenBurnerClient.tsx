// app/app/token-burner/tokenBurnerClient.tsx
"use client";

import * as React from "react";
import { ethers } from "ethers";
import { FiAlertTriangle, FiCheck, FiExternalLink, FiTrash2 } from "react-icons/fi";

import { Container } from "@/src/ui/Container";
import { Button } from "@/src/ui/Button";
import { AppCard } from "@/src/ui/app/AppCard";
import { AppField, AppInput } from "@/src/ui/app/AppForm";
import { AppToast } from "@/src/ui/app/AppFeedback";
import { useAppToast } from "@/src/ui/app/useAppToast";
import { useTxState } from "@/src/ui/app/useTxState";
import { useAppConnection } from "@/src/lib/useAppConnection";
import { LoadingSpinner } from "@/src/ui/LoadingSpinner";

const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const EXPLORER_TX = "https://blockexplorer.electroneum.com/tx/";

const ERC20_MIN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
] as const;

type TokenMeta = {
  address: string; // checksum
  name: string;
  symbol: string;
  decimals: number;
  balance: bigint;
};

function clampAddress(input: string) {
  return input.trim();
}

function clampNumericInput(raw: string) {
  // allow: "", "1", "1.", "1.23"
  const v = raw.replace(/,/g, ".").trim();
  if (v === "") return "";
  if (!/^\d*\.?\d*$/.test(v)) return null; // reject letters/symbols
  return v;
}

function prettyNumber(n: string, maxFrac = 6) {
  const x = Number(n);
  if (!Number.isFinite(x)) return n;
  return x.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

function formatUnitsSafe(v: bigint, decimals: number) {
  try {
    return ethers.formatUnits(v, decimals);
  } catch {
    return v.toString();
  }
}

function shorten(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function getProviderOrThrow() {
  if (!window.ethereum) throw new Error("Wallet provider not found");
  return new ethers.BrowserProvider(window.ethereum);
}

function shortErr(e: unknown) {
  if (!e) return "Transaction failed";
  if (typeof e === "string") return e;
  const maybe = e as { shortMessage?: string; message?: string; reason?: string };
  return maybe.shortMessage || maybe.reason || maybe.message || "Transaction failed";
}

export default function TokenBurnerClient() {
  const { address, isConnected } = useAppConnection();
  const { toastProps, showToast } = useAppToast();

  const [tokenAddress, setTokenAddress] = React.useState("");
  const [token, setToken] = React.useState<TokenMeta | null>(null);
  const [fetching, setFetching] = React.useState(false);
  const [warning, setWarning] = React.useState<string>("");

  const [amountText, setAmountText] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const [txHash, setTxHash] = React.useState<string | null>(null);

  const burnTx = useTxState({
    idle: "Burn",
    signing: "Confirming…",
    pending: "Burning…",
  });

  const balanceDisplay = React.useMemo(() => {
    if (!token) return "—";
    return prettyNumber(formatUnitsSafe(token.balance, token.decimals), 6);
  }, [token]);

  const amountParsed = React.useMemo(() => {
    if (!token) return { ok: false as const, wei: BigInt(0), reason: "Load token first" };

    const v = amountText.trim();
    if (!v) return { ok: false as const, wei: BigInt(0), reason: "Enter amount" };
    if (!/^\d+(\.\d+)?$/.test(v)) return { ok: false as const, wei: BigInt(0), reason: "Invalid amount" };

    try {
      const wei = ethers.parseUnits(v, token.decimals);
      if (wei <= BigInt(0)) return { ok: false as const, wei: BigInt(0), reason: "Amount must be > 0" };
      if (wei > token.balance) return { ok: false as const, wei, reason: "Insufficient balance" };
      return { ok: true as const, wei, reason: "" };
    } catch {
      return { ok: false as const, wei: BigInt(0), reason: "Invalid amount" };
    }
  }, [amountText, token]);

  const canFetch = isConnected && ethers.isAddress(tokenAddress) && !fetching && !burnTx.isBusy;
  const canBurn =
    isConnected &&
    !!token &&
    amountParsed.ok &&
    !burnTx.isBusy &&
    !fetching;

  React.useEffect(() => {
    // reset token meta when address changes
    setToken(null);
    setWarning("");
    setTxHash(null);
    setAmountText("");
  }, [tokenAddress]);

  async function fetchToken() {
    if (!address) return showToast("Not connected", "danger");

    const t = tokenAddress.trim();
    if (!ethers.isAddress(t)) {
      setWarning("Enter a valid token contract address.");
      showToast("Invalid token address", "danger");
      return;
    }

    setFetching(true);
    setWarning("");
    setToken(null);
    setTxHash(null);

    try {
      const provider = await getProviderOrThrow();
      const c = new ethers.Contract(t, ERC20_MIN_ABI, provider);

      const [name, symbol, decimals, bal] = await Promise.all([
        c.name().catch(() => "Token"),
        c.symbol().catch(() => "TOKEN"),
        c.decimals().catch(() => 18),
        c.balanceOf(address).catch(() => BigInt(0)),
      ]);

      const meta: TokenMeta = {
        address: ethers.getAddress(t),
        name: String(name),
        symbol: String(symbol),
        decimals: Number(decimals) || 18,
        balance: BigInt(bal),
      };

      setToken(meta);
      showToast(`Loaded ${meta.name} (${meta.symbol})`, "success");
    } catch (e) {
      console.error(e);
      setWarning("Could not fetch token details. Check the contract address.");
      showToast("Failed to fetch token", "danger");
    } finally {
      setFetching(false);
    }
  }

  async function burn() {
    if (!address) return showToast("Not connected", "danger");
    if (!token) return showToast("Load token first", "danger");
    if (!amountParsed.ok) return showToast(amountParsed.reason || "Fix amount", "danger");

    try {
      burnTx.startSigning();

      const provider = await getProviderOrThrow();
      const signer = await provider.getSigner(address);
      const c = new ethers.Contract(token.address, ERC20_MIN_ABI, signer);

      burnTx.startPending(null);

      const tx = await c.transfer(BURN_ADDRESS, amountParsed.wei);
      burnTx.startPending(tx?.hash ?? null);
      await tx.wait();

      setTxHash(tx.hash);

      // refresh balance
      const bal: bigint = await c.balanceOf(address).catch(() => BigInt(0));
      setToken((prev) => (prev ? { ...prev, balance: BigInt(bal) } : prev));

      setAmountText("");
      burnTx.succeed();
      showToast("Burn complete", "success");
    } catch (e) {
      const msg = shortErr(e);
      burnTx.fail(msg);
      showToast(msg, "danger");
    } finally {
      setConfirmOpen(false);
      // keep success visible; don’t auto-reset here
    }
  }

  function resetAll() {
    setTokenAddress("");
    setToken(null);
    setWarning("");
    setAmountText("");
    setConfirmOpen(false);
    setTxHash(null);
    burnTx.reset();
    showToast("Cleared", "neutral");
  }

  return (
    <div className="pt-10 sm:pt-14 pb-16">
      <Container>
        <AppCard
          title="Token Burner"
          subtitle="Send tokens to the burn address (0x…dEaD). This is irreversible."
          right={
            <button
              onClick={resetAll}
              disabled={fetching || burnTx.isBusy}
              className="
                inline-flex items-center gap-2
                h-10 px-3 rounded-2xl
                border border-border bg-background
                text-sm font-semibold
                hover:border-foreground/15 hover:bg-card transition
                disabled:opacity-50 disabled:pointer-events-none
              "
            >
              <FiTrash2 className="h-4 w-4" />
              Reset
            </button>
          }
        >
          {!isConnected ? (
            <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted">
              Not connected. Use the connect button in the header to continue.
            </div>
          ) : (
            <>
              {/* Token Address */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <AppField label="Token contract" hint="ERC-20 address">
                    <AppInput
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(clampAddress(e.target.value))}
                      placeholder="0x…"
                      disabled={fetching || burnTx.isBusy}
                      spellCheck={false}
                      inputMode="text"
                    />
                  </AppField>

                  {warning ? (
                    <div className="mt-2 inline-flex items-center gap-2 text-sm text-red-500">
                      <FiAlertTriangle className="h-4 w-4" />
                      {warning}
                    </div>
                  ) : null}

                  <div className="mt-3">
                    <Button onClick={fetchToken} disabled={!canFetch} className={fetching ? "btn-shimmer" : ""}>
                      {fetching ? (
                        <>
                          <LoadingSpinner />
                          Fetching…
                        </>
                      ) : (
                        "Fetch token"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card p-5">
                  <div className="text-xs text-muted">Token</div>
                  <div className="mt-1 text-sm font-semibold">
                    {token ? `${token.name} (${token.symbol})` : "—"}
                  </div>

                  <div className="mt-3 text-xs text-muted">Balance</div>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    {token ? `${balanceDisplay} ${token.symbol}` : "—"}
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="mt-6 rounded-3xl border border-border bg-card p-6">
                <div className="text-sm font-semibold">Amount to burn</div>
                <div className="mt-1 text-sm text-muted">
                  Burn address:{" "}
                  <span className="font-semibold tabular-nums">{shorten(BURN_ADDRESS)}</span>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <AppInput
                    value={amountText}
                    onChange={(e) => {
                      const next = clampNumericInput(e.target.value);
                      if (next === null) return; // reject letters
                      setAmountText(next);
                    }}
                    placeholder="0.00"
                    disabled={!token || fetching || burnTx.isBusy}
                    inputMode="decimal"
                  />

                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!token) return;
                      setAmountText(formatUnitsSafe(token.balance, token.decimals));
                    }}
                    disabled={!token || fetching || burnTx.isBusy}
                  >
                    MAX
                  </Button>
                </div>

                {!amountParsed.ok && amountText.trim() ? (
                  <div className="mt-2 text-xs text-red-500">{amountParsed.reason}</div>
                ) : null}

                <div className="mt-5">
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={!canBurn}
                    className="w-full justify-center"
                  >
                    {burnTx.isBusy ? (
                      <>
                        <LoadingSpinner />
                        <span>{burnTx.label}</span>
                      </>
                    ) : burnTx.stage === "success" ? (
                      <>
                        <FiCheck className="h-4 w-4" />
                        <span>Burned</span>
                      </>
                    ) : (
                      <span>{burnTx.label}</span>
                    )}
                  </Button>
                </div>

                {burnTx.error ? (
                  <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                    {burnTx.error}
                  </div>
                ) : null}
              </div>

              {/* Tx receipt */}
              {txHash ? (
                <div className="mt-6 rounded-3xl border border-border bg-card p-6">
                  <div className="text-sm font-semibold">Burn transaction</div>

                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-muted tabular-nums">{shorten(txHash)}</div>

                    <a
                      href={`${EXPLORER_TX}${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="
                        inline-flex items-center justify-center gap-2
                        h-11 px-4 rounded-2xl
                        border border-border bg-background
                        text-sm font-semibold
                        hover:border-foreground/15 hover:bg-card transition
                      "
                    >
                      <FiExternalLink className="h-4 w-4" />
                      View on Explorer
                    </a>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </AppCard>

        {/* Confirm modal */}
        {confirmOpen ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-6 shadow-xl">
              <div className="text-lg font-semibold">Confirm burn</div>
              <div className="mt-2 text-sm text-muted leading-relaxed">
                You are about to burn{" "}
                <span className="font-semibold text-foreground">
                  {amountText || "0"} {token?.symbol ?? ""}
                </span>{" "}
                by sending it to <span className="font-semibold">{shorten(BURN_ADDRESS)}</span>.
                This cannot be undone.
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmOpen(false)}
                  disabled={burnTx.isBusy}
                >
                  Cancel
                </Button>
                <Button
                  onClick={burn}
                  disabled={burnTx.isBusy || !canBurn}
                  className={burnTx.isBusy ? "btn-shimmer" : ""}
                >
                  {burnTx.isBusy ? (
                    <>
                      <LoadingSpinner />
                      Burning…
                    </>
                  ) : (
                    "Confirm & Burn"
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <AppToast {...toastProps} />
      </Container>
    </div>
  );
}
