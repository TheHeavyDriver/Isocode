"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Gift,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  ShoppingBasket,
  Tag,
  Trash2,
} from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { postJson } from "@/lib/client/api";
import { formatInr } from "@/lib/pricing/money";
import type { CartPreview } from "@/lib/orders/pricing";
import type { CreatedOrder } from "@/lib/orders/types";
import { Packshot } from "@/components/retailer/packshot";
import { CreditStrip } from "@/components/retailer/credit-strip";
import { QuantityStepper } from "@/components/retailer/quantity-stepper";

const AI_CAPTURE_KEY = "sahaj.pending.capture";
const CART_SOURCE_KEY = "sahaj.cart.source";

const subscribeToHydration = () => () => {};

interface CartViewProps {
  retailer: {
    shopName: string;
    ownerName: string;
    creditLimitPaisa: number;
    outstandingPaisa: number;
    language: "hi" | "en";
  };
}

export function CartView({ retailer }: CartViewProps) {
  const cart = useCart();
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [preview, setPreview] = useState<CartPreview | null>(null);
  const [previewSignature, setPreviewSignature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiCaptureId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const fromUrl = new URLSearchParams(window.location.search).get(
        "capture",
      );
      if (fromUrl) {
        window.sessionStorage.setItem(AI_CAPTURE_KEY, fromUrl);
        return fromUrl;
      }
      return window.sessionStorage.getItem(AI_CAPTURE_KEY);
    } catch {
      return null;
    }
  });
  const [repeating] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(CART_SOURCE_KEY) === "repeat";
    } catch {
      return false;
    }
  });
  const idempotencyKey = useRef<string | null>(null);
  const attemptSignature = useRef("");
  const signature = JSON.stringify(cart.lines);
  const currentPreview = previewSignature === signature ? preview : null;
  const loading =
    hydrated && cart.lines.length > 0 && currentPreview === null && !error;

  useEffect(() => {
    if (!hydrated || cart.lines.length === 0) return;

    let cancelled = false;
    postJson<CartPreview>("/api/cart/preview", { lines: cart.lines })
      .then((data) => {
        if (cancelled) return;
        setPreview(data);
        setPreviewSignature(signature);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "We could not price your cart. Please try again.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [cart.lines, hydrated, refreshKey, signature]);

  const blockingWarnings =
    currentPreview?.warnings.filter(
      (warning) => warning.code !== "FREE_STOCK_CAPPED",
    ) ?? [];
  const hasBlockingWarning = blockingWarnings.length > 0;
  const canSubmit =
    Boolean(currentPreview) &&
    cart.lines.length > 0 &&
    !loading &&
    !hasBlockingWarning &&
    !submitting;

  const totalSavings = currentPreview
    ? currentPreview.totals.discountPaisa +
      currentPreview.totals.freeGoodsValuePaisa
    : 0;

  const freeLines = useMemo(
    () => currentPreview?.lines.filter((line) => line.isFree) ?? [],
    [currentPreview],
  );
  const paidLines = useMemo(
    () => currentPreview?.lines.filter((line) => !line.isFree) ?? [],
    [currentPreview],
  );

  async function submitOrder() {
    if (!currentPreview || !canSubmit) return;
    setSubmitError(null);
    setSubmitting(true);

    if (!idempotencyKey.current || attemptSignature.current !== signature) {
      idempotencyKey.current = crypto.randomUUID();
      attemptSignature.current = signature;
    }

    try {
      const result = await postJson<{ order: CreatedOrder }>("/api/orders", {
        lines: cart.lines,
        notes,
        source: aiCaptureId ? "ai" : repeating ? "repeat" : "manual",
        ...(aiCaptureId ? { aiCaptureId } : {}),
        idempotencyKey: idempotencyKey.current,
      });
      cart.clear();
      try {
        window.sessionStorage.removeItem(AI_CAPTURE_KEY);
        window.sessionStorage.removeItem(CART_SOURCE_KEY);
      } catch {
        // Nothing else is needed if storage is unavailable.
      }
      router.push(`/orders/${result.order.id}?placed=1`);
      router.refresh();
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error
          ? requestError.message
          : "We could not place the order. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (!hydrated) return <CartSkeleton />;

  if (cart.lines.length === 0) {
    return (
      <div className="card animate-rise px-6 py-14 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-deep text-ink-muted">
          <ShoppingBasket className="h-7 w-7" />
        </span>
        <h1 className="display mt-5 text-2xl">Your cart is empty.</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          Add cases from the shop, or paste a WhatsApp order and let AI suggest
          the lines.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/shop" className="btn btn-primary">
            Browse the catalogue <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/ai" className="btn btn-secondary">
            Paste an order
          </Link>
        </div>
      </div>
    );
  }

  if (loading && !currentPreview) return <CartSkeleton />;

  if (error) {
    return (
      <div className="card px-6 py-12 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-soft text-red">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="display mt-4 text-xl">We could not price your cart.</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setRefreshKey((key) => key + 1);
          }}
          className="btn btn-primary mt-5"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  if (!currentPreview) return <CartSkeleton />;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Review order</p>
          <h1 className="display mt-1 text-[1.75rem] leading-none sm:text-3xl">
            Your cart
          </h1>
          <p className="mt-1.5 text-xs text-ink-soft">
            {currentPreview.totals.paidCases} paid case
            {currentPreview.totals.paidCases === 1 ? "" : "s"}
            {currentPreview.totals.freeCases > 0
              ? ` · ${currentPreview.totals.freeCases} free`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            cart.clear();
            setNotes("");
          }}
          className="btn btn-ghost h-9 min-h-9 px-2 text-xs text-ink-muted"
        >
          Clear cart
        </button>
      </header>

      {hydrated && repeating && (
        <div className="flex items-start gap-2 rounded-xl border border-blue/20 bg-blue-soft px-3.5 py-3 text-xs leading-relaxed text-blue">
          <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            This cart repeats an earlier order. Free cases and prices are
            checked again at today&apos;s schemes before you place it.
          </p>
        </div>
      )}

      <CreditStrip
        limitPaisa={retailer.creditLimitPaisa}
        outstandingPaisa={retailer.outstandingPaisa}
      />

      {currentPreview.credit.exceedsLimit && (
        <div className="rounded-xl border border-amber/25 bg-amber-soft px-3.5 py-3 text-xs leading-relaxed text-amber">
          <p className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="h-3.5 w-3.5" /> This order will go on a
            credit hold
          </p>
          <p className="mt-1">
            The total {formatInr(currentPreview.totals.totalPaisa)} is above
            your available credit of{" "}
            {formatInr(currentPreview.credit.availablePaisa)}. The desk will
            approve or reject it before dispatch.
          </p>
        </div>
      )}

      {blockingWarnings.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red/20 bg-red-soft px-3.5 py-3 text-xs leading-relaxed text-red"
        >
          <p className="font-bold">Some lines need attention</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {blockingWarnings.map((warning, index) => (
              <li key={`${warning.code}-${warning.productId}-${index}`}>
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="card divide-y divide-line overflow-hidden">
        {paidLines.map((line) => {
          const meta = currentPreview.products[line.productId];
          return (
            <article key={`paid-${line.lineNo}`} className="flex gap-3 p-3.5">
              <div className="w-16 shrink-0 sm:w-20">
                {meta ? (
                  <Packshot product={meta} />
                ) : (
                  <div className="aspect-[4/5] rounded-xl bg-paper-deep" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                      {meta?.brandName ?? "Sahaj"}
                    </p>
                    <h2 className="mt-0.5 text-sm font-semibold leading-tight text-ink">
                      {line.name}
                    </h2>
                    <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
                      {line.caseSize} × {line.packSize} ·{" "}
                      {formatInr(line.unitPricePaisa)} per pack
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cart.remove(line.productId)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-red-soft hover:text-red"
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {line.schemeExplanation && (
                  <p className="mt-1.5 flex items-start gap-1 text-[0.6875rem] font-medium text-green-dark">
                    <Tag className="mt-0.5 h-3 w-3 shrink-0" />
                    {line.schemeExplanation}
                  </p>
                )}

                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <QuantityStepper
                    qty={line.qtyCases}
                    onChange={(next) => cart.setQty(line.productId, next)}
                    label="cases"
                    className="max-w-[9.5rem]"
                  />
                  <div className="text-right">
                    <p className="money text-sm font-bold">
                      {formatInr(line.lineTotalPaisa)}
                    </p>
                    {line.discountPaisa > 0 && (
                      <p className="text-[0.625rem] text-green-dark">
                        {formatInr(line.discountPaisa)} off
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {freeLines.length > 0 && (
        <section className="card overflow-hidden border-green/20 bg-green-soft/50">
          <div className="flex items-center gap-2 border-b border-green/15 px-4 py-3">
            <Gift className="h-4 w-4 text-green-dark" />
            <h2 className="text-sm font-bold text-green-dark">
              Free cases added
            </h2>
            <span className="pill ml-auto bg-surface text-green-dark">
              {currentPreview.totals.freeCases} free
            </span>
          </div>
          <ul className="divide-y divide-green/10">
            {freeLines.map((line) => (
              <li
                key={`free-${line.lineNo}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-green-dark">
                    {line.name}
                  </p>
                  <p className="text-[0.6875rem] text-green-dark/70">
                    {line.qtyCases} case{line.qtyCases === 1 ? "" : "s"} ·{" "}
                    {line.schemeExplanation}
                  </p>
                </div>
                <span className="money shrink-0 text-xs font-bold text-green-dark">
                  {formatInr(line.qtyCases * line.unitPricePaisa)} value
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {currentPreview.nudges.length > 0 && (
        <section className="card border-amber/20 bg-amber-soft/45 p-4">
          <h2 className="text-xs font-bold text-amber">Get the next scheme</h2>
          <ul className="mt-2 space-y-2">
            {currentPreview.nudges.map((nudge) => (
              <li
                key={nudge.schemeId}
                className="flex items-center justify-between gap-3"
              >
                <p className="text-xs leading-relaxed text-amber/90">
                  {nudge.message}
                </p>
                <button
                  type="button"
                  onClick={() => cart.add(nudge.productId, nudge.qtyToNext)}
                  className="btn btn-secondary h-8 min-h-8 shrink-0 px-2.5 text-[0.6875rem]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add {nudge.qtyToNext}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4">
        <h2 className="display text-lg">Order summary</h2>
        <dl className="mt-3 space-y-1.5 text-xs">
          <SummaryRow
            label="Subtotal"
            value={formatInr(currentPreview.totals.subtotalPaisa)}
          />
          <SummaryRow
            label="Scheme discount"
            value={
              currentPreview.totals.discountPaisa > 0
                ? `− ${formatInr(currentPreview.totals.discountPaisa)}`
                : formatInr(0)
            }
            green={currentPreview.totals.discountPaisa > 0}
          />
          <SummaryRow
            label="Free goods value"
            value={
              currentPreview.totals.freeGoodsValuePaisa > 0
                ? `− ${formatInr(currentPreview.totals.freeGoodsValuePaisa)}`
                : formatInr(0)
            }
            green={currentPreview.totals.freeGoodsValuePaisa > 0}
          />
          <div className="rule my-1.5" />
          <SummaryRow
            label="Taxable value"
            value={formatInr(currentPreview.totals.taxablePaisa)}
          />
          <SummaryRow
            label="GST"
            value={formatInr(currentPreview.totals.taxPaisa)}
          />
          <div className="rule my-1.5" />
          <div className="flex items-baseline justify-between gap-3 pt-1">
            <dt className="text-sm font-bold text-ink">Payable</dt>
            <dd className="money text-xl font-bold text-ink">
              {formatInr(currentPreview.totals.totalPaisa)}
            </dd>
          </div>
          {totalSavings > 0 && (
            <p className="text-right text-[0.6875rem] font-semibold text-green-dark">
              You save {formatInr(totalSavings)} on this order
            </p>
          )}
        </dl>
        <p className="mt-3 rounded-lg bg-paper/70 px-3 py-2 text-[0.6875rem] leading-relaxed text-ink-muted">
          Prices include GST unless the product says otherwise. The desk
          rechecks price, stock, schemes and credit before dispatch.
        </p>
      </section>

      <section className="card p-4">
        <label htmlFor="order-notes" className="label">
          Note for the desk{" "}
          <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <textarea
          id="order-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value.slice(0, 500))}
          rows={2}
          className="field min-h-20 resize-y"
          placeholder="Delivery instruction, substitute preference, or a note about this order."
        />
        <p className="mt-1 text-right text-[0.625rem] text-ink-muted">
          {notes.length}/500
        </p>
      </section>

      {submitError && (
        <div
          role="alert"
          className="rounded-xl border border-red/20 bg-red-soft px-3.5 py-3 text-xs text-red"
        >
          {submitError}
        </div>
      )}

      <button
        type="button"
        onClick={submitOrder}
        disabled={!canSubmit}
        className="btn btn-primary h-14 w-full text-base"
      >
        {submitting ? (
          <>
            <LoaderCircle className="h-5 w-5 animate-spin" /> Placing order…
          </>
        ) : (
          <>
            <Check className="h-5 w-5" /> Place order ·{" "}
            {formatInr(currentPreview.totals.totalPaisa)}
          </>
        )}
      </button>
      {!canSubmit && !submitting && hasBlockingWarning && (
        <p className="text-center text-xs text-red">
          Remove or reduce the unavailable lines to place the order.
        </p>
      )}
      {!canSubmit && loading && (
        <p className="text-center text-xs text-ink-muted">
          Checking live stock and schemes…
        </p>
      )}
      <p className="pb-2 text-center text-[0.625rem] leading-relaxed text-ink-muted">
        Placing the order reserves stock and sends it to the order desk. You can
        cancel while it is pending.
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd
        className={`money font-semibold ${green ? "text-green-dark" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading cart">
      <div className="space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-8 w-40" />
      </div>
      <div className="skeleton h-24 w-full rounded-2xl" />
      <div className="card divide-y divide-line overflow-hidden">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex gap-3 p-3.5">
            <div className="skeleton h-20 w-16 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-32" />
              <div className="skeleton mt-4 h-9 w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="skeleton h-40 w-full rounded-2xl" />
    </div>
  );
}
