import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  Gift,
  MessageSquareText,
  PackageCheck,
  Search,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { requireDeskPage } from "@/lib/auth/session";
import { deskOrderCounts, listDeskOrders } from "@/lib/orders/service";
import {
  ORDER_SOURCE_LABELS,
  ORDER_STATUS_META,
  type OrderStatus,
} from "@/lib/orders/types";
import { formatInrCompact } from "@/lib/pricing/money";
import { formatDateIst, relativeAgeIst } from "@/lib/utils";
import {
  CreditStatusPill,
  OrderStatusPill,
} from "@/components/orders/status-pill";

export const metadata: Metadata = { title: "Order queue" };
export const dynamic = "force-dynamic";

const FILTERS: Array<{ value: "all" | OrderStatus; label: string }> = [
  { value: "all", label: "All orders" },
  { value: "pending", label: "Pending" },
  { value: "credit_hold", label: "Credit hold" },
  { value: "confirmed", label: "Confirmed" },
  { value: "exported", label: "Exported" },
  { value: "cancelled", label: "Cancelled" },
];

const DATE_FILTERS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
] as const;

function deskHref(input: {
  status: "all" | OrderStatus;
  q?: string;
  date?: "all" | "today" | "7d";
}): string {
  const params = new URLSearchParams();
  if (input.status !== "pending") params.set("status", input.status);
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.date && input.date !== "all") params.set("date", input.date);
  const query = params.toString();
  return query ? `/desk?${query}` : "/desk";
}

