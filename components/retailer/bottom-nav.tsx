"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Sparkles,
  Store,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}> = [
  {
    href: "/shop",
    label: "Shop",
    icon: Store,
    match: (pathname) => pathname === "/shop" || pathname.startsWith("/shop/"),
  },
  {
    href: "/ai",
    label: "AI order",
    icon: Sparkles,
    match: (pathname) => pathname.startsWith("/ai"),
  },
  {
    href: "/orders",
    label: "Orders",
    icon: ClipboardList,
    match: (pathname) => pathname.startsWith("/orders"),
  },
  {
    href: "/account",
    label: "Account",
    icon: UserRound,
    match: (pathname) => pathname.startsWith("/account"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Retailer sections"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 backdrop-blur-xl"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1.5 px-1 text-[0.625rem] font-medium tracking-[0.01em] transition",
                  active ? "text-ink" : "text-ink-muted hover:text-ink-soft",
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-0.5 w-7 rounded-b-full bg-green"
                  />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-green" : "text-current",
                  )}
                  strokeWidth={active ? 2 : 1.7}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
