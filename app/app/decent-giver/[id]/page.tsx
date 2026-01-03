// app/app/decent-giver/[id]/page.tsx
import type { Metadata } from "next";
import { APP_URL } from "@/src/lib/appEnv";
import GiverPackageClient from "./giverPackageClient";


export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;

  const canonical = `${APP_URL.replace(/\/+$/, "")}/decent-giver/${id}`;

  return {
    title: `Decent Giver • ${id}`,
    description:
      "View a donation campaign, donate securely on-chain, and withdraw (creator-only after expiry).",
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title: `Decent Giver • ${id}`,
      description:
        "View a donation campaign, donate securely on-chain, and withdraw (creator-only after expiry).",
      url: canonical,
      siteName: "Decentroneum",
      type: "website",
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Decent Giver" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Decent Giver • ${id}`,
      description:
        "View a donation campaign, donate securely on-chain, and withdraw (creator-only after expiry).",
      images: ["/opengraph-image.png"],
    },
  };
}

export default async function GiverPackagePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <GiverPackageClient donationId={id} />;
}