export default async function DeskQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; date?: string }>;
}) {
  await requireDeskPage();
  const raw = await searchParams;
  const status = FILTERS.some((filter) => filter.value === raw.status)
    ? (raw.status as "all" | OrderStatus)
    : "pending";
  const q = typeof raw.q === "string" ? raw.q.slice(0, 80) : "";
  const date = DATE_FILTERS.some((filter) => filter.value === raw.date)
    ? (raw.date as "all" | "today" | "7d")
    : "all";

  const [orders, counts] = await Promise.all([
    listDeskOrders({ status: status === "all" ? undefined : status, q, date }),
    deskOrderCounts(),
  ]);
  const needsAction = counts.pending + counts.credit_hold;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Order desk</p>
          <h1 className="display mt-1 text-[1.75rem] leading-none sm:text-3xl">
            Today&apos;s queue
          </h1>
          <p className="mt-1.5 text-xs text-ink-soft">
            {needsAction === 0
              ? "Nothing waiting for a desk decision."
              : `${needsAction} order${needsAction === 1 ? "" : "s"} need a decision`}
            {counts.confirmed > 0
              ? ` · ${counts.confirmed} confirmed waiting for Tally`
              : ""}
          </p>
        </div>
        <Link
          href="/desk/exports"
          className="btn btn-secondary h-9 min-h-9 px-3 text-xs"
        >
          <Truck className="h-3.5 w-3.5" /> Export log
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          label="Pending"
          value={counts.pending}
          tone="amber"
          icon={ClipboardList}
          href="/desk?status=pending"
        />
        <StatCard
          label="Credit hold"
          value={counts.credit_hold}
          tone="red"
          icon={CircleAlert}
          href="/desk?status=credit_hold"
        />
        <StatCard
          label="Confirmed"
          value={counts.confirmed}
          tone="green"
          icon={PackageCheck}
          href="/desk?status=confirmed"
        />
        <StatCard
          label="Exported"
          value={counts.exported}
          tone="blue"
          icon={Truck}
          href="/desk?status=exported"
        />
      </section>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
        {FILTERS.map((filter) => {
          const active = status === filter.value;
          const count =
            filter.value === "all"
              ? Object.values(counts).reduce((sum, value) => sum + value, 0)
              : counts[filter.value];
          return (
            <Link
              key={filter.value}
              href={deskHref({ status: filter.value, q, date })}
              aria-current={active ? "page" : undefined}
              className={[
                "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition",
                active
                  ? "border-green bg-green text-surface"
                  : "border-line-strong bg-surface text-ink-soft hover:border-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {filter.label}
              <span
                className={[
                  "rounded-full px-1.5 text-[0.625rem]",
                  active ? "bg-surface/15" : "bg-paper-deep text-ink-muted",
                ].join(" ")}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <form
        action="/desk"
        method="get"
        className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
      >
        {status !== "pending" && (
          <input type="hidden" name="status" value={status} />
        )}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Order no, shop, owner, or phone…"
            aria-label="Search orders"
            className="field h-10 min-h-10 pl-9 pr-9 text-xs"
          />
          {q && (
            <Link
              href={deskHref({ status, date })}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-paper hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <label className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          <select
            name="date"
            defaultValue={date}
            aria-label="Filter by date"
            className="field h-10 min-h-10 pl-9 pr-7 text-xs"
          >
            {DATE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary h-10 min-h-10 text-xs">
          Apply
        </button>
        {(q || date !== "all" || status !== "pending") && (
          <Link
            href="/desk"
            className="btn btn-ghost h-10 min-h-10 px-2 text-xs"
          >
            Reset
          </Link>
        )}
      </form>

      {orders.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-deep text-ink-muted">
            <ClipboardList className="h-7 w-7" />
          </span>
          <h2 className="display mt-5 text-xl">
            {q
              ? "No order matches that search."
              : status === "all"
                ? "No orders yet."
                : `No ${ORDER_STATUS_META[status as OrderStatus]?.short.toLowerCase() ?? "matching"} orders.`}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            {q
              ? `Try an order number, shop name, or phone number, or clear the filters.`
              : "Retailer orders appear here as soon as they are placed. Try another tab or date range."}
          </p>
          <Link href="/desk" className="btn btn-secondary mt-5">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {orders.map((order) => {
            const urgent =
              order.status === "pending" || order.status === "credit_hold";
            return (
              <Link
                key={order.id}
                href={`/desk/orders/${order.id}`}
                className={[
                  "card group block p-4 transition hover:border-line-strong hover:shadow-lift",
                  order.status === "credit_hold"
                    ? "border-red/25"
                    : order.status === "pending"
                      ? "border-amber/25"
                      : "",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="money text-sm font-bold">
                        {order.orderNo}
                      </span>
                      <OrderStatusPill status={order.status} short />
                      <CreditStatusPill status={order.creditStatus} />
                      {order.source === "ai" && (
                        <span className="pill bg-green-soft text-green-dark">
                          <Sparkles className="h-3 w-3" /> AI
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-ink-soft">
                      {order.shopName}{" "}
                      <span className="font-normal text-ink-muted">
                        · {order.ownerName}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[0.625rem] text-ink-muted">
                      {formatDateIst(order.createdAt)} ·{" "}
                      {relativeAgeIst(order.createdAt)} · {order.phone} ·{" "}
                      {ORDER_SOURCE_LABELS[order.source]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="money text-lg font-bold leading-none">
                      {formatInrCompact(order.totalPaisa)}
                    </p>
                    <p className="mt-1 text-[0.625rem] text-ink-muted">
                      {order.paidCases} paid
                      {order.freeCases > 0 ? ` · ${order.freeCases} free` : ""}
                    </p>
                  </div>
                </div>

                {(order.notes || order.creditReason) && (
                  <div className="mt-2.5 space-y-1 border-t border-line/70 pt-2">
                    {order.creditReason && (
                      <p className="flex items-start gap-1.5 text-[0.6875rem] leading-relaxed text-red">
                        <CircleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                        {order.creditReason}
                      </p>
                    )}
                    {order.notes && (
                      <p className="flex items-start gap-1.5 text-[0.6875rem] leading-relaxed text-ink-soft">
                        <MessageSquareText className="mt-0.5 h-3 w-3 shrink-0" />
                        {order.notes}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between border-t border-line/70 pt-2 text-[0.6875rem]">
                  <span className="flex items-center gap-2 text-ink-muted">
                    {order.freeCases > 0 && (
                      <span className="flex items-center gap-1 text-green-dark">
                        <Gift className="h-3 w-3" /> {order.freeCases} free
                      </span>
                    )}
                    {urgent && (
                      <span className="flex items-center gap-1 font-semibold text-amber">
                        <CircleAlert className="h-3 w-3" /> Needs a decision
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-green">
                    Open order <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  tone: "amber" | "red" | "green" | "blue";
  icon: typeof ClipboardList;
  href: string;
}) {
  const toneClass = {
    amber: "text-amber bg-amber-soft",
    red: "text-red bg-red-soft",
    green: "text-green-dark bg-green-soft",
    blue: "text-blue bg-blue-soft",
  }[tone];

  return (
    <Link
      href={href}
      className="card flex items-center gap-2.5 p-3 transition hover:border-line-strong"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClass}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          {label}
        </span>
        <span className="money block text-lg font-bold leading-tight">
          {value}
        </span>
      </span>
    </Link>
  );
}
