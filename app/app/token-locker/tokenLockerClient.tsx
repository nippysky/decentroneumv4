// app/app/token-locker/tokenLockerClient.tsx
"use client";

import * as React from "react";
import { ethers } from "ethers";
import { FiCheck, FiClock, FiTrash2 } from "react-icons/fi";

import { Container } from "@/src/ui/Container";
import { Button } from "@/src/ui/Button";
import { AppCard } from "@/src/ui/app/AppCard";
import { AppField, AppInput } from "@/src/ui/app/AppForm";
import { AppToast } from "@/src/ui/app/AppFeedback";
import { useAppToast } from "@/src/ui/app/useAppToast";
import { useTxState } from "@/src/ui/app/useTxState";
import { LoadingSpinner } from "@/src/ui/LoadingSpinner";
import { useAppConnection } from "@/src/lib/useAppConnection";

import { decentLockABI, decentLockerCA } from "@/src/lib/requisites";

/**
 * Token Locker (revamp)
 * - AppGate handles connect gate (no connect UI here)
 * - Verifies token (name/symbol/decimals/balance + allowance)
 * - Reads feePercentage from contract
 * - Locks by approving (amount + fee) but calling lockTokens(amount, duration)
 * - Lists locks for the selected token and withdraws using the true lock index
 * - Inputs are sanitized (no letters)
 */

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
] as const;

type TokenMeta = {
  address: string; // checksum
  name: string;
  symbol: string;
  decimals: number;
  balance: bigint;
  allowance: bigint;
};

type LockRow = {
  index: number; // IMPORTANT: actual contract index
  tokenAddress: string;
  amount: bigint;
  unlockTimeSec: number;
};

function clampAddr(s: string) {
  return s.trim();
}

function sanitizeInteger(raw: string) {
  return raw.replace(/[^\d]/g, "");
}

function sanitizeDecimal(raw: string, maxDecimals = 18) {
  let s = raw.replace(/[^\d.]/g, "");

  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s =
      s.slice(0, firstDot + 1) +
      s
        .slice(firstDot + 1)
        .replace(/\./g, "");
  }

  if (s.startsWith(".")) s = `0${s}`;

  const dot = s.indexOf(".");
  if (dot !== -1) {
    const intPart = s.slice(0, dot);
    const fracPart = s.slice(dot + 1, dot + 1 + maxDecimals);
    s = `${intPart}.${fracPart}`;
  }

  return s;
}

