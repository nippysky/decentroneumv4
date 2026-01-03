// app/app/decent-giver/[id]/giverPackageClient.tsx
"use client";

import * as React from "react";
import { ethers } from "ethers";
import { FiCopy, FiExternalLink, FiAlertTriangle } from "react-icons/fi";
import { useRouter } from "next/navigation";

import { Container } from "@/src/ui/Container";
import { Button } from "@/src/ui/Button";
import { LoadingSpinner } from "@/src/ui/LoadingSpinner";
import { AppCard } from "@/src/ui/app/AppCard";
import { AppField, AppInput } from "@/src/ui/app/AppForm";
import { AppToast } from "@/src/ui/app/AppFeedback";
import { useAppToast } from "@/src/ui/app/useAppToast";
import { useTxState } from "@/src/ui/app/useTxState";
import { useAppConnection } from "@/src/lib/useAppConnection";
import { decentDonationABI, decentDonationCA } from "@/src/lib/requisites";

const EXPLORER_ADDR = "https://blockexplorer.electroneum.com/address/";
const EXPLORER_TX = "https://blockexplorer.electroneum.com/tx/";

type DonationStruct = {
  creator: `0x${string}`;
  title: string;
  description: string;
  goalAmount: bigint;
  deadline: bigint; // seconds
  totalRaised: bigint;
  withdrawn: boolean;
};

type DonorInfo = {
  donor: `0x${string}`;
  amount: bigint;
};

function clampDecimal(raw: string) {
  const v = raw.replace(/,/g, ".").trim();
  if (v === "") return "";
  if (!/^\d*\.?\d*$/.test(v)) return null;
  return v;
}

function shortAddr(a: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function formatCompact(n: number, maxFrac = 2) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: maxFrac,
  }).format(n);
}

function progressPct(raised: bigint, goal: bigint) {
  if (goal <= BigInt(0)) return 0;
  const r = Number(ethers.formatEther(raised));
  const g = Number(ethers.formatEther(goal));
  if (!Number.isFinite(r) || !Number.isFinite(g) || g <= 0) return 0;
  return Math.max(0, Math.min(100, (r / g) * 100));
}

function formatCountdownMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

async function safeCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

function shortErr(e: unknown) {
  if (!e) return "Transaction failed";
  if (typeof e === "string") return e;
  const maybe = e as { shortMessage?: string; message?: string; reason?: string };
  return maybe.shortMessage || maybe.reason || maybe.message || "Transaction failed";
}

