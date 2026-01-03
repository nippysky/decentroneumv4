// app/app/decent-giver/giverClient.tsx
"use client";

import * as React from "react";
import { ethers } from "ethers";
import {
  FiPlus,
  FiTrash2,
  FiAlertTriangle,
  FiRefreshCw,
} from "react-icons/fi";
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

function clampText(s: string) {
  return s.replace(/\s+/g, " ").trimStart();
}

function clampDecimal(raw: string) {
  const v = raw.replace(/,/g, ".").trim();
  if (v === "") return "";
  if (!/^\d*\.?\d*$/.test(v)) return null;
  return v;
}

function clampInt(raw: string) {
  const v = raw.trim();
  if (v === "") return "";
  if (!/^\d*$/.test(v)) return null;
  return v;
}

function formatCompact(n: number, maxFrac = 2) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: maxFrac,
  }).format(n);
}

function pct(raised: bigint, goal: bigint) {
  if (goal <= BigInt(0)) return 0;
  const r = Number(ethers.formatEther(raised));
  const g = Number(ethers.formatEther(goal));
  if (!Number.isFinite(r) || !Number.isFinite(g) || g <= 0) return 0;
  const p = (r / g) * 100;
  return Math.max(0, Math.min(100, p));
}

function statusLabel(d: DonationStruct) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const expired = now >= d.deadline;
  if (d.withdrawn) return { text: "Withdrawn", tone: "neutral" as const };
  if (expired) return { text: "Expired", tone: "danger" as const };
  return { text: "Active", tone: "success" as const };
}

