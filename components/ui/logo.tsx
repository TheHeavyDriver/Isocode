import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-8 w-8 text-lg",
    md: "h-10 w-10 text-2xl",
    lg: "h-12 w-12 text-3xl",
  };

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-green text-surface shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]",
        sizes[size],
        className,
      )}
    >
      <span className="display -mt-0.5 leading-none">स</span>
    </span>
  );
}

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      {!compact && (
        <span className="leading-none">
          <span className="display block text-[1.05rem] font-semibold tracking-tight text-ink">
            Sahaj Order
          </span>
          <span className="mt-1 block text-[0.6875rem] font-medium tracking-[0.08em] text-ink-muted">
            सहज ऑर्डर
          </span>
        </span>
      )}
    </span>
  );
}
