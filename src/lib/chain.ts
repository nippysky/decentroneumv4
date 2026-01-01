import { defineChain } from "viem";

export const electroneum = defineChain({
  id: 52014,
  name: "Electroneum",
  nativeCurrency: { name: "Electroneum", symbol: "ETN", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ETN_RPC_URL || "https://rpc.ankr.com/electroneum"],
    },
  },
  blockExplorers: {
    default: {
      name: "Electroneum Explorer",
      url: "https://blockexplorer.electroneum.com",
    },
  },
});
