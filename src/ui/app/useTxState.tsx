// src/ui/app/useTxState.ts
"use client";

import * as React from "react";

export type TxStage = "idle" | "signing" | "pending" | "success" | "error";

export type TxLabels = {
  idle: string;     // button label when not busy
  signing?: string; // wallet confirmation step
  pending?: string; // tx submitted / waiting
};

const DEFAULT_LABELS: Required<TxLabels> = {
  idle: "Continue",
  signing: "Confirming…",
  pending: "Processing…",
};

export function useTxState(labels?: TxLabels) {
  const L = { ...DEFAULT_LABELS, ...labels };

  const [stage, setStage] = React.useState<TxStage>("idle");
  const [txHash, setTxHash] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const reset = React.useCallback(() => {
    setStage("idle");
    setTxHash(null);
    setError(null);
  }, []);

  const startSigning = React.useCallback(() => {
    setStage("signing");
    setError(null);
    setTxHash(null);
  }, []);

  const startPending = React.useCallback((hash?: string | null) => {
    setStage("pending");
    setError(null);
    setTxHash(hash ?? null);
  }, []);

  const succeed = React.useCallback(() => {
    setStage("success");
    setError(null);
  }, []);

  const fail = React.useCallback((message: string) => {
    setStage("error");
    setError(message);
  }, []);

  const isBusy = stage === "signing" || stage === "pending";

  const label =
    stage === "signing" ? L.signing : stage === "pending" ? L.pending : L.idle;

  return {
    stage,
    isBusy,
    label,
    labels: L,
    txHash,
    error,
    reset,
    startSigning,
    startPending,
    succeed,
    fail,
  };
}
