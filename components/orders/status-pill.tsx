import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_META,
  type CreditStatus,
  type OrderStatus,
} from "@/lib/orders/types";

const toneClasses: Record<
  (typeof ORDER_STATUS_META)[OrderStatus]["tone"],
  string
> = {
  neutral: "bg-paper-deep text-ink-soft",
  amber: "bg-amber-soft text-amber",
  green: "bg-green-soft text-green-dark",
  blue: "bg-blue-soft text-blue",
  red: "bg-red-soft text-red",
};

export function OrderStatusPill({
  status,
  className,
  short = false,
}: {
  status: OrderStatus;
  className?: string;
  short?: boolean;
}) {
  const meta = ORDER_STATUS_META[status];
  return (
    <span className={cn("pill font-medium", toneClasses[meta.tone], className)}>
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          meta.tone === "neutral" && "bg-ink-muted",
          meta.tone === "amber" && "bg-amber",
          meta.tone === "green" && "bg-green",
          meta.tone === "blue" && "bg-blue",
          meta.tone === "red" && "bg-red",
        )}
      />
      {short ? meta.short : meta.label}
    </span>
  );
}

export function CreditStatusPill({
  status,
  className,
}: {
  status: CreditStatus;
  className?: string;
}) {
  if (status === "ok") return null;
  const label =
    status === "hold"
      ? "Credit hold"
      : status === "approved"
        ? "Credit approved"
        : "Credit rejected";
  return (
    <span
      className={cn(
        "pill font-medium",
        status === "approved"
          ? "bg-green-soft text-green-dark"
          : status === "rejected"
            ? "bg-red-soft text-red"
            : "bg-amber-soft text-amber",
        className,
      )}
    >
      {label}
    </span>
  );
}
