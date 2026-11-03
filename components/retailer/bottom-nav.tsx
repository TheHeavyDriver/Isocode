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
import { t, type CopyKey, type Language } from "@/lib/i18n";

const items: Array<{
  href: string;
  labelKey: CopyKey;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}> = [
  {
    href: "/shop",
    labelKey: "shop",
    icon: Store,
    match: (pathname) => pathname === "/shop" || pathname.startsWith("/shop/"),
  },
  {
    href: "/ai",
    labelKey: "aiOrder",
    icon: Sparkles,
    match: (pathname) => pathname.startsWith("/ai"),
  },
  {
    href: "/orders",
    labelKey: "orders",
    icon: ClipboardList,
    match: (pathname) => pathname.startsWith("/orders"),
  },
  {
    href: "/account",
    labelKey: "account",
    icon: UserRound,
    match: (pathname) => pathname.startsWith("/account"),
  },
];

export function BottomNav({ language }: { language: Language }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={language === "hi" ? "दुकानदार अनुभाग" : "Retailer sections"}
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur"
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
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.625rem] font-semibold transition",
                  active ? "text-green" : "text-ink-muted hover:text-ink-soft",
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-green"
                  />
                )}
                <Icon
                  className={cn("h-5 w-5", active && "stroke-[2.2]")}
                  aria-hidden="true"
                />
                {t(language, item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
