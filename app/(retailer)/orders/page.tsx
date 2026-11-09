import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Gift,
  MessageSquareText,
  Store,
} from "lucide-react";
import { requireRetailerPage } from "@/lib/auth/session";
import { listRetailerOrders } from "@/lib/orders/service";
import {
  ORDER_SOURCE_LABELS,
  ORDER_STATUS_META,
  type OrderStatus,
} from "@/lib/orders/types";
import { formatInr } from "@/lib/pricing/money";
import { formatDateIst } from "@/lib/utils";
import { OrderStatusPill } from "@/components/orders/status-pill";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const FILTERS: Array<{ value: "all" | OrderStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "credit_hold", label: "Credit hold" },
  { value: "confirmed", label: "Confirmed" },
  { value: "exported", label: "Exported" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireRetailerPage();
  const raw = await searchParams;
  const status = FILTERS.some((filter) => filter.value === raw.status)
    ? (raw.status as "all" | OrderStatus)
    : "all";

  const orders = await listRetailerOrders(session.retailer.id);
  const counts = orders.reduce<Record<string, number>>((accumulator, order) => {
    accumulator[order.status] = (accumulator[order.status] ?? 0) + 1;
    return accumulator;
  }, {});
  const filtered =
    status === "all"
      ? orders
      : orders.filter((order) => order.status === status);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Order history</p>
          <h1 className="display mt-2 text-[2rem] leading-[1.02] sm:text-[2.6rem]">
            Your orders
          </h1>
          <p className="mt-2 text-xs text-ink-soft">
            {orders.length} order{orders.length === 1 ? "" : "s"} placed from{" "}
            {session.retailer.shopName}
          </p>
        </div>
        <Link
          href="/shop"
          className="btn btn-secondary h-9 min-h-9 px-3 text-xs"
        >
          <Store className="h-3.5 w-3.5" /> Shop
        </Link>
      </header>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
        {FILTERS.map((filter) => {
          const active = status === filter.value;
          const count =
            filter.value === "all"
              ? orders.length
              : (counts[filter.value] ?? 0);
          return (
            <Link
              key={filter.value}
              href={
                filter.value === "all"
                  ? "/orders"
                  : `/orders?status=${filter.value}`
              }
              aria-current={active ? "page" : undefined}
              className={[
                "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-3.5 text-xs font-medium transition",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line-strong bg-surface text-ink-soft hover:border-ink/30 hover:text-ink",
              ].join(" ")}
            >
              {filter.label}
              <span
                className={[
                  "rounded-full px-1.5 text-[0.625rem]",
                  active ? "bg-white/15" : "bg-paper-deep text-ink-muted",
                ].join(" ")}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-paper-deep text-ink-muted">
            <ClipboardList className="h-7 w-7" strokeWidth={1.6} />
          </span>
          <h2 className="display mt-5 text-[1.6rem] leading-tight">
            {orders.length === 0 ? "No orders yet." : "Nothing in this status."}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            {orders.length === 0
              ? "Your orders will appear here once placed."
              : `No ${ORDER_STATUS_META[status as OrderStatus]?.short.toLowerCase() ?? ""} orders. Try another tab.`}
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/shop" className="btn btn-primary">
              Browse the catalogue
            </Link>
            <Link href="/ai" className="btn btn-secondary">
              <MessageSquareText className="h-4 w-4" /> Paste an order
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="card group block p-4 transition hover:border-line-strong hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="money font-display text-sm font-medium text-ink">
                      {order.orderNo}
                    </span>
                    <OrderStatusPill status={order.status} short />
                  </div>
                  <p className="mt-1.5 text-[0.6875rem] text-ink-muted">
                    {formatDateIst(order.createdAt)} ·{" "}
                    {ORDER_SOURCE_LABELS[order.source]}
                  </p>
                </div>
                <p className="money font-display shrink-0 text-right text-base font-medium">
                  {formatInr(order.totalPaisa)}
                </p>
              </div>

              <div className="mt-3 flex items-center gap-3 border-t border-line pt-2.5 text-[0.6875rem] text-ink-soft">
                <span>
                  {order.paidCases} paid case{order.paidCases === 1 ? "" : "s"}
                </span>
                {order.freeCases > 0 && (
                  <span className="flex items-center gap-1 text-green-dark">
                    <Gift className="h-3 w-3" strokeWidth={1.7} />{" "}
                    {order.freeCases} free
                  </span>
                )}
                {order.creditStatus === "hold" && (
                  <span className="text-amber">Credit hold</span>
                )}
                <span className="ml-auto flex items-center gap-1 font-medium text-green">
                  View <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
