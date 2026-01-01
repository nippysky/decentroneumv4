"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletPill() {
  return (
    <div className="shrink-0">
      <ConnectButton
        label="Connect"
        chainStatus="icon"
        showBalance={false}
        accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
      />
    </div>
  );
}
