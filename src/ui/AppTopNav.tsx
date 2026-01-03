// src/ui/AppTopNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Container } from "@/src/ui/Container";
import { FiChevronLeft } from "react-icons/fi";
import { HiOutlineHome } from "react-icons/hi2";
import { APP_BASE, appHref } from "@/src/lib/appEnv";

function prettySegment(seg: string) {
  return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function AppTopNav() {
  const router = useRouter();
  const pathname = usePathname() || "";

  const base = APP_BASE || "";
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

  // Determine "home" depending on base:
  // - base "/app" => home is "/app"
  // - base ""     => home is "/"
  const homePath = base ? base : "/";

  const isHome = normalizedPath === homePath;

  // Remove base prefix to build breadcrumb label
  const withoutBase = base && normalizedPath.startsWith(base)
    ? normalizedPath.slice(base.length)
    : normalizedPath;

  const segments = withoutBase.split("/").filter(Boolean);
  const leaf = segments[segments.length - 1];

  const currentLabel = isHome ? "Apps" : prettySegment(leaf || "Apps");

  return (
    <div className="border-b border-border/50 bg-background/55 backdrop-blur">
      <Container className="h-12 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="
              inline-flex h-9 w-9 items-center justify-center rounded-full
              border border-border bg-card
              hover:border-foreground/15 hover:bg-background transition
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
            "
            aria-label="Back"
            title="Back"
          >
            <FiChevronLeft className="h-4 w-4 text-foreground" />
          </button>

          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-2 text-xs sm:text-sm text-muted min-w-0">
              <li className="shrink-0">
                <Link href={appHref("")} className="hover:text-foreground transition">
                  App
                </Link>
              </li>
              <li aria-hidden="true" className="shrink-0 opacity-60">
                /
              </li>
              <li className="truncate text-foreground/90" title={currentLabel}>
                {currentLabel}
              </li>
            </ol>
          </nav>
        </div>

        {/* Landing button is always / on the main site */}
        <Link
          href="/"
          className="
            inline-flex items-center gap-2 rounded-full
            border border-border bg-card px-3 h-9
            text-xs sm:text-sm font-medium text-foreground/90
            hover:border-foreground/15 hover:bg-background transition
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
          "
          aria-label="Back to landing"
          title="Back to landing"
        >
          <HiOutlineHome className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Landing</span>
        </Link>
      </Container>
    </div>
  );
}
