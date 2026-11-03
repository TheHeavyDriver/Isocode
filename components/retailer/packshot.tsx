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
        "relative overflow-hidden",
        large ? "aspect-[5/4] rounded-2xl" : "aspect-[4/5] rounded-xl",
        className,
      )}
      style={{
        backgroundColor: `${product.brandAccent}12`,
        border: `1px solid ${product.brandAccent}24`,
      }}
      role="img"
      aria-label={`${product.brandName} ${product.name}, ${product.packSize} pack`}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute rounded-full",
          large ? "-right-16 -top-20 h-64 w-64" : "-right-8 -top-10 h-32 w-32",
        )}
        style={{ backgroundColor: product.brandAccent, opacity: 0.09 }}
      />
      <div
        aria-hidden="true"
        className={cn(
          "absolute rounded-full border",
          large
            ? "-bottom-24 -left-16 h-64 w-64"
            : "-bottom-10 -left-8 h-28 w-28",
        )}
        style={{ borderColor: product.brandAccent, opacity: 0.16 }}
      />

      <div
        className={cn(
          "absolute bottom-0 flex flex-col overflow-hidden rounded-t-md bg-surface shadow-[0_10px_24px_-16px_rgba(0,0,0,0.45)]",
          large ? "left-12 right-12 top-12" : "left-4 right-4 top-5",
        )}
        style={{
          border: `1px solid ${product.brandAccent}30`,
          borderBottom: 0,
        }}
      >
        <div
          className={large ? "h-2.5" : "h-1.5"}
          style={{ backgroundColor: product.brandAccent }}
        />
        <div className={large ? "px-5 py-4" : "px-2.5 py-2"}>
          <p
            className={cn(
              "font-semibold uppercase leading-none",
              large
                ? "text-[0.625rem] tracking-[0.2em]"
                : "text-[0.4rem] tracking-[0.14em]",
            )}
            style={{ color: product.brandAccent }}
          >
            {product.brandName}
          </p>
          <p
            className={cn(
              "display mt-1 line-clamp-3 font-semibold leading-[1.1] text-ink",
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
