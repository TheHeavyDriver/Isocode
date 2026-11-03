import { cn } from "@/lib/utils";
import type { StockStatus } from "@/lib/catalogue/types";

export function StockPill({
  status,
  stockCases,
  showInStock = false,
  className,
}: {
  status: StockStatus;
  stockCases?: number;
  showInStock?: boolean;
  className?: string;
}) {
  if (status === "in" && !showInStock) return null;

  if (status === "out") {
    return (
      <span className={cn("pill bg-red-soft text-red", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-red" aria-hidden="true" />
        Out of stock
      </span>
    );
  }

  if (status === "low") {
    return (
      <span className={cn("pill bg-amber-soft text-amber", className)}>
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber"
          aria-hidden="true"
        />
        {typeof stockCases === "number"
          ? `Only ${stockCases} left`
          : "Low stock"}
      </span>
    );
  }

  return (
    <span className={cn("pill bg-green-soft text-green-dark", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-green" aria-hidden="true" />
      In stock
    </span>
  );
}

export function SchemeBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn("pill max-w-full bg-green-soft text-green-dark", className)}
    >
      <svg
        viewBox="0 0 12 12"
        className="h-3 w-3 shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M1.5 6.4V2.2c0-.4.3-.7.7-.7h4.2c.2 0 .4.1.5.2l4 4c.3.3.3.7 0 1L7 10.5c-.3.3-.7.3-1 0l-4-4a.8.8 0 0 1-.2-.5Z"
          stroke="currentColor"
          strokeWidth="1.1"
        />
        <circle cx="4" cy="4" r=".8" fill="currentColor" />
      </svg>
      <span className="truncate">{label}</span>
    </span>
  );
}
