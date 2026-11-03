"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  qty,
  onChange,
  disabled = false,
  label = "cases",
  className,
}: {
  qty: number;
  onChange: (qty: number) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 w-full items-center justify-between overflow-hidden rounded-xl border border-line-strong bg-surface",
        disabled && "opacity-50",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        disabled={disabled || qty <= 0}
        aria-label={`Remove one ${label}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-soft transition hover:bg-paper disabled:cursor-not-allowed disabled:text-ink-muted/40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span
        className="flex min-w-0 flex-1 flex-col items-center leading-none"
        aria-live="polite"
      >
        <span className="money text-base font-bold text-ink">{qty}</span>
        <span className="mt-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          {qty === 1 ? label.replace(/s$/, "") : label}
        </span>
      </span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        disabled={disabled || qty >= 999}
        aria-label={`Add one ${label.replace(/s$/, "")}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-green transition hover:bg-green-soft disabled:cursor-not-allowed disabled:text-ink-muted/40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
