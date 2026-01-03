// app/sitemap.ts
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export const revalidate = 86400; // ✅ 24 hours


function isLocalhost(host: string) {
  return host.includes("localhost") || host.startsWith("127.0.0.1");
}

function canonicalSiteUrl(host: string, proto: string) {
  if (host === "app.decentroneum.com") return "https://app.decentroneum.com";
  if (host === "decentroneum.com" || host.endsWith(".decentroneum.com"))
    return "https://decentroneum.com";
  return `${proto}://${host}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // MAIN DOMAIN URLs (marketing / public)
  const mainRoutes = ["/"];

  // APP SUBDOMAIN URLs (your /app/* routes, but without exposing /app in public URLs)
  // Because proxy rewrites app.decentroneum.com/* -> /app/*
  const appRoutes = [
    "/",
    "/bulk-sender",
    "/decent-giver",
    "/revoker",
    "/token-burner",
    "/token-creator",
    "/token-locker",
  ];

  const routes = isAppHost ? appRoutes : mainRoutes;

  const now = new Date();

  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
