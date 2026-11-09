import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-8 w-8 text-base",
    md: "h-10 w-10 text-xl",
    lg: "h-12 w-12 text-2xl",
  };

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-[0.6rem] bg-ink text-surface",
        sizes[size],
        className,
      )}
    >
      <span className="display -mt-0.5 leading-none">स</span>
      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-green" />
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
          <span className="display block text-[1.05rem] font-medium tracking-[-0.03em] text-ink">
            Sahaj Order
          </span>
          <span className="mt-1.5 block text-[0.625rem] font-medium tracking-[0.14em] text-ink-muted">
            सहज ऑर्डर
          </span>
        </span>
      )}
    </span>
  );
}
