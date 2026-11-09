import Link from "next/link";
import { requireRetailerPage } from "@/lib/auth/session";
import { Logo } from "@/components/ui/logo";
import { BottomNav } from "@/components/retailer/bottom-nav";
import { CartBar } from "@/components/retailer/cart-bar";
import { HeaderCartLink } from "@/components/retailer/header-cart-link";

export default async function RetailerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireRetailerPage();

  return (
    <div className="min-h-dvh pb-36">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/shop"
            className="flex min-w-0 items-center gap-2.5"
            aria-label="Sahaj Order shop"
          >
            <Logo compact />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[0.8125rem] font-medium text-ink">
                {session.retailer.shopName}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 truncate text-[0.625rem] text-ink-muted">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-green"
                />
                {session.retailer.ownerName} · Retailer
              </span>
            </span>
          </Link>
          <HeaderCartLink />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        {children}
      </main>

      <CartBar />
      <BottomNav />
    </div>
  );
}
