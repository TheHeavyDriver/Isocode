"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ShoppingBasket } from "lucide-react";
import { useCart } from "@/lib/cart/store";

export function CartBar() {
  const cart = useCart();
  const pathname = usePathname();

  if (cart.count === 0 || pathname === "/cart") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-40 px-3">
      <Link
        href="/cart"
        className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-white/10 bg-ink px-4 py-3 text-surface shadow-lift transition hover:bg-[#241b1e]"
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.07]">
          <ShoppingBasket className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-green px-1 text-[0.625rem] font-semibold text-white">
            {cart.count}
          </span>
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-sm font-medium">
            {cart.count} case{cart.count === 1 ? "" : "s"} in the cart
          </span>
          <span className="block text-[0.6875rem] text-white/55">
            {cart.lineCount} product{cart.lineCount === 1 ? "" : "s"} · check
            schemes and credit
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-[#7fd0b6]">
          Review <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}
