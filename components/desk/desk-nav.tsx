"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/desk",
    label: "Order queue",
    icon: ClipboardList,
    match: (pathname: string) =>
      pathname === "/desk" || pathname.startsWith("/desk/orders"),
  },
  {
    href: "/desk/exports",
    label: "Tally exports",
    icon: FileDown,
    match: (pathname: string) => pathname.startsWith("/desk/exports"),
  },
];

export function DeskNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Order desk sections" className="flex gap-1">
      {items.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition",
              active
                ? "bg-ink text-white"
                : "text-ink-muted hover:bg-paper hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