async function getProviderOrThrow() {
  if (!window.ethereum) throw new Error("Wallet provider not found");
  return new ethers.BrowserProvider(window.ethereum);
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-3 h-2 w-full rounded-full bg-border overflow-hidden">
      <div
        className="h-2 rounded-full bg-primary transition-all"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export default function GiverPackageClient({ donationId }: { donationId: string }) {
  const router = useRouter();
  const { address, isConnected } = useAppConnection();
  const { toastProps, showToast } = useAppToast();

  const idNum = React.useMemo(() => Number(donationId), [donationId]);

  const [donation, setDonation] = React.useState<DonationStruct | null>(null);
  const [donors, setDonors] = React.useState<DonorInfo[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [donateAmount, setDonateAmount] = React.useState("");

  const donateTx = useTxState({
    idle: "Donate",
    signing: "Confirming…",
    pending: "Donating…",
  });

  const withdrawTx = useTxState({
    idle: "Withdraw",
    signing: "Confirming…",
    pending: "Withdrawing…",
  });

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const isExpired = donation ? nowSec >= donation.deadline : false;

  const isCreator =
    donation && address
      ? donation.creator.toLowerCase() === address.toLowerCase()
      : false;

  const canDonate = !!donation && !donation.withdrawn && !isExpired;
  const canWithdraw = !!donation && isCreator && !donation.withdrawn && isExpired;

  const goalN = donation ? Number(ethers.formatEther(donation.goalAmount)) : 0;
  const raisedN = donation ? Number(ethers.formatEther(donation.totalRaised)) : 0;
  const prog = donation ? progressPct(donation.totalRaised, donation.goalAmount) : 0;

  const timeLeftMs = React.useMemo(() => {
    if (!donation) return 0;
    const deadlineMs = Number(donation.deadline) * 1000;
    return Math.max(0, deadlineMs - Date.now());
  }, [donation]);

  async function fetchDetails() {
    if (!window.ethereum) return;

    if (!Number.isFinite(idNum) || idNum < 0) {
      setErrorMsg("Invalid donation id.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const provider = await getProviderOrThrow();
      const c = new ethers.Contract(decentDonationCA, decentDonationABI, provider);

      const d = (await c.donations(idNum)) as DonationStruct;
      setDonation(d);

      const donorArray = (await c.getDonorsForDonation(idNum)) as DonorInfo[];
      setDonors(donorArray || []);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to fetch donation details.");
      showToast("Failed to fetch donation", "danger");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idNum]);

  async function donate() {
    if (!address) return showToast("Not connected", "danger");
    if (!canDonate) return showToast("Donation is not active", "danger");

    const amt = donateAmount.trim();
    if (!amt || !/^\d+(\.\d+)?$/.test(amt) || Number(amt) <= 0) {
      showToast("Enter a valid amount", "danger");
      return;
    }

    try {
      donateTx.startSigning();

      const provider = await getProviderOrThrow();
      const signer = await provider.getSigner(address);
      const c = new ethers.Contract(decentDonationCA, decentDonationABI, signer);

      const valueWei = ethers.parseEther(amt);

      donateTx.startPending(null);
      const tx = await c.donate(idNum, { value: valueWei });
      donateTx.startPending(tx?.hash ?? null);
      await tx.wait();

      showToast("Donation successful", "success");
      donateTx.succeed();
      setDonateAmount("");
      await fetchDetails();
    } catch (e) {
      const msg = shortErr(e);
      console.error(e);
      showToast(msg, "danger");
      donateTx.fail(msg);
    }
  }

  async function withdraw() {
    if (!address) return showToast("Not connected", "danger");
    if (!canWithdraw) return showToast("Withdraw not available", "danger");

    try {
      withdrawTx.startSigning();

      const provider = await getProviderOrThrow();
      const signer = await provider.getSigner(address);
      const c = new ethers.Contract(decentDonationCA, decentDonationABI, signer);

      withdrawTx.startPending(null);
      const tx = await c.withdraw(idNum);
      withdrawTx.startPending(tx?.hash ?? null);
      await tx.wait();

      showToast("Withdrawal successful", "success");
      withdrawTx.succeed();
      await fetchDetails();
    } catch (e) {
      const msg = shortErr(e);
      console.error(e);
      showToast(msg, "danger");
      withdrawTx.fail(msg);
    }
  }

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = encodeURIComponent("Check out this donation campaign:");
  const urlEncoded = encodeURIComponent(pageUrl);

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${shareText}%20${urlEncoded}`, "_blank", "noopener,noreferrer");
  }
  function shareTelegram() {
    window.open(`https://t.me/share/url?url=${urlEncoded}&text=${shareText}`, "_blank", "noopener,noreferrer");
  }
  function shareX() {
    window.open(`https://x.com/intent/tweet?url=${urlEncoded}&text=${shareText}`, "_blank", "noopener,noreferrer");
  }

  const latestHash = donateTx.txHash || withdrawTx.txHash;

  return (
    <div className="pt-10 sm:pt-14 pb-16">
      <Container>
        <AppCard
          title="Donation details"
          subtitle="Donate while active. Withdraw is creator-only after expiry."
          right={
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                Back
              </Button>
              <Button variant="ghost" onClick={fetchDetails} disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Refreshing…
                  </>
                ) : (
                  <>
                    <FiExternalLink className="h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          }
        >
          {!isConnected ? (
            <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted">
              Not connected. Use the connect button in the header to continue.
            </div>
          ) : null}

          {errorMsg ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
              <FiAlertTriangle className="h-5 w-5 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          ) : null}

          <div className="mt-6 rounded-3xl border border-border bg-background p-6">
            <div className="flex flex-col gap-1">
              <div className="text-lg font-semibold">
                {loading ? "Loading…" : donation?.title || `Donation #${donationId}`}
              </div>
              {donation?.description ? (
                <div className="text-sm text-muted">{donation.description}</div>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="text-xs text-muted">Goal</div>
                <div className="mt-1 font-semibold tabular-nums">
                  {formatCompact(goalN)} ETN
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="text-xs text-muted">Raised</div>
                <div className="mt-1 font-semibold tabular-nums">
                  {formatCompact(raisedN)} ETN
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="text-xs text-muted">Status</div>
                <div className="mt-1 font-semibold">
                  {!donation
                    ? "—"
                    : donation.withdrawn
                    ? "Withdrawn"
                    : isExpired
                    ? "Expired"
                    : "Active"}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="text-xs text-muted">Time left</div>
                <div className="mt-1 font-semibold tabular-nums">
                  {!donation ? "—" : isExpired ? "Expired" : formatCountdownMs(timeLeftMs)}
                </div>
              </div>
            </div>

            <ProgressBar value={prog} />
            <div className="mt-2 text-xs text-muted">{prog.toFixed(2)}% of goal</div>

            {donation?.creator ? (
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs text-muted">
                  Creator:{" "}
                  <a
                    className="font-semibold underline underline-offset-2"
                    href={`${EXPLORER_ADDR}${donation.creator}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortAddr(donation.creator)}
                  </a>
                </div>

                <button
                  onClick={async () => {
                    const ok = await safeCopy(donation.creator);
                    showToast(ok ? "Copied" : "Copy failed", ok ? "success" : "danger");
                  }}
                  className="
                    inline-flex items-center gap-2
                    h-10 px-3 rounded-2xl
                    border border-border bg-background
                    text-sm font-semibold
                    hover:border-foreground/15 hover:bg-card transition
                  "
                >
                  <FiCopy className="h-4 w-4" />
                  Copy creator
                </button>
              </div>
            ) : null}

            <div className="mt-8">
              <div className="text-sm font-semibold">Share</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={shareWhatsApp}>WhatsApp</Button>
                <Button variant="secondary" onClick={shareTelegram}>Telegram</Button>
                <Button variant="secondary" onClick={shareX}>X</Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const ok = await safeCopy(pageUrl);
                    showToast(ok ? "Link copied" : "Copy failed", ok ? "success" : "danger");
                  }}
                >
                  Copy link
                </Button>
              </div>
            </div>

            {latestHash ? (
              <div className="mt-6 text-xs text-muted">
                Latest tx:{" "}
                <a
                  className="font-semibold underline underline-offset-2"
                  href={`${EXPLORER_TX}${latestHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddr(latestHash)}
                </a>
              </div>
            ) : null}
          </div>

          {isConnected && canDonate ? (
            <div className="mt-6 rounded-3xl border border-border bg-background p-6">
              <div className="text-sm font-semibold">Donate</div>
              <div className="mt-1 text-sm text-muted">Send ETN directly to this campaign.</div>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <AppField label="Amount (ETN)" hint="Numbers only">
                  <AppInput
                    value={donateAmount}
                    onChange={(e) => {
                      const next = clampDecimal(e.target.value);
                      if (next === null) return;
                      setDonateAmount(next);
                    }}
                    placeholder="e.g. 1.5"
                    inputMode="decimal"
                    disabled={donateTx.isBusy || loading}
                  />
                </AppField>

                <div className="sm:self-end">
                  <Button
                    onClick={donate}
                    disabled={donateTx.isBusy || loading || !donateAmount.trim()}
                    className={donateTx.isBusy ? "btn-shimmer" : ""}
                  >
                    {donateTx.isBusy ? (
                      <>
                        <LoadingSpinner />
                        {donateTx.label}
                      </>
                    ) : (
                      donateTx.label
                    )}
                  </Button>
                </div>
              </div>

              {donateTx.error ? (
                <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
                  {donateTx.error}
                </div>
              ) : null}
            </div>
          ) : null}

          {isConnected && canWithdraw ? (
            <div className="mt-6 rounded-3xl border border-border bg-background p-6">
              <div className="text-sm font-semibold">Withdraw</div>
              <div className="mt-1 text-sm text-muted">
                Creator-only. Available after expiry if not withdrawn.
              </div>

              <div className="mt-4">
                <Button
                  onClick={withdraw}
                  disabled={withdrawTx.isBusy || loading}
                  className={withdrawTx.isBusy ? "btn-shimmer" : ""}
                >
                  {withdrawTx.isBusy ? (
                    <>
                      <LoadingSpinner />
                      {withdrawTx.label}
                    </>
                  ) : (
                    withdrawTx.label
                  )}
                </Button>
              </div>

              {withdrawTx.error ? (
                <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
                  {withdrawTx.error}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 rounded-3xl border border-border bg-background p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Donors</div>
              <div className="text-xs text-muted">{donors.length}</div>
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-muted">Loading…</div>
            ) : donors.length === 0 ? (
              <div className="mt-4 text-sm text-muted">No donors yet.</div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-1 gap-3 lg:hidden">
                  {donors.map((x, idx) => {
                    const amt = Number(ethers.formatEther(x.amount));
                    return (
                      <div key={idx} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <a
                            className="text-sm font-semibold underline underline-offset-2"
                            href={`${EXPLORER_ADDR}${x.donor}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shortAddr(x.donor)}
                          </a>
                          <button
                            onClick={async () => {
                              const ok = await safeCopy(x.donor);
                              showToast(ok ? "Copied" : "Copy failed", ok ? "success" : "danger");
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 h-9 text-xs font-semibold"
                          >
                            <FiCopy className="h-4 w-4" />
                            Copy
                          </button>
                        </div>

                        <div className="mt-2 text-xs text-muted">Amount</div>
                        <div className="mt-1 text-sm font-semibold tabular-nums">
                          {amt.toFixed(4)} ETN
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden lg:block mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted">
                      <tr className="border-b border-border">
                        <th className="text-left font-semibold px-5 py-4">Donor</th>
                        <th className="text-right font-semibold px-5 py-4">Amount (ETN)</th>
                        <th className="text-right font-semibold px-5 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donors.map((x, idx) => {
                        const amt = Number(ethers.formatEther(x.amount));
                        return (
                          <tr key={idx} className="border-b border-border/70 last:border-b-0">
                            <td className="px-5 py-4">
                              <a
                                className="font-semibold underline underline-offset-2"
                                href={`${EXPLORER_ADDR}${x.donor}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {shortAddr(x.donor)}
                              </a>
                            </td>
                            <td className="px-5 py-4 text-right font-semibold tabular-nums">
                              {amt.toFixed(4)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={async () => {
                                  const ok = await safeCopy(x.donor);
                                  showToast(ok ? "Copied" : "Copy failed", ok ? "success" : "danger");
                                }}
                                className="
                                  inline-flex items-center gap-2
                                  h-10 px-3 rounded-2xl
                                  border border-border bg-background
                                  text-sm font-semibold
                                  hover:border-foreground/15 hover:bg-card transition
                                "
                              >
                                <FiCopy className="h-4 w-4" />
                                Copy
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </AppCard>

        <AppToast {...toastProps} />
      </Container>
    </div>
  );
}
