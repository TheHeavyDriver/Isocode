"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, LoaderCircle, RotateCcw } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { postJson } from "@/lib/client/api";
import type { OrderDetail } from "@/lib/orders/types";

export function RetailerOrderActions({ order }: { order: OrderDetail }) {
  const cart = useCart();
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const cancellable =
    order.status === "pending" || order.status === "credit_hold";

  function repeatOrder() {
    cart.clear();
    for (const item of order.items) {
      if (!item.isFree) cart.add(item.productId, item.qtyCases);
    }
    try {
      window.sessionStorage.removeItem("sahaj.pending.capture");
      window.sessionStorage.setItem("sahaj.cart.source", "repeat");
    } catch {
      // The cart still works without session storage.
    }
    router.push("/cart");
  }

  async function cancelOrder() {
    setCancelling(true);
    setError(null);
    try {
      await postJson(`/api/orders/${order.id}/cancel`, {});
      setConfirming(false);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not cancel this order.",
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={repeatOrder}
          className="btn btn-secondary"
        >
          <RotateCcw className="h-4 w-4" /> Repeat this order
        </button>
        {cancellable && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={cancelling}
            className="btn btn-danger"
          >
            {cancelling ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            Cancel order
          </button>
        )}
      </div>

      {confirming && (
        <div className="rounded-lg border border-red/20 bg-red-soft p-3.5">
          <p className="text-sm font-medium text-red">
            Cancel {order.orderNo}?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-red/80">
            The reserved stock and free cases will return to the catalogue. This
            cannot be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={cancelOrder}
              disabled={cancelling}
              className="btn btn-danger h-9 min-h-9 px-3 text-xs"
            >
              {cancelling ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={cancelling}
              className="btn btn-ghost h-9 min-h-9 px-3 text-xs"
            >
              Keep order
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs font-medium text-red">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
