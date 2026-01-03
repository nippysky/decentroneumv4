// app/sitemap.ts
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export const revalidate = 86400; // cache for 24h

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "decentroneum.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getOrigin();
  const host = new URL(origin).host.toLowerCase();
  const isAppHost = host.startsWith("app.");

  // Main site pages (keep lean & valuable)
  const MAIN_ROUTES = ["/"];

  // App pages (static routes only; don’t include dynamic /decent-giver/[id] unless you can enumerate)
  const APP_ROUTES = [
    "/",
    "/token-creator",
    "/token-locker",
    "/bulk-sender",
    "/revoker",
    "/token-burner",
    "/decent-giver",
  ];

  const routes = isAppHost ? APP_ROUTES : MAIN_ROUTES;

  return routes.map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
