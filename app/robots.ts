// app/robots.ts
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export const revalidate = 86400; // cache for 24h

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "decentroneum.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getOrigin();
  const host = new URL(origin).host.toLowerCase();
  const isAppHost = host.startsWith("app.");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: isAppHost
          ? ["/api/", "/_next/"]
          : [
              "/api/",
              "/_next/",
              "/app/", // ✅ keep app routes off main-domain indexing
            ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
