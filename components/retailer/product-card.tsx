"use client";

import { useRef } from "react";
import { Plus, Tag, X } from "lucide-react";
import type { CatalogueProduct } from "@/lib/catalogue/types";
import { useCart } from "@/lib/cart/store";
import { formatInr, percentFromBp } from "@/lib/pricing/money";
import { formatDateIst } from "@/lib/utils";
import { Packshot } from "@/components/retailer/packshot";
import { QuantityStepper } from "@/components/retailer/quantity-stepper";
import { SchemeBadge, StockPill } from "@/components/retailer/stock-pill";

export function ProductCard({ product }: { product: CatalogueProduct }) {
  const cart = useCart();
  const qty = cart.qtyFor(product.id);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const outOfStock = product.stockStatus === "out";
  const gstLabel = product.priceIncludesGst
    ? `Incl. GST @${percentFromBp(product.gstRateBp)}`
    : `+ GST @${percentFromBp(product.gstRateBp)}`;

  function openDetails() {
    dialogRef.current?.showModal();
  }

  function changeQty(next: number) {
    cart.setQty(product.id, next);
  }

  return (
    <>
      <article className="group flex min-w-0 flex-col">
        <button
          type="button"
          onClick={openDetails}
          className="block w-full text-left"
          aria-haspopup="dialog"
          aria-label={`View ${product.name}`}
        >
          <div className="relative">
            <Packshot product={product} />
            {(product.stockStatus === "low" || outOfStock) && (
              <div className="absolute left-2 top-2">
                <StockPill
                  status={product.stockStatus}
                  stockCases={product.stockCases}
                  className="shadow-sm"
                />
              </div>
            )}
            {product.scheme && (
              <div className="absolute bottom-2 left-2 right-2">
                <SchemeBadge
                  label={product.scheme.label}
                  className="w-full justify-center bg-green text-surface"
                />
              </div>
            )}
          </div>
        </button>

        <div className="mt-2 flex flex-1 flex-col">
          <p className="truncate text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {product.brandName}
          </p>
          <button
            type="button"
            onClick={openDetails}
            className="mt-0.5 text-left"
            aria-haspopup="dialog"
          >
            <h3 className="line-clamp-2 min-h-[2.3rem] text-[0.8125rem] font-semibold leading-tight text-ink">
              {product.name}
            </h3>
          </button>
          <p className="mt-0.5 text-[0.625rem] text-ink-muted">
            {product.caseSize} × {product.packSize} per case
          </p>

          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="money text-[1.05rem] font-bold leading-none text-ink">
              {formatInr(product.casePricePaisa)}
            </span>
            <span className="text-[0.5625rem] font-medium uppercase tracking-[0.06em] text-ink-muted">
              /case
            </span>
          </div>
          <p className="mt-0.5 text-[0.625rem] text-ink-muted">
            {formatInr(product.pricePerPackPaisa)} / {product.packUnit} ·{" "}
            {gstLabel}
          </p>
          {product.isRetailerPrice && (
            <p className="mt-0.5 text-[0.5625rem] font-semibold text-green">
              Your shop price
            </p>
          )}

          <div className="mt-auto pt-2">
            {outOfStock ? (
              <button
                type="button"
                disabled
                className="btn btn-secondary w-full text-xs"
                title="This product is out of stock. Remove it or choose another."
              >
                Out of stock
              </button>
            ) : qty > 0 ? (
              <QuantityStepper
                qty={qty}
                onChange={changeQty}
                label="cases"
                className="min-h-10"
              />
            ) : (
              <button
                type="button"
                onClick={() => cart.add(product.id, 1)}
                className="btn btn-primary w-full px-2 text-xs"
              >
                <Plus className="h-4 w-4" /> Add case
              </button>
            )}
          </div>
        </div>
      </article>

      <dialog
        ref={dialogRef}
        aria-labelledby={`product-title-${product.id}`}
        className="m-auto max-h-[92dvh] w-[calc(100%-1.25rem)] max-w-3xl overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-lift backdrop:bg-ink/45 backdrop:backdrop-blur-[2px]"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.close();
          }
        }}
      >
        <div className="relative grid gap-0 sm:grid-cols-[0.9fr_1.1fr]">
          <div className="p-4 sm:p-5">
            <Packshot product={product} size="large" />
          </div>

          <div className="p-5 pt-0 sm:py-5 sm:pl-0 sm:pr-6">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">
                {product.brandName} · {product.categoryName}
              </p>
              <form method="dialog">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition hover:bg-paper hover:text-ink"
                  aria-label="Close product details"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            </div>

            <h2
              id={`product-title-${product.id}`}
              className="display mt-2 text-2xl leading-tight"
            >
              {product.name}
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              {product.skuCode} · 1 case = {product.caseSize} ×{" "}
              {product.packSize}
            </p>

            <div className="mt-4 rounded-xl border border-line bg-paper/55 p-3.5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="money text-2xl font-bold leading-none">
                    {formatInr(product.casePricePaisa)}
                  </p>
                  <p className="mt-1 text-[0.6875rem] text-ink-muted">
                    per case · {formatInr(product.pricePerPackPaisa)} per{" "}
                    {product.packUnit}
                  </p>
                </div>
                <span className="pill bg-surface text-ink-soft">
                  {gstLabel}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                <StockPill
                  status={product.stockStatus}
                  stockCases={product.stockCases}
                  showInStock
                />
                <span className="text-[0.6875rem] text-ink-muted">
                  {product.stockCases} case
                  {product.stockCases === 1 ? "" : "s"} available
                </span>
              </div>
            </div>

            {product.scheme ? (
              <div className="mt-3 rounded-xl border border-green/15 bg-green-soft p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-bold text-green-dark">
                  <Tag className="h-3.5 w-3.5" /> {product.scheme.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-green-dark/80">
                  {product.scheme.terms}
                </p>
                {product.scheme.endsAt && (
                  <p className="mt-1 text-[0.6875rem] font-medium text-green-dark/60">
                    Ends {formatDateIst(product.scheme.endsAt, false)}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-line bg-paper/40 px-3.5 py-3 text-xs text-ink-muted">
                No active scheme on this product right now.
              </p>
            )}

            {outOfStock ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-soft px-3.5 py-3 text-sm text-red">
                This product cannot be ordered until stock arrives. Choose
                another pack or remove it from an AI capture.
              </div>
            ) : (
              <div className="mt-4">
                {qty > 0 ? (
                  <QuantityStepper
                    qty={qty}
                    onChange={changeQty}
                    label="cases"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => cart.add(product.id, 1)}
                    className="btn btn-primary w-full"
                  >
                    <Plus className="h-4 w-4" /> Add one case
                  </button>
                )}
              </div>
            )}

            <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
              Schemes and stock are checked again at checkout. Free cases are
              added automatically, subject to free stock.
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
