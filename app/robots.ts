// app/robots.ts
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

function isLocalhost(host: string) {
  return host.includes("localhost") || host.startsWith("127.0.0.1");
}

function canonicalSiteUrl(host: string, proto: string) {
  // App subdomain stays on app.*
  if (host === "app.decentroneum.com") return "https://app.decentroneum.com";

  // Any other decentroneum.* host canonicalizes to main site
  if (host === "decentroneum.com" || host.endsWith(".decentroneum.com")) {
    return "https://decentroneum.com";
  }

  // Fallback (use current host/proto)
  return `${proto}://${host}`;
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();

  const host =
    (h.get("x-forwarded-host") ?? h.get("host") ?? "decentroneum.com")
      .split(",")[0]
      .trim()
      .toLowerCase();

  const proto =
    (h.get("x-forwarded-proto") ?? (isLocalhost(host) ? "http" : "https"))
      .split(",")[0]
      .trim()
      .toLowerCase();

  const siteUrl = canonicalSiteUrl(host, proto);
  const isAppHost = host === "app.decentroneum.com" || host.startsWith("app.");

  const rules: MetadataRoute.Robots["rules"] = [
    {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/_next/"],
    },
  ];

  // MAIN domain only: block /app from indexing (since app lives on app subdomain)
  if (!isAppHost) {
    rules.push({
      userAgent: "*",
      disallow: ["/app", "/app/"],
    });
  }

  return {
    rules,
    sitemap: `${siteUrl}/sitemap.xml`,

    // ✅ Host should be hostname only (not "https://...")
    host,
  };
}
