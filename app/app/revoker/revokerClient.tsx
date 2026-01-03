/* eslint-disable @typescript-eslint/no-explicit-any */
// app/app/revoker/revokerClient.tsx
"use client";

import * as React from "react";
import { ethers } from "ethers";
import {
  FiCopy,
  FiExternalLink,
  FiTrash2,
  FiShield,
  FiAlertTriangle,
} from "react-icons/fi";

import { Container } from "@/src/ui/Container";
import { Button } from "@/src/ui/Button";

import { AppCard } from "@/src/ui/app/AppCard";
import { AppToast } from "@/src/ui/app/AppFeedback";
import { useAppToast } from "@/src/ui/app/useAppToast";
import { useTxState } from "@/src/ui/app/useTxState";
import { useAppConnection } from "@/src/lib/useAppConnection";
import { LoadingSpinner } from "@/src/ui/LoadingSpinner";

/**
 * Revoker (revamp)
 * - Adaptive getLogs window (RPC-thrifty)
 * - Scan last 7 days, optionally extend backward by another 7-day slice
 * - Confirms current state (allowance / getApproved / isApprovedForAll)
 * - Local cache per chain+address
 *
 * UI:
 * - Mobile: cards
 * - Desktop: table
 * - No WalletPill duplication (connection lives in header)
 */

/* -----------------------------
 * CONFIG
 * ----------------------------- */
const DAYS_PER_SCAN = 7;
const INITIAL_WINDOW = 5000;
const MIN_WINDOW = 256;
const LOOKBACK_SAFE_K = 1000;
const MAX_RETRIES_PER_WINDOW = 3;

const EXPLORER_BASE = "https://blockexplorer.electroneum.com/address/";

/* -----------------------------
 * ABIs (minimal)
 * ----------------------------- */
const ERC20_ABI = [
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
] as const;

const ERC721_ABI = [
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function approve(address to, uint256 tokenId)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
  "function symbol() view returns (string)",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
] as const;

const ERC1155_ABI = [
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
] as const;

const IFACE_ERC721 = "0x80ac58cd";
const IFACE_ERC1155 = "0xd9b67a26";

const MAX_UINT256 = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);

/* -----------------------------
 * Models
 * ----------------------------- */
type AllowanceLabel =
  | { kind: "unlimited"; text: string }
  | { kind: "finite"; text: string };

type Standard = "ERC721" | "ERC1155" | "Unknown";

interface ERC20Approval {
  token: string;
  symbol: string;
  decimals: number | null;
  spender: string;
  allowance: AllowanceLabel;
}

interface ERC721TokenApproval {
  contract: string;
  symbol: string;
  tokenId: string;
  approved: string;
}

interface OperatorApproval {
  contract: string;
  standard: Standard;
  operator: string;
  approved: boolean;
}

interface CacheShape {
  v: 1;
  lastScanAt: number;
  latestHeadAtScan: number;
  earliestScannedBlock: number;
  latestScannedBlock: number;
  windowHint: number;
  erc20: ERC20Approval[];
  erc721Tokens: ERC721TokenApproval[];
  operators: OperatorApproval[];
}

/* -----------------------------
 * Helpers
 * ----------------------------- */
