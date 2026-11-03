"use client";

import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { useCart } from "@/lib/cart/store";

export function HeaderCartLink() {
  const cart = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${cart.count} cases`}
      className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft transition hover:border-line-strong hover:text-ink"
    >
      <ShoppingBasket className="h-5 w-5" />
      {cart.count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-green px-1 text-[0.625rem] font-bold text-surface">
          {cart.count}
        </span>
      )}
    </Link>
  );
}
