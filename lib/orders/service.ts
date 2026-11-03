import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  aiCaptureLines,
  aiCaptures,
  auditLogs,
  orderItems,
  orders,
  products,
  retailers,
  users,
} from "@/lib/db/schema";
import type { PlaceOrderInput } from "@/lib/validation/order";
import type { SessionContext, SessionRetailer } from "@/lib/auth/session";
import { ApiError } from "@/lib/http/api-error";
import { formatInr } from "@/lib/pricing/money";
import { priceCart } from "@/lib/schemes/engine";
import { creditPosition, loadRetailerPricing } from "@/lib/orders/pricing";
import type {
  CaptureLineView,
  CaptureView,
  CreatedOrder,
  DeskOrderAction,
  DeskOrderFilters,
  OrderDetail,
  OrderListItem,
  OrderStatus,
} from "@/lib/orders/types";
import { ORDER_STATUS_META } from "@/lib/orders/types";

type Database = typeof db;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const iso = (value: Date | null | undefined) =>
  value ? value.toISOString() : null;

function istDatePrefix(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `SO-${get("year")}${get("month")}${get("day")}-`;
}

async function nextOrderNo(tx: Transaction, now: Date): Promise<string> {
  const prefix = istDatePrefix(now);
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${prefix})::bigint)`,
  );

  const rows = await tx
    .select({ orderNo: orders.orderNo })
    .from(orders)
    .where(like(orders.orderNo, `${prefix}%`));

  let max = 0;
  for (const row of rows) {
    const parsed = Number.parseInt(row.orderNo.slice(prefix.length), 10);
    if (Number.isFinite(parsed)) max = Math.max(max, parsed);
  }

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_META[status].short;
}

async function restoreStock(
  tx: Transaction,
  items: Array<{ productId: string; qtyCases: number }>,
) {
  const grouped = new Map<string, number>();
  for (const item of items) {
    grouped.set(
      item.productId,
      (grouped.get(item.productId) ?? 0) + item.qtyCases,
    );
  }
  for (const [productId, qty] of grouped) {
    await tx
      .update(products)
      .set({ stockCases: sql`${products.stockCases} + ${qty}` })
      .where(eq(products.id, productId));
  }
}

async function findOrderByKey(
  retailerId: string,
  idempotencyKey: string,
): Promise<CreatedOrder | null> {
  const rows = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      status: orders.status,
      creditStatus: orders.creditStatus,
      totalPaisa: orders.totalPaisa,
      creditReason: orders.creditReason,
    })
    .from(orders)
    .where(
      and(
        eq(orders.retailerId, retailerId),
        eq(orders.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function createRetailerOrder(
  session: SessionContext & { retailer: SessionRetailer },
  input: PlaceOrderInput,
): Promise<CreatedOrder> {
  const existing = await findOrderByKey(
    session.retailer.id,
    input.idempotencyKey,
  );
  if (existing) return existing;

  try {
    return await db.transaction(async (tx) => {
      const now = new Date();
      const context = await loadRetailerPricing(
        tx,
        session.retailer.id,
        input.lines.map((line) => line.productId),
        now,
      );

      if (context.missingProductIds.length > 0) {
        throw new ApiError(
          "STOCK_CHANGED",
          409,
          "Some products are no longer available. Review your cart.",
          { productIds: context.missingProductIds },
        );
      }

      if (input.source === "ai" && input.aiCaptureId) {
        const captureRows = await tx
          .select({
            id: aiCaptures.id,
            status: aiCaptures.status,
            retailerId: aiCaptures.retailerId,
          })
          .from(aiCaptures)
          .where(
            and(
              eq(aiCaptures.id, input.aiCaptureId),
              eq(aiCaptures.retailerId, session.retailer.id),
            ),
          )
          .limit(1);
        const capture = captureRows[0];
        if (!capture) {
          throw new ApiError(
            "NOT_FOUND",
            404,
            "That AI capture was not found for your shop.",
          );
        }
        if (capture.status !== "accepted") {
          throw new ApiError(
            "CONFLICT",
            409,
            "Confirm the AI lines before placing the order.",
          );
        }
      }

      const priced = priceCart({
        lines: input.lines,
        products: context.products,
        schemes: context.rules,
        now,
      });

      if (priced.lines.length === 0) {
        throw new ApiError("VALIDATION_FAILED", 422, "Your cart is empty.");
      }

      const blockingWarnings = priced.warnings.filter(
        (warning) =>
          warning.code === "OUT_OF_STOCK" ||
          warning.code === "INSUFFICIENT_STOCK" ||
          warning.code === "UNKNOWN_PRODUCT",
      );
      if (blockingWarnings.length > 0) {
        throw new ApiError("STOCK_CHANGED", 409, blockingWarnings[0]!.message, {
          warnings: blockingWarnings,
        });
      }

      const groupedStock = new Map<string, number>();
      for (const line of priced.lines) {
        groupedStock.set(
          line.productId,
          (groupedStock.get(line.productId) ?? 0) + line.qtyCases,
        );
      }

      for (const [productId, qty] of groupedStock) {
        const updated = await tx
          .update(products)
          .set({ stockCases: sql`${products.stockCases} - ${qty}` })
          .where(and(eq(products.id, productId), gte(products.stockCases, qty)))
          .returning({ id: products.id });

        if (updated.length === 0) {
          throw new ApiError(
            "STOCK_CHANGED",
            409,
            "Stock changed while you were ordering. Review your cart and try again.",
          );
        }
      }

      const credit = creditPosition(session.retailer, priced.totals.totalPaisa);
      const onHold = credit.exceedsLimit;
      const creditReason = onHold
        ? `Order total ${formatInr(priced.totals.totalPaisa)} exceeds the available credit of ${formatInr(credit.availablePaisa)}.`
        : null;

      const orderNo = await nextOrderNo(tx, now);
      const inserted = await tx
        .insert(orders)
        .values({
          orderNo,
          retailerId: session.retailer.id,
          createdById: session.user.id,
          source: input.source,
          status: onHold ? "credit_hold" : "pending",
          creditStatus: onHold ? "hold" : "ok",
          subtotalPaisa: priced.totals.subtotalPaisa,
          discountPaisa: priced.totals.discountPaisa,
          taxablePaisa: priced.totals.taxablePaisa,
          taxPaisa: priced.totals.taxPaisa,
          totalPaisa: priced.totals.totalPaisa,
          notes: input.notes?.trim() ? input.notes.trim() : null,
          aiCaptureId: input.aiCaptureId ?? null,
          idempotencyKey: input.idempotencyKey,
          creditReason,
        })
        .returning({
          id: orders.id,
          orderNo: orders.orderNo,
          status: orders.status,
          creditStatus: orders.creditStatus,
          totalPaisa: orders.totalPaisa,
          creditReason: orders.creditReason,
        });

      const order = inserted[0]!;

      await tx.insert(orderItems).values(
        priced.lines.map((line) => ({
          orderId: order.id,
          lineNo: line.lineNo,
          productId: line.productId,
          skuCode: line.skuCode,
          productName: line.name,
          packSize: line.packSize,
          qtyCases: line.qtyCases,
          unitPricePaisa: line.unitPricePaisa,
          subtotalPaisa: line.subtotalPaisa,
          discountPaisa: line.discountPaisa,
          taxablePaisa: line.taxablePaisa,
          taxPaisa: line.taxPaisa,
          lineTotalPaisa: line.lineTotalPaisa,
          gstRateBp: line.gstRateBp,
          isFree: line.isFree,
          schemeId: line.schemeId,
          schemeExplanation: line.schemeExplanation,
        })),
      );

      await tx.insert(auditLogs).values({
        actorId: session.user.id,
        action: onHold ? "order.created.credit_hold" : "order.created",
        entityType: "order",
        entityId: order.id,
        metadata: {
          orderNo: order.orderNo,
          source: input.source,
          totalPaisa: priced.totals.totalPaisa,
          paidCases: priced.totals.paidCases,
          freeCases: priced.totals.freeCases,
        },
      });

      return order;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const raced = await findOrderByKey(
        session.retailer.id,
        input.idempotencyKey,
      );
      if (raced) return raced;
    }
    throw error;
  }
}

function mapOrderRow(row: {
  id: string;
  orderNo: string;
  status: OrderStatus;
  source: "manual" | "ai" | "repeat" | "desk";
  creditStatus: "ok" | "hold" | "approved" | "rejected";
  totalPaisa: number;
  createdAt: Date;
  shopName: string;
  ownerName: string;
  phone: string;
  notes: string | null;
  creditReason: string | null;
  paidCases: number | string;
  freeCases: number | string;
}): OrderListItem {
  return {
    id: row.id,
    orderNo: row.orderNo,
    status: row.status,
    source: row.source,
    creditStatus: row.creditStatus,
    totalPaisa: row.totalPaisa,
    paidCases: Number(row.paidCases),
    freeCases: Number(row.freeCases),
    createdAt: row.createdAt.toISOString(),
    shopName: row.shopName,
    ownerName: row.ownerName,
    phone: row.phone,
    notes: row.notes,
    creditReason: row.creditReason,
  };
}

const listSelection = {
  id: orders.id,
  orderNo: orders.orderNo,
  status: orders.status,
  source: orders.source,
  creditStatus: orders.creditStatus,
  totalPaisa: orders.totalPaisa,
  createdAt: orders.createdAt,
  shopName: retailers.shopName,
  ownerName: retailers.ownerName,
  phone: retailers.phone,
  notes: orders.notes,
  creditReason: orders.creditReason,
  paidCases: sql<number>`coalesce((select sum(oi.qty_cases)::int from order_items oi where oi.order_id = ${orders.id} and oi.is_free = false), 0)`,
  freeCases: sql<number>`coalesce((select sum(oi.qty_cases)::int from order_items oi where oi.order_id = ${orders.id} and oi.is_free = true), 0)`,
};

export async function listRetailerOrders(
  retailerId: string,
  limit = 50,
): Promise<OrderListItem[]> {
  const rows = await db
    .select(listSelection)
    .from(orders)
    .innerJoin(retailers, eq(retailers.id, orders.retailerId))
    .where(eq(orders.retailerId, retailerId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return rows.map(mapOrderRow);
}

export async function listDeskOrders(
  filters: DeskOrderFilters = {},
): Promise<OrderListItem[]> {
  const conditions = [];
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim().replace(/[%_\\]/g, "")}%`;
    conditions.push(
      sql`(${orders.orderNo} ilike ${term} or ${retailers.shopName} ilike ${term} or ${retailers.ownerName} ilike ${term} or ${retailers.phone} ilike ${term})`,
    );
  }
  if (filters.date === "today" || filters.date === "7d") {
    const days = filters.date === "today" ? 0 : 6;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days);
    conditions.push(gte(orders.createdAt, start));
  }

  const rows = await db
    .select(listSelection)
    .from(orders)
    .innerJoin(retailers, eq(retailers.id, orders.retailerId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(100);

  return rows.map(mapOrderRow);
}

export async function deskOrderCounts(): Promise<Record<OrderStatus, number>> {
  const rows = await db
    .select({ status: orders.status, value: count() })
    .from(orders)
    .groupBy(orders.status);

  const result: Record<OrderStatus, number> = {
    pending: 0,
    credit_hold: 0,
    confirmed: 0,
    exported: 0,
    cancelled: 0,
  };
  for (const row of rows) result[row.status] = Number(row.value);
  return result;
}

export async function getCaptureView(
  captureId: string,
): Promise<CaptureView | null> {
  const captureRows = await db
    .select()
    .from(aiCaptures)
    .where(eq(aiCaptures.id, captureId))
    .limit(1);
  const capture = captureRows[0];
  if (!capture) return null;

  const lineRows = await db
    .select({
      id: aiCaptureLines.id,
      lineNo: aiCaptureLines.lineNo,
      rawText: aiCaptureLines.rawText,
      productWords: aiCaptureLines.productWords,
      productId: aiCaptureLines.productId,
      productName: products.name,
      qty: aiCaptureLines.qty,
      unit: aiCaptureLines.unit,
      confidenceBp: aiCaptureLines.confidenceBp,
      alternatives: aiCaptureLines.alternatives,
      needsClarification: aiCaptureLines.needsClarification,
      matchMethod: aiCaptureLines.matchMethod,
      resolution: aiCaptureLines.resolution,
    })
    .from(aiCaptureLines)
    .leftJoin(products, eq(products.id, aiCaptureLines.productId))
    .where(eq(aiCaptureLines.captureId, captureId))
    .orderBy(asc(aiCaptureLines.lineNo));

  const alternativeIds = Array.from(
    new Set(
      lineRows.flatMap((line) => line.alternatives.map((a) => a.productId)),
    ),
  );
  const alternativeNames = new Map<string, string>();
  if (alternativeIds.length > 0) {
    const names = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(inArray(products.id, alternativeIds));
    for (const name of names) alternativeNames.set(name.id, name.name);
  }

  const lines: CaptureLineView[] = lineRows.map((line) => ({
    ...line,
    alternatives: line.alternatives.map((alternative) => ({
      ...alternative,
      productName: alternativeNames.get(alternative.productId) ?? null,
    })),
  }));

  return {
    id: capture.id,
    rawText: capture.rawText,
    model: capture.model,
    promptVersion: capture.promptVersion,
    status: capture.status,
    error: capture.error,
    createdAt: capture.createdAt.toISOString(),
    acceptedAt: iso(capture.acceptedAt),
    lines,
  };
}

export async function getOrderDetail(
  orderId: string,
  scope: { retailerId?: string } = {},
): Promise<OrderDetail> {
  const conditions = [eq(orders.id, orderId)];
  if (scope.retailerId) {
    conditions.push(eq(orders.retailerId, scope.retailerId));
  }

  const rows = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      status: orders.status,
      source: orders.source,
      creditStatus: orders.creditStatus,
      subtotalPaisa: orders.subtotalPaisa,
      discountPaisa: orders.discountPaisa,
      taxablePaisa: orders.taxablePaisa,
      taxPaisa: orders.taxPaisa,
      totalPaisa: orders.totalPaisa,
      notes: orders.notes,
      creditReason: orders.creditReason,
      confirmedAt: orders.confirmedAt,
      exportedAt: orders.exportedAt,
      cancelledAt: orders.cancelledAt,
      createdAt: orders.createdAt,
      aiCaptureId: orders.aiCaptureId,
      shopName: retailers.shopName,
      ownerName: retailers.ownerName,
      phone: retailers.phone,
      address: retailers.address,
      creditLimitPaisa: retailers.creditLimitPaisa,
      outstandingPaisa: retailers.outstandingPaisa,
      paidCases: sql<number>`coalesce((select sum(oi.qty_cases)::int from order_items oi where oi.order_id = ${orders.id} and oi.is_free = false), 0)`,
      freeCases: sql<number>`coalesce((select sum(oi.qty_cases)::int from order_items oi where oi.order_id = ${orders.id} and oi.is_free = true), 0)`,
      freeGoodsValuePaisa: sql<number>`coalesce((select sum(oi.qty_cases * oi.unit_price_paisa)::int from order_items oi where oi.order_id = ${orders.id} and oi.is_free = true), 0)`,
    })
    .from(orders)
    .innerJoin(retailers, eq(retailers.id, orders.retailerId))
    .where(and(...conditions))
    .limit(1);

  const order = rows[0];
  if (!order) {
    throw new ApiError("NOT_FOUND", 404, "We could not find that order.");
  }

  const itemRows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.lineNo));

  const auditRows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      actorName: users.name,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(
      and(eq(auditLogs.entityType, "order"), eq(auditLogs.entityId, orderId)),
    )
    .orderBy(asc(auditLogs.createdAt));

  const capture = order.aiCaptureId
    ? await getCaptureView(order.aiCaptureId)
    : null;

  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    source: order.source,
    creditStatus: order.creditStatus,
    subtotalPaisa: order.subtotalPaisa,
    discountPaisa: order.discountPaisa,
    freeGoodsValuePaisa: Number(order.freeGoodsValuePaisa),
    taxablePaisa: order.taxablePaisa,
    taxPaisa: order.taxPaisa,
    totalPaisa: order.totalPaisa,
    notes: order.notes,
    creditReason: order.creditReason,
    confirmedAt: iso(order.confirmedAt),
    exportedAt: iso(order.exportedAt),
    cancelledAt: iso(order.cancelledAt),
    createdAt: order.createdAt.toISOString(),
    paidCases: Number(order.paidCases),
    freeCases: Number(order.freeCases),
    shopName: order.shopName,
    ownerName: order.ownerName,
    phone: order.phone,
    address: order.address,
    creditLimitPaisa: order.creditLimitPaisa,
    outstandingPaisa: order.outstandingPaisa,
    items: itemRows.map((item) => ({
      ...item,
      id: item.id,
      lineNo: item.lineNo,
    })),
    capture,
    audit: auditRows.map((entry) => ({
      id: entry.id,
      action: entry.action,
      actorName: entry.actorName,
      metadata: entry.metadata ?? null,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function getOrderForDesk(orderId: string): Promise<OrderDetail> {
  return getOrderDetail(orderId);
}

export async function cancelRetailerOrder(
  session: SessionContext & { retailer: SessionRetailer },
  orderId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: orders.id,
        status: orders.status,
        orderNo: orders.orderNo,
      })
      .from(orders)
      .where(
        and(eq(orders.id, orderId), eq(orders.retailerId, session.retailer.id)),
      )
      .limit(1);

    const order = rows[0];
    if (!order) {
      throw new ApiError("NOT_FOUND", 404, "We could not find that order.");
    }
    if (order.status !== "pending" && order.status !== "credit_hold") {
      throw new ApiError(
        "ORDER_NOT_CANCELLABLE",
        409,
        `This order is ${orderStatusLabel(order.status).toLowerCase()} and can no longer be cancelled.`,
      );
    }

    const items = await tx
      .select({
        productId: orderItems.productId,
        qtyCases: orderItems.qtyCases,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    await restoreStock(tx, items);

    await tx
      .update(orders)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      action: "order.cancelled",
      entityType: "order",
      entityId: orderId,
      metadata: { orderNo: order.orderNo, by: "retailer" },
    });
  });
}

