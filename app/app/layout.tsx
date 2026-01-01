import type { ReactNode } from "react";
import ThirdwebProviderWrapper from "@/src/web3/ThirdwebProviderWrapper";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <ThirdwebProviderWrapper>{children}</ThirdwebProviderWrapper>;
}
