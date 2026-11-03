import { createHash } from "node:crypto";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  auditLogs,
  exportOrders,
  exports,
  orderItems,
  orders,
  retailers,
  users,
} from "@/lib/db/schema";
import type { SessionContext } from "@/lib/auth/session";
import { ApiError } from "@/lib/http/api-error";
import type { ExportInput } from "@/lib/validation/order";
import type { ExportFormat, ExportOrder } from "@/lib/exports/tally";
import { buildExport, exportFileName } from "@/lib/exports/tally";

export interface ExportResult {
  id: string;
  fileName: string;
  format: ExportFormat;
  orderCount: number;
  checksum: string;
  createdAt: string;
  downloadUrl: string;
}

export interface ExportSummary {
  id: string;
  fileName: string;
  format: ExportFormat;
  orderCount: number;
  checksum: string;
  actorName: string | null;
  orderNumbers: string;
  createdAt: string;
  downloadUrl: string;
}

export interface ExportDownload {
  id: string;
  fileName: string;
  format: ExportFormat;
  content: string;
}

export async function createExport(
  session: SessionContext,
  input: ExportInput,
): Promise<ExportResult> {
  if (session.user.role !== "desk" && session.user.role !== "admin") {
    throw new ApiError("FORBIDDEN", 403, "Only the order desk can export.");
  }

  const orderIds = Array.from(new Set(input.orderIds));

  return db.transaction(async (tx) => {
    const orderRows = await tx
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        status: orders.status,
        notes: orders.notes,
        subtotalPaisa: orders.subtotalPaisa,
        discountPaisa: orders.discountPaisa,
        taxablePaisa: orders.taxablePaisa,
        taxPaisa: orders.taxPaisa,
        totalPaisa: orders.totalPaisa,
        createdAt: orders.createdAt,
        partyName: retailers.shopName,
      })
      .from(orders)
      .innerJoin(retailers, eq(retailers.id, orders.retailerId))
      .where(inArray(orders.id, orderIds));

    if (orderRows.length !== orderIds.length) {
      throw new ApiError(
        "NOT_FOUND",
        404,
        "One or more orders could not be found.",
      );
    }

    const already = await tx
      .select({ orderId: exportOrders.orderId })
      .from(exportOrders)
      .where(inArray(exportOrders.orderId, orderIds));
    if (already.length > 0) {
      throw new ApiError(
        "ALREADY_EXPORTED",
        409,
        "One or more of these orders has already been exported. A second export is blocked to prevent duplicate vouchers.",
        { orderIds: already.map((row) => row.orderId) },
      );
    }

    const notConfirmed = orderRows.filter(
      (order) => order.status !== "confirmed",
    );
    if (notConfirmed.length > 0) {
      throw new ApiError(
        "CONFLICT",
        409,
        "Only confirmed orders can be exported. Confirm the order first.",
        { orderIds: notConfirmed.map((order) => order.id) },
      );
    }

    const itemRows = await tx
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .orderBy(asc(orderItems.lineNo));

    const itemsByOrder = new Map<string, typeof itemRows>();
    for (const item of itemRows) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const sortedOrders = [...orderRows].sort((a, b) =>
      a.orderNo.localeCompare(b.orderNo),
    );

    const exportOrdersData: ExportOrder[] = sortedOrders.map((order) => {
      const items = itemsByOrder.get(order.id) ?? [];
      const taxable = items.reduce((sum, item) => sum + item.taxablePaisa, 0);
      const tax = items.reduce((sum, item) => sum + item.taxPaisa, 0);
      const total = taxable + tax;

      if (total !== order.totalPaisa) {
        throw new ApiError(
          "INTERNAL",
          500,
          `Order ${order.orderNo} does not reconcile. Export stopped.`,
        );
      }

      return {
        orderNo: order.orderNo,
        orderDate: order.createdAt,
        partyName: order.partyName,
        notes: order.notes,
        subtotalPaisa: order.subtotalPaisa,
        discountPaisa: order.discountPaisa,
        taxablePaisa: order.taxablePaisa,
        taxPaisa: order.taxPaisa,
        totalPaisa: order.totalPaisa,
        lines: items.map((item) => ({
          skuCode: item.skuCode,
          name: item.productName,
          qtyCases: item.qtyCases,
          isFree: item.isFree,
          unitPricePaisa: item.unitPricePaisa,
          discountPaisa: item.discountPaisa,
          taxablePaisa: item.taxablePaisa,
          taxPaisa: item.taxPaisa,
          lineTotalPaisa: item.lineTotalPaisa,
          gstRateBp: item.gstRateBp,
        })),
      };
    });

    const content = buildExport(input.format, exportOrdersData);
    const checksum = createHash("sha256").update(content).digest("hex");
    const fileName = exportFileName(input.format, exportOrdersData);
    const now = new Date();

    const inserted = await tx
      .insert(exports)
      .values({
        format: input.format,
        fileName,
        orderCount: exportOrdersData.length,
        checksum,
        content,
        createdById: session.user.id,
        createdAt: now,
      })
      .returning({ id: exports.id, createdAt: exports.createdAt });

    const record = inserted[0]!;

    await tx.insert(exportOrders).values(
      orderIds.map((orderId) => ({
        exportId: record.id,
        orderId,
        createdAt: now,
      })),
    );

    for (const order of sortedOrders) {
      await tx
        .update(orders)
        .set({
          status: "exported",
          exportedAt: now,
          updatedAt: now,
        })
        .where(eq(orders.id, order.id));

      await tx.insert(auditLogs).values({
        actorId: session.user.id,
        action: "order.exported",
        entityType: "order",
        entityId: order.id,
        metadata: {
          exportId: record.id,
          format: input.format,
          fileName,
          checksum,
        },
        createdAt: now,
      });
    }

    return {
      id: record.id,
      fileName,
      format: input.format,
      orderCount: exportOrdersData.length,
      checksum,
      createdAt: record.createdAt.toISOString(),
      downloadUrl: `/api/exports/${record.id}`,
    };
  });
}