export async function applyDeskOrderAction(
  session: SessionContext,
  orderId: string,
  action: DeskOrderAction,
): Promise<void> {
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        status: orders.status,
        creditStatus: orders.creditStatus,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    const order = rows[0];
    if (!order) {
      throw new ApiError("NOT_FOUND", 404, "We could not find that order.");
    }

    const restore = async () => {
      const items = await tx
        .select({
          productId: orderItems.productId,
          qtyCases: orderItems.qtyCases,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
      await restoreStock(tx, items);
    };

    const writeAudit = async (
      auditAction: string,
      metadata: Record<string, unknown> = {},
    ) => {
      await tx.insert(auditLogs).values({
        actorId: session.user.id,
        action: auditAction,
        entityType: "order",
        entityId: orderId,
        metadata: { orderNo: order.orderNo, ...metadata },
      });
    };

    if (action.action === "hold") {
      if (
        order.status === "confirmed" ||
        order.status === "exported" ||
        order.status === "cancelled"
      ) {
        throw new ApiError(
          "CONFLICT",
          409,
          "Only a pending order can be put on credit hold.",
        );
      }
      const reason = action.reason.trim();
      if (!reason) {
        throw new ApiError(
          "VALIDATION_FAILED",
          422,
          "Add a reason for the hold.",
        );
      }
      await tx
        .update(orders)
        .set({
          status: "credit_hold",
          creditStatus: "hold",
          creditReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
      await writeAudit("order.credit_hold", { reason });
      return;
    }

    if (action.action === "approve_credit") {
      if (order.status !== "credit_hold" || order.creditStatus === "rejected") {
        throw new ApiError(
          "CONFLICT",
          409,
          "This order is not on a credit hold that can be approved.",
        );
      }
      await tx
        .update(orders)
        .set({
          creditStatus: "approved",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
      await writeAudit("order.credit_approved", {
        reason: action.reason?.trim() || null,
      });
      return;
    }

    if (action.action === "reject_credit") {
      if (order.status !== "credit_hold") {
        throw new ApiError(
          "CONFLICT",
          409,
          "This order is not on a credit hold that can be rejected.",
        );
      }
      const reason =
        action.reason?.trim() || "Credit hold rejected by the desk.";
      await restore();
      await tx
        .update(orders)
        .set({
          status: "cancelled",
          creditStatus: "rejected",
          creditReason: reason,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
      await writeAudit("order.credit_rejected", { reason });
      return;
    }

    if (action.action === "confirm") {
      if (order.status === "confirmed" || order.status === "exported") {
        return;
      }
      const allowed =
        order.status === "pending" ||
        (order.status === "credit_hold" && order.creditStatus === "approved");
      if (!allowed) {
        throw new ApiError(
          "CONFLICT",
          409,
          order.status === "credit_hold"
            ? "Approve the credit hold before confirming."
            : "This order cannot be confirmed.",
        );
      }
      await tx
        .update(orders)
        .set({
          status: "confirmed",
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
      await writeAudit("order.confirmed");
      return;
    }

    if (action.action === "cancel") {
      if (order.status === "exported" || order.status === "cancelled") {
        throw new ApiError(
          "ORDER_NOT_CANCELLABLE",
          409,
          "This order can no longer be cancelled.",
        );
      }
      const reason = action.reason?.trim() || "Cancelled by the order desk.";
      await restore();
      await tx
        .update(orders)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          creditReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
      await writeAudit("order.cancelled", { reason, by: "desk" });
      return;
    }

    throw new ApiError("VALIDATION_FAILED", 422, "Unknown desk action.");
  });
}
