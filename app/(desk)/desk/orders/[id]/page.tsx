import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CircleAlert,
  FileCheck2,
  FileDown,
  Gift,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Phone,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";
import { requireDeskPage } from "@/lib/auth/session";
import { getOrderForDesk } from "@/lib/orders/service";
import { getExportForOrder } from "@/lib/exports/service";
import { ApiError } from "@/lib/http/api-error";
import { ORDER_SOURCE_LABELS, type OrderDetail } from "@/lib/orders/types";
import { formatInr, percentFromBp } from "@/lib/pricing/money";
import { formatDateIst } from "@/lib/utils";
import { CreditStrip } from "@/components/retailer/credit-strip";
import { OrderStatusPill } from "@/components/orders/status-pill";
import { DeskOrderActions } from "@/components/desk/desk-order-actions";
import { OrderExportPanel } from "@/components/desk/order-export-panel";

export const metadata: Metadata = { title: "Desk order" };
export const dynamic = "force-dynamic";

export default async function DeskOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireDeskPage();
  const { id } = await params;

  let order: OrderDetail;
  try {
    order = await getOrderForDesk(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const exportRecord =
    order.status === "exported" || order.status === "confirmed"
      ? await getExportForOrder(order.id)
      : null;

  const freeItems = order.items.filter((item) => item.isFree);
  const availableCredit = Math.max(
    0,
    order.creditLimitPaisa - order.outstandingPaisa,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/desk"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
        </Link>
        <p className="text-[0.625rem] text-ink-muted">
          Desk view · every action is written to the audit trail
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_21rem] lg:items-start">
        <div className="space-y-4">
          <header className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Order</p>
                <h1 className="money mt-1 text-2xl font-bold tracking-tight">
                  {order.orderNo}
                </h1>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatDateIst(order.createdAt)} ·{" "}
                  {ORDER_SOURCE_LABELS[order.source]} · {order.paidCases} paid
                  case{order.paidCases === 1 ? "" : "s"}
                  {order.freeCases > 0 ? ` · ${order.freeCases} free` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <OrderStatusPill status={order.status} />
                {order.creditStatus !== "ok" && (
                  <span
                    className={[
                      "pill font-semibold",
                      order.creditStatus === "approved"
                        ? "bg-green-soft text-green-dark"
                        : order.creditStatus === "rejected"
                          ? "bg-red-soft text-red"
                          : "bg-amber-soft text-amber",
                    ].join(" ")}
                  >
                    Credit {order.creditStatus}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
              <div>
                <p className="text-[0.625rem] text-ink-muted">Payable total</p>
                <p className="money text-2xl font-bold leading-none">
                  {formatInr(order.totalPaisa)}
                </p>
              </div>
              <div>
                <p className="text-[0.625rem] text-ink-muted">GST included</p>
                <p className="money mt-0.5 text-sm font-semibold">
                  {formatInr(order.taxPaisa)}
                </p>
                <p className="text-[0.625rem] text-ink-muted">
                  Taxable {formatInr(order.taxablePaisa)}
                </p>
              </div>
              <div>
                <p className="text-[0.625rem] text-ink-muted">Scheme savings</p>
                <p className="money mt-0.5 text-sm font-semibold text-green-dark">
                  {formatInr(order.discountPaisa)}
                </p>
                <p className="text-[0.625rem] text-ink-muted">
                  Free goods value{" "}
                  {formatInr(
                    freeItems.reduce(
                      (sum, item) => sum + item.qtyCases * item.unitPricePaisa,
                      0,
                    ),
                  )}
                </p>
              </div>
            </div>

            {order.creditReason && (
              <p
                className={[
                  "mt-3 flex items-start gap-1.5 rounded-xl px-3 py-2.5 text-[0.6875rem] leading-relaxed",
                  order.creditStatus === "approved"
                    ? "bg-green-soft text-green-dark"
                    : "bg-red-soft text-red",
                ].join(" ")}
              >
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {order.creditReason}
              </p>
            )}
            {order.notes && (
              <div className="mt-3 rounded-xl bg-paper/70 px-3 py-2.5">
                <p className="eyebrow">Note from the retailer</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {order.notes}
                </p>
              </div>
            )}
          </header>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="display text-lg">Lines</h2>
              <span className="text-[0.6875rem] text-ink-muted">
                {order.items.length} line{order.items.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-xs">
                <thead className="bg-paper/50 text-[0.625rem] uppercase tracking-[0.06em] text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Product</th>
                    <th className="px-2 py-2 text-right font-semibold">
                      Cases
                    </th>
                    <th className="px-2 py-2 text-right font-semibold">Rate</th>
                    <th className="px-2 py-2 text-right font-semibold">
                      Disc.
                    </th>
                    <th className="px-2 py-2 text-right font-semibold">GST</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {order.items.map((item) => (
                    <tr
                      key={item.id}
                      className={item.isFree ? "bg-green-soft/35" : undefined}
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-ink">
                          {item.productName}
                          {item.isFree && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-green-soft px-1.5 py-0.5 text-[0.5625rem] font-bold text-green-dark">
                              <Gift className="h-2.5 w-2.5" /> Free
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[0.625rem] text-ink-muted">
                          {item.skuCode} · {item.packSize} · line {item.lineNo}
                        </p>
                        {item.schemeExplanation && (
                          <p className="mt-0.5 text-[0.625rem] text-green-dark">
                            {item.schemeExplanation}
                          </p>
                        )}
                      </td>
                      <td className="money px-2 py-2.5 text-right font-semibold">
                        {item.qtyCases}
                      </td>
                      <td className="money px-2 py-2.5 text-right text-ink-soft">
                        {item.isFree ? "Free" : formatInr(item.unitPricePaisa)}
                      </td>
                      <td className="money px-2 py-2.5 text-right text-green-dark">
                        {item.discountPaisa > 0
                          ? `− ${formatInr(item.discountPaisa)}`
                          : "—"}
                      </td>
                      <td className="money px-2 py-2.5 text-right text-ink-muted">
                        {percentFromBp(item.gstRateBp)}
                        <br />
                        {formatInr(item.taxPaisa)}
                      </td>
                      <td className="money px-3 py-2.5 text-right font-bold">
                        {item.isFree ? "₹0.00" : formatInr(item.lineTotalPaisa)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-line bg-paper/45 text-[0.6875rem]">
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-2 text-right text-ink-muted"
                    >
                      Subtotal
                    </td>
                    <td className="money px-3 py-2 text-right">
                      {formatInr(order.subtotalPaisa)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-1 text-right text-ink-muted"
                    >
                      Scheme discount
                    </td>
                    <td className="money px-3 py-1 text-right text-green-dark">
                      − {formatInr(order.discountPaisa)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-1 text-right text-ink-muted"
                    >
                      Taxable value
                    </td>
                    <td className="money px-3 py-1 text-right">
                      {formatInr(order.taxablePaisa)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-1 text-right text-ink-muted"
                    >
                      GST
                    </td>
                    <td className="money px-3 py-1 text-right">
                      {formatInr(order.taxPaisa)}
                    </td>
                  </tr>
                  <tr className="text-sm">
                    <td colSpan={5} className="px-3 py-2 text-right font-bold">
                      Payable
                    </td>
                    <td className="money px-3 py-2 text-right font-bold">
                      {formatInr(order.totalPaisa)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {order.capture && (
            <section className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                <Sparkles className="h-4 w-4 text-green" />
                <h2 className="display text-lg">AI capture check</h2>
                <span className="pill bg-paper-deep text-ink-muted">
                  {order.capture.model}
                </span>
                <span className="pill ml-auto bg-green-soft text-green-dark">
                  Human confirmed
                </span>
              </div>
              <div className="p-4">
                <p className="eyebrow">Original message</p>
                <p className="mt-1 rounded-xl bg-paper/70 px-3 py-2.5 text-xs italic leading-relaxed text-ink-soft">
                  “{order.capture.rawText}”
                </p>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-left text-[0.6875rem]">
                    <thead className="text-[0.5625rem] uppercase tracking-[0.06em] text-ink-muted">
                      <tr>
                        <th className="py-1.5 pr-2 font-semibold">
                          Parsed line
                        </th>
                        <th className="px-2 py-1.5 font-semibold">Product</th>
                        <th className="px-2 py-1.5 font-semibold">Qty</th>
                        <th className="px-2 py-1.5 text-right font-semibold">
                          Confidence
                        </th>
                        <th className="px-2 py-1.5 text-right font-semibold">
                          Review
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {order.capture.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="py-2 pr-2 text-ink-soft">
                            “{line.rawText}”
                          </td>
                          <td className="px-2 py-2 font-semibold">
                            {line.productName ?? "Unmatched"}
                          </td>
                          <td className="px-2 py-2 text-ink-soft">
                            {line.qty ?? "—"}{" "}
                            {line.unit === "case"
                              ? "case"
                              : line.unit === "piece"
                                ? "piece"
                                : "?"}
                          </td>
                          <td className="money px-2 py-2 text-right">
                            {Math.round(line.confidenceBp / 100)}%
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span
                              className={[
                                "pill",
                                line.resolution === "removed"
                                  ? "bg-paper-deep text-ink-muted"
                                  : "bg-green-soft text-green-dark",
                              ].join(" ")}
                            >
                              {line.resolution}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-green-soft/60 px-2.5 py-2 text-[0.625rem] leading-relaxed text-green-dark">
                  <FileCheck2 className="mt-0.5 h-3 w-3 shrink-0" />
                  AI only suggested catalogue matches. The retailer reviewed
                  every line before the order was created; the desk is seeing
                  the stored final lines.
                </p>
              </div>
            </section>
          )}

          <section className="card p-4">
            <h2 className="display text-lg">Activity</h2>
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
                      <p className="font-semibold text-ink-soft">
                        {auditLabel(entry.action)}
                      </p>
                      <p className="text-ink-muted">
                        {entry.actorName ? `${entry.actorName} · ` : ""}
                        {formatDateIst(entry.createdAt)}
                      </p>
                      {entry.action === "order.credit_hold" &&
                        typeof entry.metadata?.reason === "string" && (
                          <p className="text-ink-muted">
                            “{entry.metadata.reason}”
                          </p>
                        )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-28">
          <section className="card p-3.5">
            <div className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-green" />
              <h2 className="text-xs font-bold">Retailer</h2>
            </div>
            <p className="mt-2 text-sm font-semibold">{order.shopName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[0.6875rem] text-ink-soft">
              <UserRound className="h-3 w-3" /> {order.ownerName}
            </p>
            <a
              href={`tel:${order.phone}`}
              className="mt-0.5 flex items-center gap-1 text-[0.6875rem] text-green"
            >
              <Phone className="h-3 w-3" /> {order.phone}
            </a>
            <p className="mt-1 flex items-start gap-1 text-[0.6875rem] leading-relaxed text-ink-muted">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {order.address}
            </p>
            <CreditStrip
              className="mt-3 border-0 bg-paper/60 px-0 shadow-none"
              limitPaisa={order.creditLimitPaisa}
              outstandingPaisa={order.outstandingPaisa}
            />
            <p className="mt-1.5 text-[0.625rem] leading-relaxed text-ink-muted">
              This order is {formatInr(order.totalPaisa)}; available before it
              was {formatInr(availableCredit)}.
            </p>
          </section>

          <section className="card p-3.5">
            <h2 className="flex items-center gap-1.5 text-xs font-bold">
              <PackageCheck className="h-3.5 w-3.5 text-green" /> Desk actions
            </h2>
            <div className="mt-2.5">
              <DeskOrderActions order={order} />
            </div>
          </section>

          {(order.status === "confirmed" || order.status === "exported") && (
            <section className="card p-3.5">
              <h2 className="flex items-center gap-1.5 text-xs font-bold">
                <FileDown className="h-3.5 w-3.5 text-blue" /> Tally export
              </h2>
              <div className="mt-2.5">
                <OrderExportPanel
                  orderId={order.id}
                  orderStatus={order.status}
                  initialExport={exportRecord}
                />
              </div>
            </section>
          )}

          <section className="card p-3.5">
            <h2 className="flex items-center gap-1.5 text-xs font-bold">
              <MessageSquareText className="h-3.5 w-3.5 text-ink-muted" /> Desk
              notes
            </h2>
            <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink-muted">
              {order.notes
                ? order.notes
                : "The retailer did not leave a note for this order."}
            </p>
            {order.confirmedAt && (
              <p className="mt-2 border-t border-line pt-2 text-[0.625rem] text-ink-muted">
                Confirmed {formatDateIst(order.confirmedAt)}
              </p>
            )}
            {order.exportedAt && (
              <p className="mt-1 text-[0.625rem] text-blue">
                Exported {formatDateIst(order.exportedAt)}
              </p>
            )}
            {order.cancelledAt && (
              <p className="mt-1 text-[0.625rem] text-red">
                Cancelled {formatDateIst(order.cancelledAt)}
              </p>
            )}
          </section>
        </aside>
      </div>
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
