// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import Script from "next/script";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Providers } from "./providers";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

const SITE_NAME = "Decentroneum";
const SITE_URL = "https://decentroneum.com";
const DESCRIPTION =
  "Decentroneum is a Web3 platform for the Electroneum ecosystem — bringing tools, utilities, and a mobile wallet together in one dependable experience.";

// If your brand has an official Twitter handle, put it here (e.g. "@decentroneum")
const TWITTER_HANDLE = "@decentroneum";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F2" },
    { media: "(prefers-color-scheme: dark)", color: "#060807" },
  ],
  colorScheme: "dark light",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s • ${SITE_NAME}`,
  },
  description: DESCRIPTION,

  alternates: {
    canonical: "/",
  },

  // Helps some crawlers + UIs classify your site
  category: "technology",

  // Optional but nice-to-have
  keywords: [
    "Decentroneum",
    "Electroneum",
    "ETN",
    "Web3",
    "Crypto",
    "Decent Wallet",
    "Blockchain",
    "EVM",
  ],

  // PWA / app-ish metadata
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },

  // Icons (Next will emit correct <link rel="icon"...> tags)
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
    other: [
      { rel: "icon", url: "/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
      { rel: "icon", url: "/android-chrome-512x512.png", type: "image/png", sizes: "512x512" },
    ],
  },

  openGraph: {
    title: SITE_NAME,
    description:
      "A Web3 platform for the Electroneum ecosystem — tools, utilities, and Decent Wallet.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Decentroneum — Web3 platform for the Electroneum ecosystem",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description:
      "A Web3 platform for the Electroneum ecosystem — tools, utilities, and Decent Wallet.",
    ...(TWITTER_HANDLE ? { site: TWITTER_HANDLE, creator: TWITTER_HANDLE } : {}),
    images: ["/opengraph-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/DECENT-ICON.png`,
    sameAs: [
      // Add official socials when ready (leave empty array if none)
      "https://x.com/decentroneum",
      "https://github.com/nippysky",
      "https://t.me/DecentroneumGroupChat"
    ],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" className={lexend.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {/* Structured data helps Google understand your brand/site entity */}
        <Script
          id="ld-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Script
          id="ld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
