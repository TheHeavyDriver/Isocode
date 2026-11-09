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
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link
            href="/desk"
            className="flex min-w-0 items-center gap-2.5"
            aria-label="Sahaj Order desk"
          >
            <Logo compact />
            <span className="leading-tight">
              <span className="block text-[0.8125rem] font-medium text-ink">
                Order desk
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[0.625rem] text-ink-muted">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-green"
                />
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

      <main id="main" className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        {children}
      </main>
    </div>
  );
}
