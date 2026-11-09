"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  CircleAlert,
  LoaderCircle,
  MessageSquareText,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { postJson } from "@/lib/client/api";
import type { OrderDetail } from "@/lib/orders/types";

type ActionBody =
  | { action: "hold"; reason: string }
  | { action: "approve_credit"; reason?: string }
  | { action: "reject_credit"; reason?: string }
  | { action: "confirm" }
  | { action: "cancel"; reason?: string };

export function DeskOrderActions({ order }: { order: OrderDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showHold, setShowHold] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");

  const canConfirm =
    order.status === "pending" ||
    (order.status === "credit_hold" && order.creditStatus === "approved");
  const canApprove =
    order.status === "credit_hold" && order.creditStatus !== "approved";
  const canReject =
    order.status === "credit_hold" && order.creditStatus !== "rejected";
  const canHold = order.status === "pending";
  const canCancel = order.status !== "exported" && order.status !== "cancelled";
  const isClosed =
    order.status === "cancelled" ||
    order.status === "exported" ||
    order.status === "confirmed";

  async function run(body: ActionBody, successMessage: string) {
    setBusy(body.action);
    setError(null);
    setNotice(null);
    try {
      await postJson(`/api/desk/orders/${order.id}/action`, body);
      setNotice(successMessage);
      setShowHold(false);
      setShowCancel(false);
      setReason("");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The desk action could not be completed.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (order.status === "cancelled") {
    return (
      <div className="rounded-lg border border-line bg-paper/60 px-3.5 py-3 text-xs leading-relaxed text-ink-soft">
        This order was cancelled
        {order.creditReason ? `: ${order.creditReason}` : "."} Stock has been
        returned to the catalogue.
      </div>
    );
  }

  if (order.status === "exported") {
    return (
      <div className="rounded-lg border border-blue/20 bg-blue-soft px-3.5 py-3 text-xs leading-relaxed text-blue">
        This order is already exported to Tally. It cannot be edited or exported
        again.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red/20 bg-red-soft px-3 py-2 text-xs leading-relaxed text-red"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-green/20 bg-green-soft px-3 py-2 text-xs font-medium text-green-dark">
          {notice}
        </p>
      )}

      {canConfirm && (
        <button
          type="button"
          onClick={() => run({ action: "confirm" }, "Order confirmed.")}
          disabled={busy !== null}
          className="btn btn-primary w-full"
        >
          {busy === "confirm" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Confirm order
        </button>
      )}

      {order.status === "credit_hold" && order.creditStatus !== "approved" && (
        <div className="rounded-lg border border-amber/20 bg-amber-soft p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber">
            <CircleAlert className="h-3.5 w-3.5" /> Credit decision needed
          </p>
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-amber/85">
            Stock is reserved. Approve the hold to confirm the order, or reject
            it to release the stock.
          </p>
          {canApprove && canReject && (
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  run(
                    {
                      action: "approve_credit",
                      reason: reason.trim() || undefined,
                    },
                    "Credit approved. Confirm the order when ready.",
                  )
                }
                disabled={busy !== null}
                className="btn btn-primary h-9 min-h-9 px-2 text-xs"
              >
                {busy === "approve_credit" ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Approve
              </button>
              <button
                type="button"
                onClick={() =>
                  run(
                    {
                      action: "reject_credit",
                      reason: reason.trim() || undefined,
                    },
                    "Credit rejected and order cancelled.",
                  )
                }
                disabled={busy !== null}
                className="btn btn-danger h-9 min-h-9 px-2 text-xs"
              >
                {busy === "reject_credit" ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldX className="h-3.5 w-3.5" />
                )}
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {!canConfirm && order.status === "credit_hold" && (
        <p className="text-center text-[0.6875rem] text-ink-muted">
          {order.creditStatus === "approved"
            ? "Confirm the order when you are ready."
            : "Approve the credit hold before confirming."}
        </p>
      )}

      {canHold && (
        <div className="space-y-2">
          {!showHold ? (
            <button
              type="button"
              onClick={() => {
                setShowHold(true);
                setShowCancel(false);
              }}
              className="btn btn-secondary w-full"
            >
              <MessageSquareText className="h-4 w-4" /> Put on credit hold
            </button>
          ) : (
            <div className="rounded-lg border border-amber/25 bg-amber-soft p-3">
              <label
                htmlFor="hold-reason"
                className="text-xs font-medium text-amber"
              >
                Why does this order need a hold?
              </label>
              <textarea
                id="hold-reason"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value.slice(0, 300))
                }
                rows={2}
                className="field mt-1.5 min-h-16 text-xs"
                placeholder="For example: credit limit exceeded, waiting for owner approval."
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    run(
                      { action: "hold", reason: reason.trim() },
                      "Order placed on credit hold.",
                    )
                  }
                  disabled={busy !== null || reason.trim().length < 3}
                  className="btn btn-secondary h-9 min-h-9 flex-1 px-2 text-xs"
                >
                  {busy === "hold" ? "Holding…" : "Place hold"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowHold(false);
                    setReason("");
                  }}
                  className="btn btn-ghost h-9 min-h-9 px-2 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {canCancel && (
        <div className="space-y-2">
          {!showCancel ? (
            <button
              type="button"
              onClick={() => {
                setShowCancel(true);
                setShowHold(false);
              }}
              className="btn btn-ghost w-full text-xs text-red"
            >
              <Ban className="h-3.5 w-3.5" /> Cancel order
            </button>
          ) : (
            <div className="rounded-lg border border-red/20 bg-red-soft p-3">
              <p className="text-xs font-medium text-red">
                Cancel this order and release stock?
              </p>
              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value.slice(0, 300))
                }
                rows={2}
                className="field mt-1.5 min-h-16 text-xs"
                placeholder="Reason (optional)"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    run(
                      { action: "cancel", reason: reason.trim() || undefined },
                      "Order cancelled and stock released.",
                    )
                  }
                  disabled={busy !== null}
                  className="btn btn-danger h-9 min-h-9 flex-1 px-2 text-xs"
                >
                  {busy === "cancel" ? "Cancelling…" : "Yes, cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCancel(false);
                    setReason("");
                  }}
                  className="btn btn-ghost h-9 min-h-9 px-2 text-xs"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isClosed && order.status === "confirmed" && (
        <p className="text-center text-[0.6875rem] text-ink-muted">
          Confirmed. Use the Tally export panel, or cancel to release stock.
        </p>
      )}
    </div>
  );
}