function shorten(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function key(chainId: string, address: string) {
  return `revoker:v1:${chainId}:${address}`;
}

function readCache(chainId: string, address: string): CacheShape | null {
  try {
    const raw = localStorage.getItem(key(chainId, address));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    return parsed?.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(chainId: string, address: string, value: CacheShape) {
  try {
    localStorage.setItem(key(chainId, address), JSON.stringify(value));
  } catch {
    // ignore
  }
}

function formatAllowance(v: bigint, decimals: number | null): AllowanceLabel {
  if (v === MAX_UINT256) {
    return { kind: "unlimited", text: "Unlimited" };
  }
  if (decimals === null) return { kind: "finite", text: v.toString() };

  const formatted = ethers.formatUnits(v, decimals);
  const num = Number(formatted);
  const text = Number.isFinite(num)
    ? num.toLocaleString(undefined, { maximumFractionDigits: 6 })
    : formatted;

  return { kind: "finite", text };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

async function estimateAvgBlockTime(
  provider: ethers.BrowserProvider,
  head: number
) {
  const older = Math.max(0, head - LOOKBACK_SAFE_K);
  const [bHead, bOld] = await Promise.all([
    provider.getBlock(head),
    provider.getBlock(older),
  ]);
  if (!bHead || !bOld) return 2;
  const dt = Number(bHead.timestamp) - Number(bOld.timestamp);
  const avg = dt / Math.max(1, head - older);
  return Math.max(1, avg);
}

async function getLogsAdaptive(
  provider: ethers.BrowserProvider,
  paramsBase: Omit<ethers.Filter, "fromBlock" | "toBlock">,
  fromBlock: number,
  toBlock: number,
  windowHint: number,
  onProgress: (pct: number, label: string) => void,
  signal?: AbortSignal
): Promise<{ logs: ethers.Log[]; lastWindowHint: number }> {
  const logs: ethers.Log[] = [];
  let windowSize = Math.max(MIN_WINDOW, windowHint || INITIAL_WINDOW);

  const totalBlocks = toBlock - fromBlock + 1;
  let doneBlocks = 0;

  for (let start = fromBlock; start <= toBlock; start += windowSize) {
    if (signal?.aborted) throw new Error("aborted");
    let end = Math.min(start + windowSize - 1, toBlock);

    let attempt = 0;
    while (true) {
      try {
        const chunk = await provider.getLogs({
          ...paramsBase,
          fromBlock: start,
          toBlock: end,
        });
        logs.push(...chunk);

        doneBlocks += end - start + 1;
        const pct = Math.floor((doneBlocks / totalBlocks) * 100);
        onProgress(pct, `Blocks ${start.toLocaleString()}–${end.toLocaleString()}`);
        break;
      } catch (e: any) {
        const msg = (e?.message || "").toLowerCase();
        const code = e?.code;

        if (
          msg.includes("range too large") ||
          msg.includes("block range is too large") ||
          code === -32062
        ) {
          if (windowSize <= MIN_WINDOW) {
            doneBlocks += end - start + 1;
            const pct = Math.floor((doneBlocks / totalBlocks) * 100);
            onProgress(pct, `Skipped ${start.toLocaleString()}–${end.toLocaleString()}`);
            break;
          }
          windowSize = Math.max(MIN_WINDOW, Math.floor(windowSize / 2));
          end = Math.min(start + windowSize - 1, toBlock);
          continue;
        }

        if (attempt < MAX_RETRIES_PER_WINDOW) {
          attempt++;
          await sleep(250 * attempt + Math.floor(Math.random() * 150));
          continue;
        }

        doneBlocks += end - start + 1;
        const pct = Math.floor((doneBlocks / totalBlocks) * 100);
        onProgress(pct, `Failed ${start.toLocaleString()}–${end.toLocaleString()}`);
        break;
      }
    }
  }

  return { logs, lastWindowHint: windowSize };
}

/* -----------------------------
 * UI bits
 * ----------------------------- */
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

function RowActions({
  onCopy,
  explorerHref,
}: {
  onCopy: () => void;
  explorerHref: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onCopy}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 h-9 text-xs font-semibold hover:border-foreground/15 hover:bg-background transition"
      >
        <FiCopy className="h-4 w-4" />
        Copy
      </button>
      <a
        href={explorerHref}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 h-9 text-xs font-semibold hover:border-foreground/15 hover:bg-background transition"
      >
        <FiExternalLink className="h-4 w-4" />
        Explorer
      </a>
    </div>
  );
}

/* -----------------------------
 * Component
 * ----------------------------- */
type TabId = "erc20" | "erc721" | "operators";

export default function RevokerClient() {
  const { address, isConnected } = useAppConnection();
  const { toastProps, showToast } = useAppToast();

  const scanTx = useTxState({
    idle: "Scan",
    signing: "Preparing…",
    pending: "Scanning…",
  });

  const [chainId, setChainId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<TabId>("erc20");

  const [erc20, setErc20] = React.useState<ERC20Approval[]>([]);
  const [erc721Tokens, setErc721Tokens] = React.useState<ERC721TokenApproval[]>(
    []
  );
  const [operators, setOperators] = React.useState<OperatorApproval[]>([]);

  const [progress, setProgress] = React.useState<{ pct: number; phase: string } | null>(
    null
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [revokingKey, setRevokingKey] = React.useState<string | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);

  const unlimitedCount = React.useMemo(
    () => erc20.filter((x) => x.allowance.kind === "unlimited").length,
    [erc20]
  );

  // Discover chainId + hydrate cache
  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!window.ethereum || !address) return;

        const provider = new ethers.BrowserProvider(window.ethereum);
        const net = await provider.getNetwork();
        const cid = net.chainId.toString();

        if (!alive) return;

        setChainId(cid);

        const cached = readCache(cid, address);
        if (cached) {
          setErc20(cached.erc20 || []);
          setErc721Tokens(cached.erc721Tokens || []);
          setOperators(cached.operators || []);
        } else {
          setErc20([]);
          setErc721Tokens([]);
          setOperators([]);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, [address]);

  const cacheInfo = React.useMemo(() => {
    if (!chainId || !address) return null;
    const c = readCache(chainId, address);
    if (!c) return null;
    return {
      earliest: c.earliestScannedBlock,
      latest: c.latestScannedBlock,
      when: new Date(c.lastScanAt).toLocaleString(),
    };
  }, [chainId, address]);

  function clearCache() {
    if (chainId && address) {
      try {
        localStorage.removeItem(key(chainId, address));
      } catch {}
    }
    setErc20([]);
    setErc721Tokens([]);
    setOperators([]);
    showToast("Local cache cleared", "neutral");
  }

  async function runScan(extendBackward: boolean) {
    if (!isConnected || !address) {
      showToast("Not connected. Use Connect in the header.", "danger");
      return;
    }
    if (!window.ethereum) {
      showToast("Wallet provider not found", "danger");
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    scanTx.startSigning();
    setErrorMsg(null);
    setProgress({ pct: 1, phase: "Preparing…" });

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const net = await provider.getNetwork();
      const cid = net.chainId.toString();
      setChainId(cid);

      const head = await provider.getBlockNumber();
      const avgBlockTime = await estimateAvgBlockTime(provider, Number(head));

      const blocksBack = Math.ceil((DAYS_PER_SCAN * 24 * 3600) / avgBlockTime);
      const blocksPerScan = Math.max(1, blocksBack);

      const cached = readCache(cid, address);
      const windowHint = cached?.windowHint || INITIAL_WINDOW;

      let startBlock: number;
      let endBlock: number;

      if (extendBackward && cached?.earliestScannedBlock) {
        endBlock = Math.max(1, cached.earliestScannedBlock - 1);
        startBlock = Math.max(1, endBlock - blocksPerScan + 1);
      } else {
        endBlock = Number(head);
        startBlock = Math.max(1, endBlock - blocksPerScan + 1);
        if (cached?.latestScannedBlock && cached.latestScannedBlock < endBlock) {
          startBlock = Math.max(startBlock, cached.latestScannedBlock + 1);
        }
      }

      scanTx.startPending(null);

      // Phase A: Approval logs (ERC-20 + ERC-721 token approvals)
      const approvalTopic = ethers.id("Approval(address,address,uint256)");
      const ownerTopic = ethers.zeroPadValue(address, 32);

      setProgress({ pct: 3, phase: "Scanning approvals…" });

      const { logs: approvalLogs, lastWindowHint } = await getLogsAdaptive(
        provider,
        { topics: [approvalTopic, ownerTopic] },
        startBlock,
        endBlock,
        windowHint,
        (pct, label) =>
          setProgress({
            pct: Math.min(60, Math.floor((pct * 60) / 100)),
            phase: `Approvals • ${label}`,
          }),
        signal
      );

      const erc20Pairs = new Map<string, Set<string>>(); // token -> spenders
      const erc721TokenIds = new Map<string, Set<string>>(); // contract -> tokenIds

      for (const log of approvalLogs) {
        if (signal.aborted) throw new Error("aborted");
        const contract = log.address;
        const t = log.topics;
        if (!t || t.length < 3) continue;

        // ERC-721 Approval has 4 topics (tokenId indexed)
        if (t.length >= 4) {
          const tokenId = BigInt(t[3]).toString(10);
          const set = erc721TokenIds.get(contract) ?? new Set<string>();
          set.add(tokenId);
          erc721TokenIds.set(contract, set);
        } else {
          // ERC-20 Approval (owner, spender indexed)
          const spender = ethers.getAddress("0x" + t[2].slice(26));
          const set = erc20Pairs.get(contract) ?? new Set<string>();
          set.add(spender);
          erc20Pairs.set(contract, set);
        }
      }

      // Phase B: ApprovalForAll (operators)
      const approvalForAllTopic = ethers.id("ApprovalForAll(address,address,bool)");
      setProgress({ pct: 62, phase: "Scanning operators…" });

      const { logs: operatorLogs } = await getLogsAdaptive(
        provider,
        { topics: [approvalForAllTopic, ownerTopic] },
        startBlock,
        endBlock,
        lastWindowHint,
        (pct, label) =>
          setProgress({
            pct: 60 + Math.min(20, Math.floor((pct * 20) / 100)),
            phase: `Operators • ${label}`,
          }),
        signal
      );

      const operatorPairs = new Map<string, Set<string>>(); // contract -> operators
      for (const log of operatorLogs) {
        if (signal.aborted) throw new Error("aborted");
        const contract = log.address;
        const t = log.topics;
        if (!t || t.length < 3) continue;
        const operator = ethers.getAddress("0x" + t[2].slice(26));
        const set = operatorPairs.get(contract) ?? new Set<string>();
        set.add(operator);
        operatorPairs.set(contract, set);
      }

      // Phase C: Confirm state
      setProgress({ pct: 82, phase: "Confirming current state…" });

      const nextErc20: ERC20Approval[] = [];
      const nextErc721: ERC721TokenApproval[] = [];
      const nextOps: OperatorApproval[] = [];

      const totalChecks =
        Array.from(erc20Pairs.values()).reduce((a, s) => a + s.size, 0) +
        Array.from(erc721TokenIds.values()).reduce((a, s) => a + s.size, 0) +
        Array.from(operatorPairs.values()).reduce((a, s) => a + s.size, 0);

      let done = 0;
      const bump = () => {
        done++;
        const pct =
          80 + Math.min(20, Math.floor((done / Math.max(1, totalChecks)) * 20));
        setProgress({ pct, phase: "Confirming current state…" });
      };

      // ERC-20 checks
      for (const [token, spenders] of erc20Pairs.entries()) {
        const c = new ethers.Contract(token, ERC20_ABI, provider);

        let symbol = "TOKEN";
        let decimals: number | null = null;
        try {
          symbol = await c.symbol();
        } catch {}
        try {
          decimals = await c.decimals();
        } catch {}

        for (const spender of spenders) {
          if (signal.aborted) throw new Error("aborted");
          try {
            const v: bigint = await c.allowance(address, spender);
            if (v > BigInt(0)) {
              nextErc20.push({
                token,
                symbol,
                decimals,
                spender,
                allowance: formatAllowance(v, decimals),
              });
            }
          } catch {
            // skip non-erc20/broken contracts
          }
          bump();
        }
      }

      // ERC-721 per-token approvals
      for (const [contractAddr, tokenIds] of erc721TokenIds.entries()) {
        const c721 = new ethers.Contract(contractAddr, ERC721_ABI, provider);

        let symbol = "NFT";
        try {
          symbol = await c721.symbol();
        } catch {}

        for (const tokenId of tokenIds) {
          if (signal.aborted) throw new Error("aborted");
          try {
            const approved: string = await c721.getApproved(tokenId);
            const normalized = ethers.getAddress(approved);
            if (normalized !== ethers.ZeroAddress) {
              nextErc721.push({
                contract: contractAddr,
                symbol,
                tokenId,
                approved: normalized,
              });
            }
          } catch {
            // skip
          }
          bump();
        }
      }

      // Operators
      for (const [contractAddr, ops] of operatorPairs.entries()) {
        const c721 = new ethers.Contract(contractAddr, ERC721_ABI, provider);
        const c1155 = new ethers.Contract(contractAddr, ERC1155_ABI, provider);

        let standard: Standard = "Unknown";
        try {
          const s721: boolean = await c721.supportsInterface(IFACE_ERC721);
          if (s721) standard = "ERC721";
        } catch {}
        if (standard === "Unknown") {
          try {
            const s1155: boolean = await c1155.supportsInterface(IFACE_ERC1155);
            if (s1155) standard = "ERC1155";
          } catch {}
        }

        for (const operator of ops) {
          if (signal.aborted) throw new Error("aborted");
          try {
            const approved: boolean = await c721
              .isApprovedForAll(address, operator)
              .catch(async () => await c1155.isApprovedForAll(address, operator));

            if (approved) {
              nextOps.push({
                contract: contractAddr,
                standard,
                operator,
                approved: true,
              });
            }
          } catch {
            // skip
          }
          bump();
        }
      }

      // Merge with cache (so delta scans extend)
      const mergeUnique = <T, K>(prev: T[], next: T[], keyFn: (x: T) => K): T[] => {
        const map = new Map<K, T>();
        for (const item of prev) map.set(keyFn(item), item);
        for (const item of next) map.set(keyFn(item), item);
        return Array.from(map.values());
      };

      let earliest = startBlock;
      let latest = endBlock;

      let finalErc20 = nextErc20;
      let finalErc721 = nextErc721;
      let finalOps = nextOps;

      if (cached) {
        earliest = Math.min(cached.earliestScannedBlock, startBlock);
        latest = Math.max(cached.latestScannedBlock, endBlock);

        finalErc20 = mergeUnique(
          cached.erc20,
          nextErc20,
          (a) => `${(a as any).token}:${(a as any).spender}`
        );
        finalErc721 = mergeUnique(
          cached.erc721Tokens,
          nextErc721,
          (a) => `${(a as any).contract}:${(a as any).tokenId}`
        );
        finalOps = mergeUnique(
          cached.operators,
          nextOps,
          (a) => `${(a as any).contract}:${(a as any).operator}`
        );
      }

      setErc20(finalErc20);
      setErc721Tokens(finalErc721);
      setOperators(finalOps);

      writeCache(cid, address, {
        v: 1,
        lastScanAt: Date.now(),
        latestHeadAtScan: Number(head),
        earliestScannedBlock: earliest,
        latestScannedBlock: latest,
        windowHint: lastWindowHint,
        erc20: finalErc20,
        erc721Tokens: finalErc721,
        operators: finalOps,
      });

      setProgress({ pct: 100, phase: "Done" });
      showToast(extendBackward ? "Scanned previous window" : "Scan complete", "success");
      scanTx.succeed();
    } catch (e: any) {
      if (e?.message === "aborted") {
        setErrorMsg("Scan cancelled.");
        showToast("Scan cancelled", "neutral");
      } else {
        setErrorMsg(e?.message || "Scan failed");
        showToast("Scan failed", "danger");
      }
      scanTx.fail("Scan failed");
    } finally {
      window.setTimeout(() => setProgress(null), 600);
      if (!scanTx.isBusy) scanTx.reset();
    }
  }

  // Revoke actions (tx per row)
  async function revokeERC20(entry: ERC20Approval) {
    if (!isConnected || !address || !window.ethereum) {
      showToast("Not connected", "danger");
      return;
    }

    const k = `erc20:${entry.token}:${entry.spender}`;
    setRevokingKey(k);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(address);
      const c = new ethers.Contract(entry.token, ERC20_ABI, signer);

      const tx = await c.approve(entry.spender, 0);
      await tx.wait();

      const updated = erc20
        .map((a) =>
          a.token === entry.token && a.spender === entry.spender
            ? { ...a, allowance: { kind: "finite", text: "0" } as AllowanceLabel }
            : a
        )
        .filter((a) => !(a.token === entry.token && a.spender === entry.spender));

      setErc20(updated);

      if (chainId && address) {
        const cached = readCache(chainId, address);
        if (cached) {
          cached.erc20 = updated;
          writeCache(chainId, address, cached);
        }
      }

      showToast(`Revoked ${entry.symbol}`, "success");
    } catch (e) {
      console.error(e);
      showToast("Revoke failed", "danger");
    } finally {
      setRevokingKey(null);
    }
  }

  async function revokeERC721Token(entry: ERC721TokenApproval) {
    if (!isConnected || !address || !window.ethereum) {
      showToast("Not connected", "danger");
      return;
    }

    const k = `erc721:${entry.contract}:${entry.tokenId}`;
    setRevokingKey(k);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(address);
      const c = new ethers.Contract(entry.contract, ERC721_ABI, signer);

      const tx = await c.approve(ethers.ZeroAddress, entry.tokenId);
      await tx.wait();

      const updated = erc721Tokens.filter(
        (x) => !(x.contract === entry.contract && x.tokenId === entry.tokenId)
      );
      setErc721Tokens(updated);

      if (chainId && address) {
        const cached = readCache(chainId, address);
        if (cached) {
          cached.erc721Tokens = updated;
          writeCache(chainId, address, cached);
        }
      }

      showToast("Revoked token approval", "success");
    } catch (e) {
      console.error(e);
      showToast("Revoke failed", "danger");
    } finally {
      setRevokingKey(null);
    }
  }

  async function revokeOperator(entry: OperatorApproval) {
    if (!isConnected || !address || !window.ethereum) {
      showToast("Not connected", "danger");
      return;
    }

    const k = `op:${entry.contract}:${entry.operator}`;
    setRevokingKey(k);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(address);

      const c721 = new ethers.Contract(entry.contract, ERC721_ABI, signer);
      const c1155 = new ethers.Contract(entry.contract, ERC1155_ABI, signer);

      try {
        const tx = await c721.setApprovalForAll(entry.operator, false);
        await tx.wait();
      } catch {
        const tx2 = await c1155.setApprovalForAll(entry.operator, false);
        await tx2.wait();
      }

      const updated = operators.filter(
        (x) => !(x.contract === entry.contract && x.operator === entry.operator)
      );
      setOperators(updated);

      if (chainId && address) {
        const cached = readCache(chainId, address);
        if (cached) {
          cached.operators = updated;
          writeCache(chainId, address, cached);
        }
      }

      showToast("Revoked operator", "success");
    } catch (e) {
      console.error(e);
      showToast("Revoke failed", "danger");
    } finally {
      setRevokingKey(null);
    }
  }

  // Gate (no WalletPill duplication)
  if (!isConnected) {
    return (
      <div className="pt-10 sm:pt-14 pb-16">
        <Container>
          <AppCard
            title="Revoker"
            subtitle="Scan and revoke approvals (ERC-20, ERC-721, ERC-1155)."
          >
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4">
              <div className="mt-0.5">
                <FiShield className="h-5 w-5 text-foreground/80" />
              </div>
              <div>
                <div className="text-sm font-semibold">Not connected</div>
                <div className="mt-1 text-sm text-muted">
                  Connect using the button in the top-right header to continue.
                </div>
              </div>
            </div>
          </AppCard>

          <AppToast {...toastProps} />
        </Container>
      </div>
    );
  }

  return (
    <div className="pt-10 sm:pt-14 pb-16">
      <Container>
        <AppCard title="Revoker" subtitle="Approvals found in your recent activity window.">
          {/* Top controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => runScan(false)}
                disabled={scanTx.isBusy}
                className={scanTx.isBusy ? "btn-shimmer" : ""}
              >
                {scanTx.isBusy ? (
                  <>
                    <LoadingSpinner />
                    Scanning…
                  </>
                ) : (
                  "Scan last 7 days"
                )}
              </Button>

              <Button
                variant="secondary"
                onClick={() => runScan(true)}
                disabled={scanTx.isBusy}
              >
                Previous 7 days
              </Button>

              <Button
                variant="ghost"
                onClick={clearCache}
                disabled={scanTx.isBusy}
                className="gap-2"
              >
                <FiTrash2 className="h-4 w-4" />
                Clear cache
              </Button>
            </div>

            <div className="text-xs text-muted">
              {cacheInfo ? (
                <span>
                  Cached: <span className="font-semibold">{cacheInfo.earliest.toLocaleString()}</span> →{" "}
                  <span className="font-semibold">{cacheInfo.latest.toLocaleString()}</span> •{" "}
                  {cacheInfo.when}
                </span>
              ) : (
                <span>No cache yet</span>
              )}
            </div>
          </div>

          {/* Progress */}
          {progress ? (
            <div className="mt-5 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted">{progress.phase}</div>
                <div className="text-sm font-semibold tabular-nums">{progress.pct}%</div>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* Error */}
          {errorMsg ? (
            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
              <FiAlertTriangle className="h-5 w-5 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          ) : null}

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant={tab === "erc20" ? "secondary" : "ghost"}
              onClick={() => setTab("erc20")}
            >
              ERC-20
            </Button>
            <Button
              variant={tab === "erc721" ? "secondary" : "ghost"}
              onClick={() => setTab("erc721")}
            >
              ERC-721
            </Button>
            <Button
              variant={tab === "operators" ? "secondary" : "ghost"}
              onClick={() => setTab("operators")}
            >
              Operators
            </Button>
          </div>

          {/* Summary */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {tab === "erc20" ? (
              <>
                <Pill>{erc20.length} approvals</Pill>
                <Pill tone={unlimitedCount ? "danger" : "success"}>
                  {unlimitedCount} unlimited
                </Pill>
              </>
            ) : tab === "erc721" ? (
              <Pill>{erc721Tokens.length} approvals</Pill>
            ) : (
              <Pill>{operators.length} approvals</Pill>
            )}
          </div>

          {/* Content */}
          <div className="mt-5">
            {tab === "erc20" && (
              <>
                {/* Mobile cards */}
                <div className="grid grid-cols-1 gap-3 lg:hidden">
                  {erc20.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-background p-5 text-sm text-muted">
                      No ERC-20 approvals found in this window.
                    </div>
                  ) : (
                    erc20.map((a) => {
                      const rowKey = `erc20:${a.token}:${a.spender}`;
                      const busy = revokingKey === rowKey;
                      return (
                        <div key={rowKey} className="rounded-3xl border border-border bg-background p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">{a.symbol}</div>
                              <div className="mt-1 text-xs text-muted break-all">
                                Token: {shorten(a.token)}
                              </div>
                            </div>

                            <Pill tone={a.allowance.kind === "unlimited" ? "danger" : "neutral"}>
                              {a.allowance.kind === "unlimited" ? "Unlimited" : "Limited"}
                            </Pill>
                          </div>

                          <div className="mt-4 space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs text-muted">Spender</div>
                              <div className="font-semibold tabular-nums">{shorten(a.spender)}</div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs text-muted">Allowance</div>
                              <div className="font-semibold tabular-nums">{a.allowance.text}</div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-2">
                            <RowActions
                              onCopy={async () => {
                                const ok = await safeCopy(a.spender);
                                showToast(ok ? "Copied" : "Copy failed", ok ? "success" : "danger");
                              }}
                              explorerHref={`${EXPLORER_BASE}${a.spender}`}
                            />

                            <Button
                              onClick={() => revokeERC20(a)}
                              disabled={busy}
                              className={busy ? "btn-shimmer" : ""}
                            >
                              {busy ? (
                                <>
                                  <LoadingSpinner />
                                  Revoking…
                                </>
                              ) : (
                                "Revoke"
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto rounded-3xl border border-border bg-background">
                  {erc20.length === 0 ? (
                    <div className="p-6 text-sm text-muted">
                      No ERC-20 approvals found in this window.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted">
                        <tr className="border-b border-border">
                          <th className="text-left font-semibold px-5 py-4">Token</th>
                          <th className="text-left font-semibold px-5 py-4">Spender</th>
                          <th className="text-left font-semibold px-5 py-4">Allowance</th>
                          <th className="text-right font-semibold px-5 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {erc20.map((a) => {
                          const rowKey = `erc20:${a.token}:${a.spender}`;
                          const busy = revokingKey === rowKey;
                          return (
                            <tr key={rowKey} className="border-b border-border/70 last:border-b-0">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="font-semibold">{a.symbol}</div>
                                  <span className="text-muted">{shorten(a.token)}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-semibold">{shorten(a.spender)}</span>
                              </td>
                              <td className="px-5 py-4">
                                <Pill tone={a.allowance.kind === "unlimited" ? "danger" : "neutral"}>
                                  {a.allowance.text}
                                </Pill>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-3">
                                  <RowActions
                                    onCopy={async () => {
                                      const ok = await safeCopy(a.spender);
                                      showToast(ok ? "Copied" : "Copy failed", ok ? "success" : "danger");
                                    }}
                                    explorerHref={`${EXPLORER_BASE}${a.spender}`}
                                  />
                                  <Button
                                    onClick={() => revokeERC20(a)}
                                    disabled={busy}
                                    className={busy ? "btn-shimmer" : ""}
                                  >
                                    {busy ? (
                                      <>
                                        <LoadingSpinner />
                                        Revoking…
                                      </>
                                    ) : (
                                      "Revoke"
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {tab === "erc721" && (
              <>
                <div className="grid grid-cols-1 gap-3 lg:hidden">
                  {erc721Tokens.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-background p-5 text-sm text-muted">
                      No ERC-721 approvals found in this window.
                    </div>
                  ) : (
                    erc721Tokens.map((nft) => {
                      const rowKey = `erc721:${nft.contract}:${nft.tokenId}`;
                      const busy = revokingKey === rowKey;
                      return (
                        <div key={rowKey} className="rounded-3xl border border-border bg-background p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">{nft.symbol}</div>
                              <div className="mt-1 text-xs text-muted break-all">
                                Collection: {shorten(nft.contract)}
                              </div>
                            </div>
                            <Pill>#{nft.tokenId}</Pill>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                            <div className="text-xs text-muted">Approved</div>
                            <div className="font-semibold">{shorten(nft.approved)}</div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-2">
                            <RowActions
                              onCopy={async () => {
                                const ok = await safeCopy(nft.approved);
                                showToast(ok ? "Copied" : "Copy failed", ok ? "success" : "danger");
                              }}
                              explorerHref={`${EXPLORER_BASE}${nft.approved}`}
                            />
                            <Button
                              onClick={() => revokeERC721Token(nft)}
                              disabled={busy}
                              className={busy ? "btn-shimmer" : ""}
                            >
                              {busy ? (
                                <>
                                  <LoadingSpinner />
                                  Revoking…
                                </>
                              ) : (
                                "Revoke"
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="hidden lg:block overflow-x-auto rounded-3xl border border-border bg-background">
                  {erc721Tokens.length === 0 ? (
                    <div className="p-6 text-sm text-muted">
                      No ERC-721 approvals found in this window.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted">
                        <tr className="border-b border-border">
                          <th className="text-left font-semibold px-5 py-4">Collection</th>
                          <th className="text-left font-semibold px-5 py-4">Token ID</th>
                          <th className="text-left font-semibold px-5 py-4">Approved</th>
                          <th className="text-right font-semibold px-5 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {erc721Tokens.map((nft) => {
                          const rowKey = `erc721:${nft.contract}:${nft.tokenId}`;
                          const busy = revokingKey === rowKey;
                          return (
                            <tr key={rowKey} className="border-b border-border/70 last:border-b-0">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="font-semibold">{nft.symbol}</div>
                                  <span className="text-muted">{shorten(nft.contract)}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <Pill>#{nft.tokenId}</Pill>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-semibold">{shorten(nft.approved)}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-3">
                                  <RowActions
                                    onCopy={async () => {
                                      const ok = await safeCopy(nft.approved);
                                      showToast(ok ? "Copied" : "Copy failed", ok ? "success" : "danger");
                                    }}
                                    explorerHref={`${EXPLORER_BASE}${nft.approved}`}
                                  />
                                  <Button
                                    onClick={() => revokeERC721Token(nft)}
                                    disabled={busy}
                                    className={busy ? "btn-shimmer" : ""}
                                  >
                                    {busy ? (
                                      <>
                                        <LoadingSpinner />
                                        Revoking…
                                      </>
                                    ) : (
                                      "Revoke"
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {tab === "operators" && (
              <>
                <div className="grid grid-cols-1 gap-3 lg:hidden">
                  {operators.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-background p-5 text-sm text-muted">
                      No operator approvals found in this window.
                    </div>
                  ) : (
                    operators.map((op) => {
                      const rowKey = `op:${op.contract}:${op.operator}`;
                      const busy = revokingKey === rowKey;

                      return (
                        <div key={rowKey} className="rounded-3xl border border-border bg-background p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">Operator</div>
                              <div className="mt-1 text-xs text-muted break-all">
                                Collection: {shorten(op.contract)}
                              </div>
                            </div>
                            <Pill>{op.standard}</Pill>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                            <div className="text-xs text-muted">Operator</div>
                            <div className="font-semibold">{shorten(op.operator)}</div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-2">
                            <RowActions
                              onCopy={async () => {
                                const ok = await safeCopy(op.operator);
                                showToast(ok ? "Copied" : "Copy failed", ok ? "success" : "danger");
                              }}
                              explorerHref={`${EXPLORER_BASE}${op.operator}`}
                            />
                            <Button
                              onClick={() => revokeOperator(op)}
                              disabled={busy}
                              className={busy ? "btn-shimmer" : ""}
                            >
                              {busy ? (
                                <>
                                  <LoadingSpinner />
                                  Revoking…
                                </>
                              ) : (
                                "Revoke"
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="hidden lg:block overflow-x-auto rounded-3xl border border-border bg-background">
                  {operators.length === 0 ? (
                    <div className="p-6 text-sm text-muted">
                      No operator approvals found in this window.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted">
                        <tr className="border-b border-border">
                          <th className="text-left font-semibold px-5 py-4">Collection</th>
                          <th className="text-left font-semibold px-5 py-4">Operator</th>
                          <th className="text-left font-semibold px-5 py-4">Standard</th>
                          <th className="text-right font-semibold px-5 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operators.map((op) => {
                          const rowKey = `op:${op.contract}:${op.operator}`;
                          const busy = revokingKey === rowKey;
                          return (
                            <tr key={rowKey} className="border-b border-border/70 last:border-b-0">
                              <td className="px-5 py-4">
                                <span className="font-semibold">{shorten(op.contract)}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-semibold">{shorten(op.operator)}</span>
                              </td>
                              <td className="px-5 py-4">
                                <Pill>{op.standard}</Pill>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-3">
                                  <RowActions
                                    onCopy={async () => {
                                      const ok = await safeCopy(op.operator);
                                      showToast(ok ? "Copied" : "Copy failed", ok ? "success" : "danger");
                                    }}
                                    explorerHref={`${EXPLORER_BASE}${op.operator}`}
                                  />
                                  <Button
                                    onClick={() => revokeOperator(op)}
                                    disabled={busy}
                                    className={busy ? "btn-shimmer" : ""}
                                  >
                                    {busy ? (
                                      <>
                                        <LoadingSpinner />
                                        Revoking…
                                      </>
                                    ) : (
                                      "Revoke"
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
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
