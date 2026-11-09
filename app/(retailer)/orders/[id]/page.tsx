import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Clock3,
  FileCheck2,
  Gift,
  MessageSquareText,
  PackageCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { requireRetailerPage } from "@/lib/auth/session";
import { getOrderDetail } from "@/lib/orders/service";
import { ApiError } from "@/lib/http/api-error";
import {
  ORDER_SOURCE_LABELS,
  type OrderDetail,
  type OrderStatus,
} from "@/lib/orders/types";
import { formatInr, percentFromBp } from "@/lib/pricing/money";
import { formatDateIst } from "@/lib/utils";
import { CreditStrip } from "@/components/retailer/credit-strip";
import {
  OrderStatusPill,
  CreditStatusPill,
} from "@/components/orders/status-pill";
import { RetailerOrderActions } from "@/components/retailer/order-actions";

export const metadata: Metadata = { title: "Order" };
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const session = await requireRetailerPage();
  const { id } = await params;
  const query = await searchParams;

  let order: OrderDetail;
  try {
    order = await getOrderDetail(id, { retailerId: session.retailer.id });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const paidItems = order.items.filter((item) => !item.isFree);
  const freeItems = order.items.filter((item) => item.isFree);
  const savings =
    order.discountPaisa +
    freeItems.reduce(
      (sum, item) => sum + item.qtyCases * item.unitPricePaisa,
      0,
    );

  return (
    <div className="space-y-4">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All orders
      </Link>

      {query.placed === "1" && (
        <div className="animate-rise rounded-xl border border-green/20 bg-green-soft px-4 py-3.5">
          <p className="flex items-center gap-2 text-sm font-medium text-green-dark">
            <Check className="h-4 w-4" /> Order placed
          </p>
          <p className="mt-1 text-xs leading-relaxed text-green-dark/80">
            {order.status === "credit_hold"
              ? "Your order is with the desk, but it is above your available credit. The desk will approve or reject the hold before dispatch."
              : "Your order has reached the order desk. You will see the status change here as the desk checks and confirms it."}
          </p>
        </div>
      )}

      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Order</p>
            <h1 className="money font-display mt-2 text-[1.9rem] font-medium leading-none tracking-tight">
              {order.orderNo}
            </h1>
            <p className="mt-2 text-xs text-ink-muted">
              {formatDateIst(order.createdAt)} ·{" "}
              {ORDER_SOURCE_LABELS[order.source]}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <OrderStatusPill status={order.status} />
            <CreditStatusPill status={order.creditStatus} />
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3.5">
          <div>
            <p className="text-[0.6875rem] text-ink-muted">Payable total</p>
            <p className="money font-display mt-1 text-[1.9rem] font-medium leading-none">
              {formatInr(order.totalPaisa)}
            </p>
          </div>
          <div className="text-right text-[0.6875rem] leading-relaxed text-ink-muted">
            <p>
              {order.paidCases} paid case{order.paidCases === 1 ? "" : "s"}
            </p>
            <p>
              {order.freeCases} free case{order.freeCases === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {savings > 0 && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-green-soft px-2.5 py-1 text-[0.6875rem] font-medium text-green-dark">
            <Gift className="h-3 w-3" strokeWidth={1.7} /> Saved{" "}
            {formatInr(savings)} on this order
          </p>
        )}
      </header>

      <OrderTimeline order={order} />

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="display text-lg font-medium">Items</h2>
          <span className="text-[0.6875rem] text-ink-muted">
            {paidItems.length} product{paidItems.length === 1 ? "" : "s"}
          </span>
        </div>
        <ul className="divide-y divide-line">
          {paidItems.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {item.productName}
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
                    {item.skuCode} · {item.qtyCases} case
                    {item.qtyCases === 1 ? "" : "s"} ·{" "}
                    {formatInr(item.unitPricePaisa)} / case
                  </p>
                </div>
                <p className="money font-display shrink-0 text-sm font-medium">
                  {formatInr(item.lineTotalPaisa)}
                </p>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.625rem] text-ink-muted">
                <span>Taxable {formatInr(item.taxablePaisa)}</span>
                <span>
                  GST {percentFromBp(item.gstRateBp)} {formatInr(item.taxPaisa)}
                </span>
                {item.discountPaisa > 0 && (
                  <span className="text-green-dark">
                    Scheme − {formatInr(item.discountPaisa)}
                  </span>
                )}
              </div>
              {item.schemeExplanation && (
                <p className="mt-1.5 rounded-md bg-green-soft/70 px-2.5 py-1.5 text-[0.6875rem] leading-relaxed text-green-dark">
                  {item.schemeExplanation}
                </p>
              )}
            </li>
          ))}
        </ul>

        {freeItems.length > 0 && (
          <div className="border-t border-green/15 bg-green-soft/40 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-green-dark">
              <Gift className="h-3.5 w-3.5" strokeWidth={1.7} /> Free cases
            </p>
            <ul className="mt-1.5 space-y-1">
              {freeItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 text-[0.6875rem] text-green-dark"
                >
                  <span>
                    {item.productName} · {item.qtyCases} case
                    {item.qtyCases === 1 ? "" : "s"}
                  </span>
                  <span className="money font-medium">
                    {formatInr(item.qtyCases * item.unitPricePaisa)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <h2 className="display text-lg font-medium">Payment summary</h2>
          <dl className="mt-3 space-y-1.5 text-xs">
            <Row label="Subtotal" value={formatInr(order.subtotalPaisa)} />
            <Row
              label="Scheme discount"
              value={`− ${formatInr(order.discountPaisa)}`}
              green={order.discountPaisa > 0}
            />
            <Row label="Taxable value" value={formatInr(order.taxablePaisa)} />
            <Row label="GST" value={formatInr(order.taxPaisa)} />
            <div className="rule my-1" />
            <div className="flex items-baseline justify-between gap-3 pt-0.5">
              <dt className="text-sm font-medium">Total</dt>
              <dd className="money font-display text-lg font-medium">
                {formatInr(order.totalPaisa)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[0.625rem] leading-relaxed text-ink-muted">
            Dealer prices are GST-inclusive by default. Your invoice comes from
            Tally after the desk confirms the order.
          </p>
        </div>

        <div className="space-y-3">
          <CreditStrip
            limitPaisa={order.creditLimitPaisa}
            outstandingPaisa={order.outstandingPaisa}
          />
          {order.creditReason && (
            <p className="rounded-lg border border-amber/20 bg-amber-soft px-3 py-2.5 text-[0.6875rem] leading-relaxed text-amber">
              <span className="font-medium">Credit note:</span>{" "}
              {order.creditReason}
            </p>
          )}
          {order.notes && (
            <div className="card p-3.5">
              <p className="eyebrow">Note for the desk</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                {order.notes}
              </p>
            </div>
          )}
        </div>
      </section>

      {order.capture && (
        <section className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="display flex items-center gap-2 text-lg font-medium">
              <Sparkles className="h-4 w-4 text-green" strokeWidth={1.7} /> AI
              capture
            </h2>
            <span className="pill bg-paper-deep text-ink-muted">
              {order.capture.model}
            </span>
          </div>
          <p className="mt-2 rounded-md bg-paper/70 px-3 py-2.5 text-xs italic leading-relaxed text-ink-soft">
            “{order.capture.rawText}”
          </p>
          <ul className="mt-2 space-y-1.5">
            {order.capture.lines.map((line) => (
              <li
                key={line.id}
                className="flex items-start justify-between gap-3 rounded-md border border-line px-2.5 py-2 text-[0.6875rem]"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{line.rawText}</p>
                  <p className="text-ink-muted">
                    {line.productName ?? "Unmatched"}
                    {line.qty
                      ? ` · ${line.qty} ${line.unit === "case" ? "case" : line.unit === "piece" ? "piece" : "unit unclear"}`
                      : " · quantity unclear"}
                    {line.resolution === "removed" ? " · removed" : ""}
                  </p>
                </div>
                <span className="shrink-0 font-medium text-ink-muted">
                  {Math.round(line.confidenceBp / 100)}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.625rem] leading-relaxed text-ink-muted">
            AI only suggested these lines. The order was placed after a person
            reviewed and confirmed them.
          </p>
        </section>
      )}

      <section className="card p-4">
        <h2 className="display text-lg font-medium">Activity</h2>
        <ul className="mt-2.5 space-y-2">
          {order.audit.length === 0 ? (
            <li className="text-xs text-ink-muted">
              No activity recorded yet.
            </li>
          ) : (
            order.audit.map((entry) => (
              <li key={entry.id} className="flex gap-2 text-[0.6875rem]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green" />
                <div>
                  <p className="font-medium text-ink-soft">
                    {auditLabel(entry.action)}
                  </p>
                  <p className="text-ink-muted">
                    {entry.actorName ? `${entry.actorName} · ` : ""}
                    {formatDateIst(entry.createdAt)}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <RetailerOrderActions order={order} />

      <div className="flex items-center justify-center gap-1.5 pb-2 text-center text-[0.625rem] text-ink-muted">
        <Store className="h-3 w-3" /> {order.shopName}
      </div>
    </div>
  );
}

function Row({
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
        className={`money font-medium ${green ? "text-green-dark" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function auditLabel(action: string): string {
  if (action === "order.created") return "Order placed";
  if (action === "order.created.credit_hold")
    return "Order placed on credit hold";
  if (action === "order.credit_hold") return "Desk placed the order on hold";
  if (action === "order.credit_approved")
    return "Desk approved the credit hold";
  if (action === "order.credit_rejected")
    return "Desk rejected the credit hold";
  if (action === "order.confirmed") return "Desk confirmed the order";
  if (action === "order.exported") return "Order exported to Tally";
  if (action === "order.cancelled") return "Order cancelled";
  if (action === "ai.capture.accepted")
    return "AI lines reviewed and confirmed";
  return action.replaceAll(".", " ");
}

const TIMELINE: Array<{
  status: OrderStatus;
  label: string;
  detail: string;
  icon: typeof Clock3;
}> = [
  {
    status: "pending",
    label: "Placed",
    detail: "Order received and stock reserved.",
    icon: Clock3,
  },
  {
    status: "credit_hold",
    label: "Desk review",
    detail: "The desk checks lines, credit, and schemes.",
    icon: CircleAlert,
  },
  {
    status: "confirmed",
    label: "Confirmed",
    detail: "Ready for dispatch and the Tally invoice.",
    icon: PackageCheck,
  },
  {
    status: "exported",
    label: "Sent to Tally",
    detail: "Invoice data exported for the office.",
    icon: Truck,
  },
];

function timelineState(order: OrderDetail) {
  if (order.status === "cancelled") {
    return { activeIndex: 0, cancelled: true };
  }
  if (order.status === "exported") return { activeIndex: 3, cancelled: false };
  if (order.status === "confirmed") return { activeIndex: 2, cancelled: false };
  if (order.status === "credit_hold")
    return { activeIndex: 1, cancelled: false };
  return { activeIndex: 0, cancelled: false };
}

function OrderTimeline({ order }: { order: OrderDetail }) {
  const state = timelineState(order);

  return (
    <section className="card p-4">
      <h2 className="display text-lg font-medium">Progress</h2>
      {state.cancelled ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-soft px-3 py-2.5 text-xs text-red">
          <CircleAlert className="h-4 w-4" strokeWidth={1.7} /> This order was
          cancelled
          {order.cancelledAt ? ` on ${formatDateIst(order.cancelledAt)}` : ""}.
          Stock has been returned.
        </div>
      ) : (
        <ol className="mt-3 space-y-3">
          {TIMELINE.map((step, index) => {
            const Icon = step.icon;
            const done = index < state.activeIndex;
            const active = index === state.activeIndex;
            return (
              <li key={step.status} className="flex gap-2.5">
                <span
                  className={[
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                    done
                      ? "border-green bg-green text-surface"
                      : active
                        ? "border-green bg-green-soft text-green-dark"
                        : "border-line bg-paper text-ink-muted",
                  ].join(" ")}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={[
                      "text-xs font-medium",
                      active || done ? "text-ink" : "text-ink-muted",
                    ].join(" ")}
                  >
                    {step.label}
                  </p>
                  <p className="text-[0.6875rem] leading-relaxed text-ink-muted">
                    {step.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {order.status === "exported" && (
        <p className="mt-3 flex items-center gap-1.5 rounded-md bg-blue-soft px-2.5 py-2 text-[0.6875rem] text-blue">
          <FileCheck2 className="h-3.5 w-3.5" /> Exported
          {order.exportedAt ? ` ${formatDateIst(order.exportedAt)}` : ""}
        </p>
      )}
      {order.status === "credit_hold" && order.creditStatus !== "approved" && (
        <p className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-soft px-2.5 py-2 text-[0.6875rem] text-amber">
          <MessageSquareText className="h-3.5 w-3.5" /> Waiting for a credit
          decision from the desk.
        </p>
      )}
    </section>
  );
}
