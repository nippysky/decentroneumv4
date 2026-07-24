// app/api/tokens/submit/route.ts
//
// Intake for token listing requests.
//
// Order of operations matters: we verify against the chain BEFORE emailing.
// Anything that reaches the inbox is therefore already known to be a real
// ERC-20 with a working logo, and its name/symbol/decimals are the on-chain
// truth rather than whatever the submitter typed. That removes the entire
// class of "listed with wrong decimals" bugs, which would otherwise show
// wrong balances in every wallet that picks up the registry.
import { NextResponse } from "next/server";
import { TokenVerificationError, verifyErc20, verifyLogoUrl } from "@/src/lib/chain/serverRead";
import { TOKEN_LIST } from "@/src/lib/tokenList";

export const runtime = "nodejs";
// Never cache an intake endpoint.
export const dynamic = "force-dynamic";

const MAX_LEN = { projectName: 80, contact: 160, website: 200, notes: 1000 } as const;

type Body = {
  address?: string;
  logoURI?: string;
  projectName?: string;
  contact?: string;
  website?: string;
  notes?: string;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function str(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("Malformed request.");
  }

  const projectName = str(body.projectName, MAX_LEN.projectName);
  const contact = str(body.contact, MAX_LEN.contact);
  const website = str(body.website, MAX_LEN.website);
  const notes = str(body.notes, MAX_LEN.notes);
  const address = str(body.address, 64);
  const logoURI = str(body.logoURI, 400);

  if (!projectName) return bad("Please tell us the project name.");
  if (!contact || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact)) {
    return bad("Please give a valid contact email so we can reach you.");
  }
  if (!address) return bad("Please provide the token contract address.");
  if (!logoURI) return bad("Please provide an https:// URL for the token logo.");

  // Already listed? Tell them rather than creating duplicate work.
  const already = TOKEN_LIST.find((t) => t.address.toLowerCase() === address.toLowerCase());
  if (already) {
    return NextResponse.json({
      ok: false,
      error: `${already.symbol} is already in the Decentroneum token list.`,
    });
  }

  // --- Verification (chain + logo) --------------------------------------
  let verified;
  try {
    verified = await verifyErc20(address);
    await verifyLogoUrl(logoURI);
  } catch (e) {
    if (e instanceof TokenVerificationError) return bad(e.message);
    return bad("We couldn't verify that token right now. Please try again shortly.", 502);
  }

  // Enforce the wallet's own schema limits here, so an approved submission
  // is guaranteed listable without further edits.
  if (verified.symbol.length > 12) {
    return bad("That token's symbol is longer than 12 characters, which our wallet can't display.");
  }
  if (verified.name.length > 64) {
    return bad("That token's name is longer than 64 characters, which our wallet can't display.");
  }

  // --- Notify ------------------------------------------------------------
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.TOKEN_SUBMISSIONS_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;

  const summary = {
    ...verified,
    logoURI,
    projectName,
    contact,
    website: website || null,
    notes: notes || null,
    submittedAt: new Date().toISOString(),
  };

  if (!apiKey || !to || !from) {
    // Misconfiguration must not look like a user error, and must not lose
    // the submission silently — log it so it's recoverable from logs.
    console.error("[tokens/submit] Email not configured; submission not delivered:", summary);
    return NextResponse.json(
      { ok: false, error: "Submissions are temporarily unavailable. Please reach out on Telegram instead." },
      { status: 503 }
    );
  }

  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 12px;color:#6b7280">${k}</td><td style="padding:6px 12px"><strong>${escapeHtml(v)}</strong></td></tr>`;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px">
      <h2 style="margin:0 0 4px">Token listing request</h2>
      <p style="color:#6b7280;margin:0 0 16px">
        Verified on-chain before delivery — the values below were read from the contract.
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        ${row("Project", projectName)}
        ${row("Contact", contact)}
        ${website ? row("Website", website) : ""}
        ${row("Contract", verified.address)}
        ${row("Name (on-chain)", verified.name)}
        ${row("Symbol (on-chain)", verified.symbol)}
        ${row("Decimals (on-chain)", String(verified.decimals))}
        ${row("Total supply (raw)", verified.totalSupply)}
        ${row("Logo", logoURI)}
        ${notes ? row("Notes", notes) : ""}
      </table>
      <p style="margin:20px 0 6px;font-weight:600">To approve</p>
      <p style="color:#6b7280;margin:0 0 8px;font-size:13px">
        Add this entry to <code>src/lib/tokenList.ts</code>, deploy, then update
        <code>TRACKED_TOKENS</code> on the push server from
        <code>/api/token-list.json</code> and restart it.
      </p>
      <pre style="background:#0b0f0c;color:#eafbea;padding:14px;border-radius:10px;font-size:12px;overflow:auto">${escapeHtml(
        `{
  address: "${verified.address}",
  symbol: "${verified.symbol}",
  name: "${verified.name}",
  decimals: ${verified.decimals},
  logoURI: "${logoURI}",
  status: "approved",
},`
      )}</pre>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        // Lets you reply straight to the project from your inbox.
        reply_to: contact,
        subject: `Token listing: ${verified.symbol} (${projectName})`,
        html,
      }),
    });

    if (!res.ok) {
      console.error("[tokens/submit] Resend failed:", res.status, await res.text().catch(() => ""), summary);
      return NextResponse.json(
        { ok: false, error: "We couldn't send your submission. Please reach out on Telegram instead." },
        { status: 502 }
      );
    }
  } catch (e) {
    console.error("[tokens/submit] Resend threw:", e, summary);
    return NextResponse.json(
      { ok: false, error: "We couldn't send your submission. Please reach out on Telegram instead." },
      { status: 502 }
    );
  }

  // Echo the verified values back so the UI can show what we actually read.
  return NextResponse.json({
    ok: true,
    token: {
      address: verified.address,
      name: verified.name,
      symbol: verified.symbol,
      decimals: verified.decimals,
    },
  });
}
