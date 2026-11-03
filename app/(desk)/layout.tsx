import Link from "next/link";
import { requireDeskPage } from "@/lib/auth/session";
import { Logo } from "@/components/ui/logo";
import { DeskNav } from "@/components/desk/desk-nav";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function DeskLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireDeskPage();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link
            href="/desk"
            className="flex min-w-0 items-center gap-2.5"
            aria-label="Sahaj Order desk"
          >
            <Logo compact />
            <span className="leading-tight">
              <span className="block text-[0.8125rem] font-bold text-ink">
                Order desk
              </span>
              <span className="block text-[0.625rem] text-ink-muted">
                Sahaj Distributors · {session.user.name}
              </span>
            </span>
          </Link>

          <div className="order-3 w-full sm:order-none sm:ml-auto sm:w-auto">
            <DeskNav />
          </div>

          <LogoutButton
            label="Sign out"
            className="btn btn-ghost ml-auto h-8 min-h-8 px-2 text-xs sm:ml-0"
          />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        {children}
      </main>
    </div>
  );
}