function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "danger" | "success";
  children: React.ReactNode;
}) {
  const cls =
    tone === "danger"
      ? "bg-red-500/10 text-red-500 border-red-500/20"
      : tone === "success"
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      : "bg-card text-foreground/80 border-border";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-2 h-2 w-full rounded-full bg-border overflow-hidden">
      <div
        className="h-2 rounded-full bg-primary transition-all"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

function shortErr(e: unknown) {
  if (!e) return "Transaction failed";
  if (typeof e === "string") return e;
  const maybe = e as { shortMessage?: string; message?: string; reason?: string };
  return (
    maybe.shortMessage || maybe.reason || maybe.message || "Transaction failed"
  );
}

async function getProviderOrThrow() {
  if (!window.ethereum) throw new Error("Wallet provider not found");
  return new ethers.BrowserProvider(window.ethereum);
}

export default function DecentGiverClient() {
  const router = useRouter();
  const { address, isConnected } = useAppConnection();
  const { toastProps, showToast } = useAppToast();

  const [isLoading, setIsLoading] = React.useState(false);
  const [donationIds, setDonationIds] = React.useState<number[]>([]);
  const [donations, setDonations] = React.useState<DonationStruct[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // create modal
  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [goal, setGoal] = React.useState("");
  const [hours, setHours] = React.useState("");

  const createTx = useTxState({
    idle: "Create donation",
    signing: "Confirming…",
    pending: "Creating…",
  });

  const active = React.useMemo(() => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const ids: number[] = [];
    donationIds.forEach((id, i) => {
      const d = donations[i];
      if (!d) return;
      const expired = now >= d.deadline;
      if (!d.withdrawn && !expired) ids.push(id);
    });
    return ids;
  }, [donationIds, donations]);

  const past = React.useMemo(() => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const ids: number[] = [];
    donationIds.forEach((id, i) => {
      const d = donations[i];
      if (!d) return;
      const expired = now >= d.deadline;
      if (d.withdrawn || expired) ids.push(id);
    });
    return ids;
  }, [donationIds, donations]);

  async function fetchMyDonations() {
    if (!address || !window.ethereum) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const provider = await getProviderOrThrow();
      const signer = await provider.getSigner(address);
      const c = new ethers.Contract(decentDonationCA, decentDonationABI, signer);

      const ids: number[] = await c.getMyDonations();
      setDonationIds(ids);

      const structs = await Promise.all(
        ids.map(async (id) => (await c.donations(id)) as DonationStruct)
      );

      setDonations(structs);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to fetch your donations.");
      showToast("Failed to fetch donations", "danger");
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    if (isConnected && address) fetchMyDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  function resetCreate() {
    setTitle("");
    setDescription("");
    setGoal("");
    setHours("");
  }

  function openDonation(id: number) {
    router.push(`/app/decent-giver/${id}`);
  }

  async function createDonation() {
    if (!address) return showToast("Not connected", "danger");

    const t = title.trim();
    const desc = description.trim();
    const g = goal.trim();
    const h = hours.trim();

    if (!t || !desc || !g || !h) return showToast("Fill in all fields", "danger");
    if (!/^\d+(\.\d+)?$/.test(g) || Number(g) <= 0)
      return showToast("Enter a valid goal amount", "danger");
    if (!/^\d+$/.test(h) || Number(h) <= 0)
      return showToast("Enter a valid duration (hours)", "danger");

    try {
      createTx.startSigning();

      const provider = await getProviderOrThrow();
      const signer = await provider.getSigner(address);
      const c = new ethers.Contract(decentDonationCA, decentDonationABI, signer);

      const goalWei = ethers.parseEther(g);
      const durationSeconds = Math.floor(Number(h) * 3600);

      createTx.startPending(null);
      const tx = await c.createDonation(t, desc, goalWei, durationSeconds);
      createTx.startPending(tx?.hash ?? null);
      await tx.wait();

      showToast("Donation created", "success");
      createTx.succeed();

      resetCreate();
      setCreateOpen(false);
      await fetchMyDonations();
    } catch (e) {
      const msg = shortErr(e);
      console.error(e);
      showToast(msg, "danger");
      createTx.fail(msg);
    }
  }

  function ActionRow({ fullWidthMobile = false }: { fullWidthMobile?: boolean }) {
    return (
      <div
        className={[
          "flex items-center gap-2",
          fullWidthMobile ? "w-full" : "",
        ].join(" ")}
      >
        <Button
          variant="secondary"
          onClick={() => {
            setCreateOpen(true);
            setErrorMsg(null);
          }}
          disabled={!isConnected || isLoading}
          className={fullWidthMobile ? "flex-1 justify-center gap-2" : "gap-2"}
        >
          <FiPlus className="h-4 w-4" />
          Create
        </Button>

        <button
          onClick={() => {
            setDonationIds([]);
            setDonations([]);
            setErrorMsg(null);
            showToast("Cleared view", "neutral");
          }}
          disabled={isLoading}
          className={[
            "inline-flex items-center gap-2",
            "h-11 px-3 rounded-2xl",
            "border border-border bg-background",
            "text-sm font-semibold",
            "hover:border-foreground/15 hover:bg-card transition",
            "disabled:opacity-50 disabled:pointer-events-none",
            fullWidthMobile ? "flex-1 justify-center" : "",
          ].join(" ")}
        >
          <FiTrash2 className="h-4 w-4" />
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="pt-10 sm:pt-14 pb-16">
      <Container>
        <AppCard
          title="Decent Giver"
          subtitle="Create donation campaigns and manage withdrawals securely."
          // ✅ Desktop-only header actions so title/subtitle breathe on mobile
          right={
            <div className="hidden sm:flex">
              <ActionRow />
            </div>
          }
        >
          {!isConnected ? (
            <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted">
              Not connected. Use the connect button in the header to continue.
            </div>
          ) : (
            <>
              {/* ✅ Mobile action row placed UNDER header for breathing space */}
              <div className="sm:hidden mt-4">
                <ActionRow fullWidthMobile />
              </div>

              {/* ✅ Contract + Refresh: stacked on mobile, aligned on desktop */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <Button
                  variant="ghost"
                  onClick={fetchMyDonations}
                  disabled={isLoading || createTx.isBusy}
                  className="gap-2 w-full sm:w-auto justify-center sm:justify-start"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner />
                      Refreshing…
                    </>
                  ) : (
                    <>
                      {/* ✅ Refresh icon (not external link) */}
                      <FiRefreshCw className="h-4 w-4" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>

              {errorMsg ? (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
                  <FiAlertTriangle className="h-5 w-5 mt-0.5" />
                  <div>{errorMsg}</div>
                </div>
              ) : null}

              {/* ACTIVE */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Active</div>
                  <Pill tone={active.length ? "success" : "neutral"}>
                    {active.length}
                  </Pill>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 lg:hidden">
                  {active.length === 0 && !isLoading ? (
                    <div className="rounded-2xl border border-border bg-background p-5 text-sm text-muted">
                      No active donations yet.
                    </div>
                  ) : (
                    active.map((id) => {
                      const i = donationIds.indexOf(id);
                      const d = donations[i];
                      if (!d) return null;

                      const prog = pct(d.totalRaised, d.goalAmount);
                      const goalN = Number(ethers.formatEther(d.goalAmount));
                      const raisedN = Number(ethers.formatEther(d.totalRaised));
                      const st = statusLabel(d);

                      return (
                        <div
                          key={id}
                          className="rounded-3xl border border-border bg-background p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">{d.title}</div>
                              <div className="mt-1 text-xs text-muted line-clamp-2">
                                {d.description}
                              </div>
                            </div>
                            <Pill tone={st.tone}>{st.text}</Pill>
                          </div>

                          <ProgressBar value={prog} />
                          <div className="mt-2 flex items-center justify-between text-xs text-muted">
                            <span>{prog.toFixed(2)}%</span>
                            <span>
                              {formatCompact(raisedN)} / {formatCompact(goalN)} ETN
                            </span>
                          </div>

                          <div className="mt-4">
                            <Button onClick={() => openDonation(id)} className="w-full">
                              View
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="hidden lg:block overflow-x-auto rounded-3xl border border-border bg-background mt-3">
                  {active.length === 0 && !isLoading ? (
                    <div className="p-6 text-sm text-muted">No active donations yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted">
                        <tr className="border-b border-border">
                          <th className="text-left font-semibold px-5 py-4">Title</th>
                          <th className="text-left font-semibold px-5 py-4">Goal</th>
                          <th className="text-left font-semibold px-5 py-4">Raised</th>
                          <th className="text-left font-semibold px-5 py-4">Progress</th>
                          <th className="text-right font-semibold px-5 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.map((id) => {
                          const i = donationIds.indexOf(id);
                          const d = donations[i];
                          if (!d) return null;

                          const goalN = Number(ethers.formatEther(d.goalAmount));
                          const raisedN = Number(ethers.formatEther(d.totalRaised));
                          const prog = pct(d.totalRaised, d.goalAmount);

                          return (
                            <tr
                              key={id}
                              className="border-b border-border/70 last:border-b-0"
                            >
                              <td className="px-5 py-4">
                                <div className="font-semibold">{d.title}</div>
                                <div className="text-xs text-muted line-clamp-1">
                                  {d.description}
                                </div>
                              </td>
                              <td className="px-5 py-4 font-semibold tabular-nums">
                                {formatCompact(goalN)} ETN
                              </td>
                              <td className="px-5 py-4 font-semibold tabular-nums">
                                {formatCompact(raisedN)} ETN
                              </td>
                              <td className="px-5 py-4">
                                <div className="min-w-55">
                                  <ProgressBar value={prog} />
                                  <div className="mt-1 text-xs text-muted">
                                    {prog.toFixed(2)}%
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <Button
                                  variant="secondary"
                                  onClick={() => openDonation(id)}
                                >
                                  View
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* PAST */}
              <div className="mt-10">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Past</div>
                  <Pill tone="neutral">{past.length}</Pill>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 lg:hidden">
                  {past.length === 0 && !isLoading ? (
                    <div className="rounded-2xl border border-border bg-background p-5 text-sm text-muted">
                      No past donations yet.
                    </div>
                  ) : (
                    past.map((id) => {
                      const i = donationIds.indexOf(id);
                      const d = donations[i];
                      if (!d) return null;

                      const prog = pct(d.totalRaised, d.goalAmount);
                      const goalN = Number(ethers.formatEther(d.goalAmount));
                      const raisedN = Number(ethers.formatEther(d.totalRaised));
                      const st = statusLabel(d);

                      return (
                        <div
                          key={id}
                          className="rounded-3xl border border-border bg-background p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">{d.title}</div>
                              <div className="mt-1 text-xs text-muted line-clamp-2">
                                {d.description}
                              </div>
                            </div>
                            <Pill tone={st.tone}>{st.text}</Pill>
                          </div>

                          <ProgressBar value={prog} />
                          <div className="mt-2 flex items-center justify-between text-xs text-muted">
                            <span>{prog.toFixed(2)}%</span>
                            <span>
                              {formatCompact(raisedN)} / {formatCompact(goalN)} ETN
                            </span>
                          </div>

                          <div className="mt-4">
                            <Button
                              onClick={() => openDonation(id)}
                              className="w-full"
                              variant="secondary"
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="hidden lg:block overflow-x-auto rounded-3xl border border-border bg-background mt-3">
                  {past.length === 0 && !isLoading ? (
                    <div className="p-6 text-sm text-muted">No past donations yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted">
                        <tr className="border-b border-border">
                          <th className="text-left font-semibold px-5 py-4">Title</th>
                          <th className="text-left font-semibold px-5 py-4">Goal</th>
                          <th className="text-left font-semibold px-5 py-4">Raised</th>
                          <th className="text-left font-semibold px-5 py-4">Progress</th>
                          <th className="text-right font-semibold px-5 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {past.map((id) => {
                          const i = donationIds.indexOf(id);
                          const d = donations[i];
                          if (!d) return null;

                          const goalN = Number(ethers.formatEther(d.goalAmount));
                          const raisedN = Number(ethers.formatEther(d.totalRaised));
                          const prog = pct(d.totalRaised, d.goalAmount);

                          return (
                            <tr
                              key={id}
                              className="border-b border-border/70 last:border-b-0"
                            >
                              <td className="px-5 py-4">
                                <div className="font-semibold">{d.title}</div>
                                <div className="text-xs text-muted line-clamp-1">
                                  {d.description}
                                </div>
                              </td>
                              <td className="px-5 py-4 font-semibold tabular-nums">
                                {formatCompact(goalN)} ETN
                              </td>
                              <td className="px-5 py-4 font-semibold tabular-nums">
                                {formatCompact(raisedN)} ETN
                              </td>
                              <td className="px-5 py-4">
                                <div className="min-w-55">
                                  <ProgressBar value={prog} />
                                  <div className="mt-1 text-xs text-muted">
                                    {prog.toFixed(2)}%
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <Button
                                  variant="secondary"
                                  onClick={() => openDonation(id)}
                                >
                                  View
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </AppCard>

        {/* CREATE MODAL */}
        {createOpen ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-6 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">Create donation</div>
                  <div className="mt-1 text-sm text-muted">
                    Your campaign will be public via its link. Withdraw is only for the creator after expiry.
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCreateOpen(false);
                    resetCreate();
                    createTx.reset();
                  }}
                  className="text-sm font-semibold text-muted hover:text-foreground transition"
                  disabled={createTx.isBusy}
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <AppField label="Title">
                  <AppInput
                    value={title}
                    onChange={(e) => setTitle(clampText(e.target.value))}
                    placeholder="e.g. Help fund a community project"
                    disabled={createTx.isBusy}
                    maxLength={80}
                  />
                </AppField>

                <div>
                  <div className="text-sm font-semibold">Description</div>
                  <div className="mt-2">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this campaign about?"
                      disabled={createTx.isBusy}
                      maxLength={280}
                      className="
                        w-full min-h-27.5 resize-none
                        rounded-2xl border border-border bg-background
                        px-4 py-3 text-sm outline-none
                        focus:border-foreground/20
                      "
                    />
                    <div className="mt-1 text-xs text-muted">{description.length}/280</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AppField label="Goal (ETN)" hint="Numbers only">
                    <AppInput
                      value={goal}
                      onChange={(e) => {
                        const next = clampDecimal(e.target.value);
                        if (next === null) return;
                        setGoal(next);
                      }}
                      placeholder="e.g. 250"
                      inputMode="decimal"
                      disabled={createTx.isBusy}
                    />
                  </AppField>

                  <AppField label="Duration (hours)" hint="Numbers only">
                    <AppInput
                      value={hours}
                      onChange={(e) => {
                        const next = clampInt(e.target.value);
                        if (next === null) return;
                        setHours(next);
                      }}
                      placeholder="e.g. 72"
                      inputMode="numeric"
                      disabled={createTx.isBusy}
                    />
                  </AppField>
                </div>

                {createTx.stage === "pending" || createTx.stage === "signing" ? (
                  <div className="rounded-2xl border border-border bg-card p-3 text-sm text-muted">
                    <div className="flex items-center gap-2">
                      <LoadingSpinner />
                      <span>{createTx.label}</span>
                    </div>

                    {createTx.txHash ? (
                      <a
                        className="mt-2 inline-flex items-center gap-2 text-xs font-semibold underline"
                        href={`${EXPLORER_TX}${createTx.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View tx on explorer
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {createTx.error ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
                    {createTx.error}
                  </div>
                ) : null}

                <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCreateOpen(false);
                      resetCreate();
                      createTx.reset();
                    }}
                    disabled={createTx.isBusy}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={createDonation}
                    disabled={createTx.isBusy || !isConnected}
                    className={createTx.isBusy ? "btn-shimmer" : ""}
                  >
                    {createTx.isBusy ? (
                      <>
                        <LoadingSpinner />
                        {createTx.label}
                      </>
                    ) : (
                      createTx.label
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <AppToast {...toastProps} />
      </Container>
    </div>
  );
}
