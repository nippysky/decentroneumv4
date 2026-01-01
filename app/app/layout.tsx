import Link from "next/link";
import { WalletPill } from "@/src/ui/WalletPill";
import { Container } from "@/src/ui/Container";

function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-9 w-9 rounded-xl border border-border bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--accent)_55%,transparent),transparent_60%),linear-gradient(180deg,color-mix(in_oklab,var(--accent)_18%,transparent),transparent)]"
        aria-hidden="true"
      />
      <span className="text-sm font-semibold tracking-tight">Decentroneum App</span>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur">
        <Container className="h-16 flex items-center justify-between">
          <Link href="/app" className="hover:opacity-90" aria-label="Decentroneum App home">
            <LogoMark />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-muted hover:text-foreground transition"
            >
              Landing
            </Link>
            <WalletPill />
          </div>
        </Container>
      </header>

      <main className="page-enter">{children}</main>
    </div>
  );
}
