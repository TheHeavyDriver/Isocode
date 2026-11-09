import {
  Cookie,
  Droplet,
  Leaf,
  Package,
  Popcorn,
  Sparkles,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconByKey: Record<string, LucideIcon> = {
  biscuit: Cookie,
  tea: Leaf,
  detergent: Sparkles,
  cleaner: Sparkles,
  snack: Popcorn,
  staple: Wheat,
  oil: Droplet,
  soap: Package,
  generic: Package,
};

export interface PackshotProduct {
  name: string;
  packSize: string;
  brandName: string;
  brandAccent: string;
  imageKey: string;
}

export function Packshot({
  product,
  size = "card",
  className,
}: {
  product: PackshotProduct;
  size?: "card" | "large";
  className?: string;
}) {
  const Icon = iconByKey[product.imageKey] ?? Package;
  const large = size === "large";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#ebe9e9]",
        large ? "aspect-[5/4] rounded-xl" : "aspect-[4/5] rounded-lg",
        className,
      )}
      style={{ border: "1px solid rgba(11, 3, 6, 0.09)" }}
      role="img"
      aria-label={`${product.brandName} ${product.name}, ${product.packSize} pack`}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute rounded-full border border-ink/[0.08]",
          large ? "-right-16 -top-20 h-64 w-64" : "-right-8 -top-10 h-32 w-32",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "absolute rotate-12 border border-ink/[0.06]",
          large
            ? "-bottom-24 -left-16 h-64 w-64"
            : "-bottom-10 -left-8 h-28 w-28",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "absolute h-px bg-ink/10",
          large ? "left-5 right-5 top-5" : "left-3 right-3 top-3",
        )}
      />

      <div
        className={cn(
          "absolute bottom-0 flex flex-col overflow-hidden rounded-t-sm bg-white shadow-[0_14px_30px_-22px_rgba(11,3,6,0.55)]",
          large ? "left-12 right-12 top-12" : "left-4 right-4 top-5",
        )}
        style={{
          border: "1px solid rgba(11, 3, 6, 0.1)",
          borderBottom: 0,
        }}
      >
        <div
          className={large ? "h-2" : "h-1.5"}
          style={{ backgroundColor: product.brandAccent }}
        />
        <div className={large ? "px-5 py-4" : "px-2.5 py-2"}>
          <p
            className={cn(
              "flex items-center gap-1 font-medium uppercase leading-none text-ink-soft",
              large
                ? "text-[0.625rem] tracking-[0.18em]"
                : "text-[0.4rem] tracking-[0.14em]",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "shrink-0 rounded-full",
                large ? "h-1.5 w-1.5" : "h-1 w-1",
              )}
              style={{ backgroundColor: product.brandAccent }}
            />
            {product.brandName}
          </p>
          <p
            className={cn(
              "display mt-1.5 line-clamp-3 leading-[1.08] text-ink",
              large ? "text-xl sm:text-2xl" : "text-[0.78rem]",
            )}
          >
            {product.name}
          </p>
          <p
            className={cn(
              "mt-1 text-ink-muted",
              large ? "text-xs" : "text-[0.5rem]",
            )}
          >
            Net {product.packSize}
          </p>
        </div>

        <div
          className={cn(
            "mt-auto flex items-end justify-between",
            large ? "px-5 pb-5" : "px-2.5 pb-2.5",
          )}
        >
          <Icon
            className={large ? "h-12 w-12" : "h-5 w-5"}
            style={{ color: product.brandAccent }}
            strokeWidth={1.4}
            aria-hidden="true"
          />
          <div
            aria-hidden="true"
            className={cn("flex items-end gap-[2px]", large ? "gap-1" : "")}
          >
            {[6, 10, 5, 12, 7, 9, 4, 11].map((height, index) => (
              <span
                key={index}
                className={cn("w-[1.5px] bg-ink/35", large ? "w-[2px]" : "")}
                style={{ height: large ? height * 1.6 : height * 0.55 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