const orderNumbersSql = sql<string>`coalesce((select string_agg(o.order_no, ', ' order by o.order_no) from export_orders eo join orders o on o.id = eo.order_id where eo.export_id = ${exports.id}), '')`;

export async function listExports(limit = 30): Promise<ExportSummary[]> {
  const rows = await db
    .select({
      id: exports.id,
      fileName: exports.fileName,
      format: exports.format,
      orderCount: exports.orderCount,
      checksum: exports.checksum,
      actorName: users.name,
      createdAt: exports.createdAt,
      orderNumbers: orderNumbersSql,
    })
    .from(exports)
    .leftJoin(users, eq(users.id, exports.createdById))
    .orderBy(desc(exports.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    orderNumbers: row.orderNumbers ?? "",
    createdAt: row.createdAt.toISOString(),
    downloadUrl: `/api/exports/${row.id}`,
  }));
}

export async function getExportDownload(
  session: SessionContext,
  exportId: string,
): Promise<ExportDownload> {
  if (session.user.role !== "desk" && session.user.role !== "admin") {
    throw new ApiError(
      "FORBIDDEN",
      403,
      "Only the order desk can download exports.",
    );
  }

  const rows = await db
    .select({
      id: exports.id,
      fileName: exports.fileName,
      format: exports.format,
      content: exports.content,
    })
    .from(exports)
    .where(eq(exports.id, exportId))
    .limit(1);

  const record = rows[0];
  if (!record) {
    throw new ApiError("NOT_FOUND", 404, "We could not find that export.");
  }
  return record;
}

export async function getExportForOrder(
  orderId: string,
): Promise<ExportSummary | null> {
  const rows = await db
    .select({
      id: exports.id,
      fileName: exports.fileName,
      format: exports.format,
      orderCount: exports.orderCount,
      checksum: exports.checksum,
      actorName: users.name,
      createdAt: exports.createdAt,
      orderNumbers: orderNumbersSql,
    })
    .from(exports)
    .innerJoin(exportOrders, eq(exportOrders.exportId, exports.id))
    .leftJoin(users, eq(users.id, exports.createdById))
    .where(eq(exportOrders.orderId, orderId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    orderNumbers: row.orderNumbers ?? "",
    createdAt: row.createdAt.toISOString(),
    downloadUrl: `/api/exports/${row.id}`,
  };
}
