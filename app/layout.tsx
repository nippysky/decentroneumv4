import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/src/theme/ThemeProvider";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://decentroneum.com"),
  title: {
    default: "Decentroneum",
    template: "%s · Decentroneum",
  },
  description:
    "Decentroneum is the home of Decent Wallet — a secure, non-custodial wallet built for the Electroneum ecosystem. Download on iOS and Android.",
  applicationName: "Decentroneum",
  keywords: [
    "Decentroneum",
    "Decent Wallet",
    "Electroneum",
    "EVM",
    "non-custodial wallet",
    "Web3 wallet",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Decentroneum",
    title: "Decentroneum",
    description:
      "Download Decent Wallet for iOS and Android — non-custodial, Electroneum-focused, security-first.",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "Decentroneum" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Decentroneum",
    description:
      "Download Decent Wallet for iOS and Android — a non-custodial wallet for the Electroneum ecosystem.",
    images: ["/og.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={lexend.variable}>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
