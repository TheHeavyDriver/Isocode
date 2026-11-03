import Link from "next/link";
import { requireRetailerPage } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
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
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link
            href="/shop"
            className="flex min-w-0 items-center gap-2.5"
            aria-label="Sahaj Order shop"
          >
            <Logo compact />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[0.8125rem] font-bold text-ink">
                {session.retailer.shopName}
              </span>
              <span className="block truncate text-[0.625rem] text-ink-muted">
                {session.retailer.ownerName} ·{" "}
                {t(session.retailer.language, "retailer")}
              </span>
            </span>
          </Link>
          <HeaderCartLink />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        {children}
      </main>

      <CartBar />
      <BottomNav language={session.retailer.language} />
    </div>
  );
}