function shortErr(e: unknown) {
  if (!e) return "Something went wrong";
  if (typeof e === "string") return e;
  const maybe = e as { shortMessage?: string; message?: string; reason?: string };
  return maybe.shortMessage || maybe.reason || maybe.message || "Something went wrong";
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

async function getProviderOrThrow() {
  if (!window.ethereum) throw new Error("Wallet provider not found");
  return new ethers.BrowserProvider(window.ethereum);
}

async function safeApproveExact(token: ethers.Contract, spender: string, amount: bigint) {
  try {
    const tx = await token.approve(spender, amount);
    await tx.wait();
    return;
  } catch {
    const tx0 = await token.approve(spender, BigInt(0));
    await tx0.wait();
    const tx1 = await token.approve(spender, amount);
    await tx1.wait();
  }
}

/**
 * Fee math:
 * - Most likely feePercentage is a whole percent (e.g. 1 = 1%)
 * - If it’s > 100, treat it as basis points (e.g. 100 = 1%)
 */
function feeMode(fee: number) {
  return fee > 100 ? "bps" : "percent";
}
function computeFee(amount: bigint, feePctRaw: number) {
  const feePct = Math.max(0, Math.floor(feePctRaw || 0));

  if (feeMode(feePct) === "bps") {
    // basis points
    return (amount * BigInt(feePct)) / BigInt(10_000);
  }
  // percent
  return (amount * BigInt(feePct)) / BigInt(100);
}
function computeMaxLockable(balance: bigint, feePctRaw: number) {
  const feePct = Math.max(0, Math.floor(feePctRaw || 0));

  if (feeMode(feePct) === "bps") {
    const denom = BigInt(10_000 + feePct);
    return denom === BigInt(0) ? balance : (balance * BigInt(10_000)) / denom;
  }

  const denom = BigInt(100 + feePct);
  return denom === BigInt(0) ? balance : (balance * BigInt(100)) / denom;
}

export default function TokenLockerClient() {
  const { address, isConnected } = useAppConnection();
  const { toastProps, showToast } = useAppToast();

  const verifyTx = useTxState({
    idle: "Verify token",
    signing: "Verifying…",
    pending: "Verifying…",
  });

  const lockTx = useTxState({
    idle: "Lock tokens",
    signing: "Confirming…",
    pending: "Locking…",
  });

  const [tokenAddress, setTokenAddress] = React.useState("");
  const [tokenMeta, setTokenMeta] = React.useState<TokenMeta | null>(null);

  const [feePct, setFeePct] = React.useState<number>(0);

  const [amountText, setAmountText] = React.useState("");
  const [durationSecText, setDurationSecText] = React.useState("");

  const [locks, setLocks] = React.useState<LockRow[]>([]);
  const [withdrawingIndex, setWithdrawingIndex] = React.useState<number | null>(null);


  const parsedAmount = React.useMemo(() => {
    if (!tokenMeta) return BigInt(0);
    if (!amountText.trim()) return BigInt(0);
    try {
      return ethers.parseUnits(amountText, tokenMeta.decimals);
    } catch {
      return BigInt(0);
    }
  }, [amountText, tokenMeta]);

  const parsedDuration = React.useMemo(() => {
    const v = durationSecText.trim();
    if (!v) return 0;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.floor(n);
  }, [durationSecText]);

  const feeAmount = React.useMemo(() => computeFee(parsedAmount, feePct), [parsedAmount, feePct]);
  const requiredAllowance = React.useMemo(() => parsedAmount + feeAmount, [parsedAmount, feeAmount]);

  const amountDisplay = tokenMeta ? prettyNumber(amountText || "0", 6) : "0";
  const feeDisplay = tokenMeta
    ? prettyNumber(formatUnitsSafe(feeAmount, tokenMeta.decimals), 6)
    : "0";
  const totalDisplay = tokenMeta
    ? prettyNumber(formatUnitsSafe(requiredAllowance, tokenMeta.decimals), 6)
    : "0";

  const balanceDisplay = tokenMeta
    ? prettyNumber(formatUnitsSafe(tokenMeta.balance, tokenMeta.decimals), 6)
    : "—";

  const feeLabel =
    feeMode(feePct) === "bps"
      ? `${feePct} bps`
      : `${feePct}%`;

  const busy = verifyTx.isBusy || lockTx.isBusy || withdrawingIndex !== null;

  const canVerify = isConnected && ethers.isAddress(tokenAddress) && !verifyTx.isBusy;
  const canLock =
    isConnected &&
    !!tokenMeta &&
    ethers.isAddress(tokenAddress) &&
    parsedAmount > BigInt(0) &&
    parsedDuration > 0 &&
    !lockTx.isBusy &&
    !verifyTx.isBusy;

  function resetAll() {
    setTokenAddress("");
    setTokenMeta(null);
    setFeePct(0);
    setAmountText("");
    setDurationSecText("");
    setLocks([]);
    setWithdrawingIndex(null);
    verifyTx.reset();
    lockTx.reset();
    showToast("Cleared", "neutral");
  }

  async function fetchLocks(meta: TokenMeta) {
    if (!address) return;

    const provider = await getProviderOrThrow();
    const locker = new ethers.Contract(decentLockerCA, decentLockABI, provider);

    const countRaw: bigint = await locker.getLockCount(address).catch(() => BigInt(0));
    const count = Number(countRaw);

    const out: LockRow[] = [];
    for (let i = 0; i < count; i++) {
      const info = await locker.getLockInfo(address, i).catch(() => null);
      if (!info) continue;

      const tokenAddr = String(info.tokenAddress || "");
      if (!tokenAddr) continue;

      // only show locks for this token
      if (ethers.getAddress(tokenAddr) !== meta.address) continue;

      const amount = BigInt(info.amount ?? 0);
      const unlockTimeSec = Number(info.unlockTime ?? 0);

      out.push({
        index: i, // CRITICAL: keep the real contract index
        tokenAddress: ethers.getAddress(tokenAddr),
        amount,
        unlockTimeSec,
      });
    }

    // newest first (optional)
    out.sort((a, b) => b.unlockTimeSec - a.unlockTimeSec);

    setLocks(out);
  }

  async function verifyToken() {
    if (!address) return showToast("Not connected", "danger");
    const t = tokenAddress.trim();
    if (!ethers.isAddress(t)) return showToast("Enter a valid token address", "danger");

    verifyTx.startSigning();

    try {
      const provider = await getProviderOrThrow();

      // fee from locker
      const locker = new ethers.Contract(decentLockerCA, decentLockABI, provider);
      const feeRaw: bigint = await locker.feePercentage().catch(() => BigInt(0));
      setFeePct(Number(feeRaw) || 0);

      const token = new ethers.Contract(t, ERC20_ABI, provider);

      const [name, symbol, decimals, balance, allowance] = await Promise.all([
        token.name().catch(() => "Token"),
        token.symbol().catch(() => "TOKEN"),
        token.decimals().catch(() => 18),
        token.balanceOf(address).catch(() => BigInt(0)),
        token.allowance(address, decentLockerCA).catch(() => BigInt(0)),
      ]);

      const meta: TokenMeta = {
        address: ethers.getAddress(t),
        name: String(name),
        symbol: String(symbol),
        decimals: Number(decimals) || 18,
        balance: BigInt(balance),
        allowance: BigInt(allowance),
      };

      setTokenMeta(meta);

      verifyTx.succeed();
      showToast("Token verified", "success");

      await fetchLocks(meta);
    } catch (e) {
      setTokenMeta(null);
      setLocks([]);
      verifyTx.fail(shortErr(e));
      showToast(shortErr(e), "danger");
    } finally {
      window.setTimeout(() => verifyTx.reset(), 400);
    }
  }

  async function setMax() {
    if (!tokenMeta) return;

    // Max lockable so that balance covers (amount + fee)
    const maxWei = computeMaxLockable(tokenMeta.balance, feePct);

    const s = formatUnitsSafe(maxWei, tokenMeta.decimals);
    // keep it neat (no 50-digit decimals)
    const cleaned = sanitizeDecimal(s, Math.min(tokenMeta.decimals, 18));
    setAmountText(cleaned);
  }

  async function lockTokens() {
    if (!address) return showToast("Not connected", "danger");
    if (!tokenMeta) return showToast("Verify token first", "danger");
    if (!parsedDuration || parsedDuration <= 0) return showToast("Enter a valid duration", "danger");
    if (parsedAmount <= BigInt(0)) return showToast("Enter a valid amount", "danger");

    // Balance check: must cover amount + fee
    if (requiredAllowance > tokenMeta.balance) {
      return showToast("Insufficient balance for amount + fee", "danger");
    }

    lockTx.startSigning();

    try {
      const provider = await getProviderOrThrow();
      const signer = await provider.getSigner(address);

      const token = new ethers.Contract(tokenMeta.address, ERC20_ABI, signer);
      const locker = new ethers.Contract(decentLockerCA, decentLockABI, signer);

      // refresh allowance
      const allowanceNow: bigint = await token
        .allowance(address, decentLockerCA)
        .catch(() => BigInt(0));

      // Approve only if needed (amount + fee)
      if (allowanceNow < requiredAllowance) {
        lockTx.startPending();
        await safeApproveExact(token, decentLockerCA, requiredAllowance);
      }

      lockTx.startPending();

      // IMPORTANT: call lockTokens with the lock amount (NOT amount+fee)
      const tx = await locker.lockTokens(tokenMeta.address, parsedAmount, BigInt(parsedDuration));
      await tx.wait();

      lockTx.succeed();
      showToast("Tokens locked", "success");

      // refresh meta + locks
      const provider2 = await getProviderOrThrow();
      const token2 = new ethers.Contract(tokenMeta.address, ERC20_ABI, provider2);

      const [balance, allowance] = await Promise.all([
        token2.balanceOf(address).catch(() => BigInt(0)),
        token2.allowance(address, decentLockerCA).catch(() => BigInt(0)),
      ]);

      const nextMeta: TokenMeta = {
        ...tokenMeta,
        balance: BigInt(balance),
        allowance: BigInt(allowance),
      };

      setTokenMeta(nextMeta);
      setAmountText("");
      setDurationSecText("");

      await fetchLocks(nextMeta);
    } catch (e) {
      lockTx.fail(shortErr(e));
      showToast(shortErr(e), "danger");
    } finally {
      window.setTimeout(() => lockTx.reset(), 600);
    }
  }

  async function withdraw(lock: LockRow) {
    if (!address) return showToast("Not connected", "danger");
    if (!tokenMeta) return showToast("Verify token first", "danger");

    setWithdrawingIndex(lock.index);

    try {
      const provider = await getProviderOrThrow();
      const signer = await provider.getSigner(address);
      const locker = new ethers.Contract(decentLockerCA, decentLockABI, signer);

      const tx = await locker.withdrawTokens(BigInt(lock.index));
      await tx.wait();

      showToast("Tokens withdrawn", "success");

      // refresh locks + balance
      const provider2 = await getProviderOrThrow();
      const token2 = new ethers.Contract(tokenMeta.address, ERC20_ABI, provider2);

      const balance: bigint = await token2.balanceOf(address).catch(() => BigInt(0));
      const allowance: bigint = await token2.allowance(address, decentLockerCA).catch(() => BigInt(0));

      const nextMeta: TokenMeta = { ...tokenMeta, balance: BigInt(balance), allowance: BigInt(allowance) };
      setTokenMeta(nextMeta);

      await fetchLocks(nextMeta);
    } catch (e) {
      showToast(shortErr(e), "danger");
    } finally {
      setWithdrawingIndex(null);
    }
  }

  // live countdown refresh
  const [, forceTick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => forceTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  function formatCountdown(unlockTimeSec: number) {
    const msLeft = unlockTimeSec * 1000 - Date.now();
    if (msLeft <= 0) return { done: true, text: "Unlocked" };

    const s = Math.floor(msLeft / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    const parts = [
      d ? `${d}d` : null,
      h ? `${h}h` : null,
      m ? `${m}m` : null,
      `${sec}s`,
    ].filter(Boolean);

    return { done: false, text: parts.join(" ") };
  }

  return (
    <div className="pt-10 sm:pt-14 pb-16">
      <Container>
        <AppCard
          title="Token Locker"
          subtitle="Lock ERC-20 tokens for a fixed time. Withdraw once unlocked."
          right={
            <Button variant="ghost" onClick={resetAll} disabled={busy} className="gap-2">
              <FiTrash2 className="h-4 w-4" />
              Reset
            </Button>
          }
        >
          {!isConnected ? (
            <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted">
              Not connected. Use Connect in the header to continue.
            </div>
          ) : (
            <>
              {/* Token */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <AppField label="Token contract" hint="ERC-20 address">
                    <AppInput
                      value={tokenAddress}
                      onChange={(e) => {
                        const v = clampAddr(e.target.value);
                        setTokenAddress(v);
                        // if user edits token address, clear prior state
                        setTokenMeta(null);
                        setLocks([]);
                        setAmountText("");
                        setDurationSecText("");
                      }}
                      placeholder="0x…"
                      disabled={busy}
                      inputMode="text"
                      spellCheck={false}
                    />
                  </AppField>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={verifyToken} disabled={!canVerify} className={verifyTx.isBusy ? "btn-shimmer" : ""}>
                      {verifyTx.isBusy ? (
                        <>
                          <LoadingSpinner className="h-4 w-4" />
                          <span>{verifyTx.label}</span>
                        </>
                      ) : tokenMeta ? (
                        <>
                          <FiCheck className="h-4 w-4" />
                          <span>Verified</span>
                        </>
                      ) : (
                        <span>Verify token</span>
                      )}
                    </Button>

                    {tokenMeta ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 h-11 text-xs font-semibold">
                        Fee: {feeLabel}
                      </div>
                    ) : null}
                  </div>
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

              {/* Lock form */}
              <div className="mt-6 rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Lock tokens</div>
                    <div className="mt-1 text-sm text-muted">
                      Amount + fee must be approved. Amount itself is locked.
                    </div>
                  </div>

                  <Button variant="secondary" onClick={setMax} disabled={!tokenMeta || busy}>
                    Max
                  </Button>
                </div>

                <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <AppField label="Amount" hint={tokenMeta ? `Decimals: ${tokenMeta.decimals}` : "Verify token first"}>
                    <AppInput
                      value={amountText}
                      onChange={(e) =>
                        setAmountText(
                          sanitizeDecimal(e.target.value, Math.min(tokenMeta?.decimals ?? 18, 18))
                        )
                      }
                      placeholder="0.0"
                      inputMode="decimal"
                      disabled={!tokenMeta || busy}
                    />
                  </AppField>

                  <AppField label="Duration (seconds)" hint="Numbers only (e.g. 86400 = 1 day)">
                    <AppInput
                      value={durationSecText}
                      onChange={(e) => setDurationSecText(sanitizeInteger(e.target.value))}
                      placeholder="86400"
                      inputMode="numeric"
                      disabled={!tokenMeta || busy}
                    />
                  </AppField>
                </div>

                {/* Summary */}
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="text-xs text-muted">Amount</div>
                    <div className="mt-1 text-sm font-semibold tabular-nums">
                      {tokenMeta ? `${amountDisplay} ${tokenMeta.symbol}` : "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="text-xs text-muted">Fee ({feeLabel})</div>
                    <div className="mt-1 text-sm font-semibold tabular-nums">
                      {tokenMeta ? `${feeDisplay} ${tokenMeta.symbol}` : "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="text-xs text-muted">Total required</div>
                    <div className="mt-1 text-sm font-semibold tabular-nums">
                      {tokenMeta ? `${totalDisplay} ${tokenMeta.symbol}` : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <Button
                    onClick={lockTokens}
                    disabled={!canLock}
                    className={`w-full justify-center ${lockTx.isBusy ? "btn-shimmer" : ""}`}
                  >
                    {lockTx.isBusy ? (
                      <>
                        <LoadingSpinner className="h-4 w-4" />
                        <span>{lockTx.label}</span>
                      </>
                    ) : lockTx.stage === "success" ? (
                      <>
                        <FiCheck className="h-4 w-4" />
                        <span>Locked</span>
                      </>
                    ) : (
                      <span>Lock tokens</span>
                    )}
                  </Button>
                </div>
              </div>

              {/* Locks */}
              <div className="mt-6 rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Your locks</div>
                    <div className="mt-1 text-sm text-muted">
                      {tokenMeta ? `Showing locks for ${tokenMeta.symbol}` : "Verify a token to view locks"}
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 text-xs text-muted">
                    <FiClock className="h-4 w-4" />
                    Live countdown
                  </div>
                </div>

                {!tokenMeta ? (
                  <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm text-muted">
                    Verify a token to load locks.
                  </div>
                ) : locks.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm text-muted">
                    No locks found for this token.
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    {locks.map((l) => {
                      const cd = formatCountdown(l.unlockTimeSec);
                      const amount = prettyNumber(formatUnitsSafe(l.amount, tokenMeta.decimals), 6);
                      const canWithdraw = cd.done && withdrawingIndex === null && !lockTx.isBusy && !verifyTx.isBusy;

                      return (
                        <div key={l.index} className="rounded-3xl border border-border bg-background p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold tabular-nums">
                                {amount} {tokenMeta.symbol}
                              </div>
                              <div className="mt-1 text-xs text-muted">
                                Unlocks:{" "}
                                <span className="font-semibold">
                                  {new Date(l.unlockTimeSec * 1000).toLocaleString()}
                                </span>{" "}
                                • Lock index: <span className="font-semibold">{l.index}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div
                                className={`
                                  inline-flex items-center rounded-full border px-3 h-9 text-xs font-semibold
                                  ${
                                    cd.done
                                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                                      : "border-border bg-card text-foreground/80"
                                  }
                                `}
                              >
                                {cd.text}
                              </div>

                              <Button
                                onClick={() => withdraw(l)}
                                disabled={!canWithdraw}
                                className={withdrawingIndex === l.index ? "btn-shimmer" : ""}
                              >
                                {withdrawingIndex === l.index ? (
                                  <>
                                    <LoadingSpinner className="h-4 w-4" />
                                    Withdrawing…
                                  </>
                                ) : (
                                  "Withdraw"
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {(verifyTx.error || lockTx.error) ? (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
                  {verifyTx.error || lockTx.error}
                </div>
              ) : null}
            </>
          )}
        </AppCard>

        <AppToast {...toastProps} />
      </Container>
    </div>
  );
}
