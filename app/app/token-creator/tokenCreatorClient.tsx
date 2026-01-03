// app/app/token-creator/tokenCreatorClient.tsx
"use client";

import * as React from "react";
import { ethers } from "ethers";
import { FiCheck, FiCopy, FiExternalLink, FiRefreshCcw } from "react-icons/fi";

import { Container } from "@/src/ui/Container";
import { Button } from "@/src/ui/Button";
import { LoadingSpinner } from "@/src/ui/LoadingSpinner";

import { AppField, AppInput } from "@/src/ui/app/AppForm";
import { AppModal, AppToast } from "@/src/ui/app/AppFeedback";
import { AppCard } from "@/src/ui/app/AppCard";

import { useAppToast } from "@/src/ui/app/useAppToast";
import { useTxState } from "@/src/ui/app/useTxState";
import { useAppConnection } from "@/src/lib/useAppConnection";

import {
  decentTokenCreatorABI,
  decentTokenCreatorByteCode,
} from "@/src/lib/requisites";

const EXPLORER_BASE = "https://blockexplorer.electroneum.com/address/";

function normalizeSymbol(s: string) {
  return s.replace(/\s+/g, "").toUpperCase().slice(0, 11);
}

// numbers only (no commas, letters, +, -, e)
function normalizeSupply(raw: string) {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (cleaned.length > 1 && cleaned.startsWith("0")) {
    return cleaned.replace(/^0+/, "") || "0";
  }
  return cleaned;
}

async function safeCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Legacy fallback
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

export default function TokenCreatorClient() {
  const { address, isConnected } = useAppConnection();
  const { toastProps, showToast } = useAppToast();
const tx = useTxState({
  idle: "Deploy token",
  pending: "Deploying…",
  signing: "Confirm in wallet…",
});


  const [name, setName] = React.useState("");
  const [symbol, setSymbol] = React.useState("");
  const [supply, setSupply] = React.useState("");
  const [tokenAddress, setTokenAddress] = React.useState("");

  const errors = React.useMemo(() => {
    const e: string[] = [];
    if (!name.trim()) e.push("Enter a token name");
    if (!symbol.trim()) e.push("Enter a symbol");
    if (!supply || Number(supply) <= 0) e.push("Enter a valid supply");
    return e;
  }, [name, symbol, supply]);

  const canSubmit = !tx.isBusy && errors.length === 0;

  async function deploy() {
    // Safety net (AppGate should prevent this path)
    if (!isConnected || !address) {
      showToast("Not connected. Use Connect in the header.", "danger");
      return;
    }
    if (errors.length) {
      showToast(errors[0], "danger");
      return;
    }

    tx.startSigning();
    setTokenAddress("");

    try {
      if (!window.ethereum) {
        tx.fail("Wallet provider not found");
        showToast("Wallet provider not found", "danger");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(address);

      const factory = new ethers.ContractFactory(
        decentTokenCreatorABI,
        decentTokenCreatorByteCode,
        signer
      );

      const sym = normalizeSymbol(symbol);

      const contract = await factory.deploy(
        name.trim(),
        sym,
        ethers.parseUnits(supply.toString(), 18),
        address
      );

      const txObj = contract.deploymentTransaction();
      tx.startPending(txObj?.hash ?? null);

      // ✅ Wait until deployed (cleaner + more correct)
      await contract.waitForDeployment();

      const ca = await contract.getAddress();
      setTokenAddress(ca);

      tx.succeed();
      showToast("Token deployed", "success");
    } catch (e) {
      console.error(e);
      tx.fail("Deploy failed");
      showToast("Deploy failed. Try again.", "danger");
    }
  }

  function reset() {
    setName("");
    setSymbol("");
    setSupply("");
    setTokenAddress("");
    tx.reset();
    showToast("Reset", "neutral");
  }

  return (
    <div className="pt-10 sm:pt-14 pb-16">
      <Container>
        <AppCard title="Token Creator" subtitle="Deploy an ETN-SC token.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppField label="Name" hint="e.g. Decent Coin">
              <AppInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Token name"
                disabled={tx.isBusy}
                autoComplete="off"
              />
            </AppField>

            <AppField label="Symbol" hint="max 11 chars">
              <AppInput
                value={symbol}
                onChange={(e) => setSymbol(normalizeSymbol(e.target.value))}
                placeholder="TICKER"
                disabled={tx.isBusy}
                autoComplete="off"
              />
            </AppField>

            <AppField label="Total supply" hint="numbers only">
              <AppInput
                value={supply}
                onChange={(e) => setSupply(normalizeSupply(e.target.value))}
                placeholder="1000000"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={tx.isBusy}
                autoComplete="off"
              />
            </AppField>

            <div className="flex items-end">
              <Button
                onClick={deploy}
                disabled={!canSubmit}
                className={`w-full ${tx.isBusy ? "btn-shimmer" : ""}`}
              >
                {tx.isBusy ? (
                  <>
                    <LoadingSpinner />
                    {tx.label}
                  </>
                ) : (
                  "Deploy token"
                )}
              </Button>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end">
            <button
              onClick={reset}
              className="
                inline-flex items-center gap-2 text-xs font-semibold
                text-muted hover:text-foreground transition
              "
              disabled={tx.isBusy}
            >
              <FiRefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </AppCard>

        <AppModal
          open={!!tokenAddress}
          title="Token deployed"
          icon={<FiCheck className="h-5 w-5" />}
          onClose={() => setTokenAddress("")}
        >
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="text-xs text-muted">Contract address</div>
            <div className="mt-2 break-all text-sm font-semibold">
              {tokenAddress}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={async () => {
                  const ok = await safeCopy(tokenAddress);
                  showToast(ok ? "Copied" : "Copy failed", ok ? "success" : "danger");
                }}
                className="
                  inline-flex items-center justify-center gap-2
                  h-11 rounded-2xl border border-border bg-card px-4
                  text-sm font-semibold
                  hover:border-foreground/15 hover:bg-background transition
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
                "
              >
                <FiCopy className="h-4 w-4" />
                Copy
              </button>

              <a
                href={`${EXPLORER_BASE}${tokenAddress}`}
                target="_blank"
                rel="noreferrer"
                className="
                  inline-flex items-center justify-center gap-2
                  h-11 rounded-2xl border border-border bg-card px-4
                  text-sm font-semibold
                  hover:border-foreground/15 hover:bg-background transition
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
                "
              >
                <FiExternalLink className="h-4 w-4" />
                Explorer
              </a>

              <button
                onClick={() => {
                  setTokenAddress("");
                  tx.reset();
                  showToast("Ready", "neutral");
                }}
                className="
                  inline-flex items-center justify-center
                  h-11 rounded-2xl bg-primary px-4
                  text-sm font-semibold text-background
                  hover:opacity-[0.96] transition
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
                "
              >
                Create another
              </button>
            </div>
          </div>
        </AppModal>

        <AppToast {...toastProps} />
      </Container>
    </div>
  );
}
