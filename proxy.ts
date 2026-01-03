// proxy.ts
import { NextRequest, NextResponse } from "next/server";

function isStaticOrInternal(pathname: string) {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return true;
  }

  // Any file with an extension: png, svg, css, js, ico, etc.
  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

function getHost(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    ""
  )
    .toLowerCase()
    .split(",")[0]
    .trim();
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  if (isStaticOrInternal(pathname)) return NextResponse.next();

  const host = getHost(req);
  const isAppHost = host === "app.decentroneum.com" || host.startsWith("app.");

  // ✅ APP SUBDOMAIN: serve /app/* without exposing /app in URL
  if (isAppHost) {
    if (pathname.startsWith("/app")) return NextResponse.next();
    url.pathname = `/app${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // ✅ MAIN DOMAIN: redirect /app/* to app subdomain in production
  const isLocal =
    host.includes("localhost") || host.startsWith("127.0.0.1");
  const isProdDomain = host === "decentroneum.com" || host.endsWith(".decentroneum.com");

  if (!isLocal && isProdDomain && pathname.startsWith("/app")) {
    const dest = req.nextUrl.clone();
    dest.hostname = "app.decentroneum.com";
    dest.pathname = pathname.replace(/^\/app/, "") || "/";
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
