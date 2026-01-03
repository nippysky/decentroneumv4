// src/lib/appEnv.ts
export const APP_BASE = process.env.NEXT_PUBLIC_APP_BASE ?? "";
export const MAIN_SITE_URL =
  process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://decentroneum.com";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (APP_BASE ? `${MAIN_SITE_URL}${APP_BASE}` : "https://app.decentroneum.com");

export function joinPath(base: string, path: string) {
  const b = (base || "").trim();
  const p = (path || "").trim();
  const b2 = b === "/" ? "" : b.replace(/\/+$/, "");
  const p2 = p.replace(/^\/+/, "");
  if (!b2) return `/${p2}`.replace(/\/{2,}/g, "/");
  return `${b2}/${p2}`.replace(/\/{2,}/g, "/");
}

export const appHref = (path = "") => joinPath(APP_BASE, path);

// ✅ Use this when you want to open the app from anywhere (landing page)
export const appUrlHref = (path = "") => `${APP_URL}${joinPath("", path)}`;
