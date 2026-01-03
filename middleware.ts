// middleware.ts
import { NextRequest, NextResponse } from "next/server";

function isStaticOrInternal(pathname: string) {
  // Next internals + APIs
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return true;
  }

  // Any file with an extension (png, svg, css, js, ico, etc.)
  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

function getHost(req: NextRequest) {
  return (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  if (isStaticOrInternal(pathname)) return NextResponse.next();

  const host = getHost(req);
  const isAppHost = host.startsWith("app.");

  // ✅ APP SUBDOMAIN: serve /app/* without exposing /app in URL
  if (isAppHost) {
    if (pathname.startsWith("/app")) return NextResponse.next();
    url.pathname = `/app${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ✅ MAIN DOMAIN: keep /app off public URLs
  // If someone visits main-domain /app/*, redirect them to app subdomain.
  // (Skip redirect for localhost/dev)
  const isLocalhost = host.includes("localhost") || host.startsWith("127.0.0.1");
  const isProdDomain = host.endsWith("decentroneum.com");

  if (!isLocalhost && isProdDomain && pathname.startsWith("/app")) {
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
