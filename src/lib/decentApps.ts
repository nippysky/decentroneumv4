// src/lib/decentApps.ts
import { appHref } from "@/src/lib/appEnv";

export interface DecentApp {
  title: string;
  desc: string;
  href: string;
  external?: boolean;
  tag?: string;
}

export const DECENT_APPS: DecentApp[] = [
  {
    title: "Token Creator",
    desc: "Create your own ETN-SC token. Name, symbol, supply — done.",
    href: appHref("token-creator"),
    tag: "Token",
  },
  {
    title: "Token Locker",
    desc: "Lock assets for a set time — simple and transparent.",
    href: appHref("token-locker"),
    tag: "Token",
  },
  {
    title: "Token Bulk Sender",
    desc: "Send tokens to multiple addresses in one go.",
    href: appHref("bulk-sender"),
    tag: "Utility",
  },
  {
    title: "Revoker",
    desc: "Track and revoke token approvals to stay in control.",
    href: appHref("revoker"),
    tag: "Security",
  },
  {
    title: "Token Burner",
    desc: "Burn tokens to reduce supply or clean up holdings.",
    href: appHref("token-burner"),
    tag: "Token",
  },
  {
    title: "Giver — Donation",
    desc: "Create donation campaigns and withdraw funds securely.",
    href: appHref("decent-giver"),
    tag: "Community",
  },
  {
    title: "Panthart",
    desc: "NFT marketplace for the Electroneum ecosystem.",
    href: "https://panth.art",
    external: true,
    tag: "NFTs",
  },
];
