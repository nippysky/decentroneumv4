import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Providers } from "./providers";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://decentroneum.com"),
  title: {
    default: "Decentroneum",
    template: "%s • Decentroneum",
  },
  description:
    "Decentroneum is a Web3 platform for the Electroneum ecosystem — bringing tools, utilities, and a mobile wallet together in one dependable experience.",
  openGraph: {
    title: "Decentroneum",
    description:
      "A Web3 platform for the Electroneum ecosystem — tools, utilities, and Decent Wallet.",
    url: "https://decentroneum.com",
    siteName: "Decentroneum",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Decentroneum",
    description:
      "A Web3 platform for the Electroneum ecosystem — tools, utilities, and Decent Wallet.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lexend.variable} suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
