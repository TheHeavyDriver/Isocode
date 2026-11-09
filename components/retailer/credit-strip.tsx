import { formatInr } from "@/lib/pricing/money";
import { cn } from "@/lib/utils";

export function CreditStrip({
  limitPaisa,
  outstandingPaisa,
  className,
}: {
  limitPaisa: number;
  outstandingPaisa: number;
  className?: string;
}) {
  const available = Math.max(0, limitPaisa - outstandingPaisa);
  const usedRatio =
    limitPaisa > 0 ? Math.min(1, outstandingPaisa / limitPaisa) : 1;
  const low = usedRatio >= 0.8;

  return (
    <div className={cn("card px-4 py-3.5", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Credit available</p>
          <p
            className={cn(
              "money font-display mt-1.5 text-[1.45rem] font-medium leading-none",
              low ? "text-amber" : "text-ink",
            )}
          >
            {formatInr(available)}
          </p>
        </div>
        <div className="text-right text-[0.625rem] leading-relaxed text-ink-muted">
          <p>
            Limit{" "}
            <span className="money font-medium text-ink-soft">
              {formatInr(limitPaisa)}
            </span>
          </p>
          <p>
            <span className="money font-medium text-ink-soft">
              {formatInr(outstandingPaisa)}
            </span>{" "}
            outstanding
          </p>
        </div>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-deep"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(usedRatio * 100)}
        aria-label="Credit used"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            low ? "bg-amber" : "bg-green",
          )}
          style={{ width: `${Math.max(3, usedRatio * 100)}%` }}
        />
      </div>
    </div>
  );
}
