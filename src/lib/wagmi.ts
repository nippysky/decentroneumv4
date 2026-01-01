import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { electroneum } from "./chain";


const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local");
}

export const wagmiConfig = getDefaultConfig({
  appName: "Decentroneum",
  projectId,
  chains: [electroneum],
  ssr: true,
  transports: {
    [electroneum.id]: http(
      process.env.NEXT_PUBLIC_ETN_RPC_URL || "https://rpc.ankr.com/electroneum",
    ),
  },
});
