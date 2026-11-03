import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  aiCaptureLines,
  aiCaptures,
  aliases,
  auditLogs,
  orderItems,
  orders,
  products,
} from "@/lib/db/schema";
import { ApiError } from "@/lib/http/api-error";
import { getEnv } from "@/lib/config/env";
import type { SessionContext, SessionRetailer } from "@/lib/auth/session";
import type { AiConfirmInput } from "@/lib/validation/order";
import {
  aliasCandidate,
  matchProductWords,
  parseOrderText,
} from "@/lib/ai/parser";
import { normalizeAliasTerm } from "@/lib/ai/normalize";
import { extractWithAiProvider } from "@/lib/ai/provider";
import type { AiUnit, MatchContext, ParsedLine } from "@/lib/ai/types";
import { getCaptureView } from "@/lib/orders/service";
import type { CaptureView } from "@/lib/orders/types";

type RetailerSession = SessionContext & { retailer: SessionRetailer };

export interface CaptureSummary {
  id: string;
  rawText: string;
  status: "processing" | "review" | "accepted" | "failed";
  model: string;
  createdAt: string;
  lineCount: number;
}

export interface AcceptedCaptureLine {
  productId: string;
  qtyCases: number;
  productName: string;
  skuCode: string;
}

async function loadMatchContext(retailerId: string): Promise<MatchContext> {
  const [productRows, aliasRows, pastOrderRows] = await Promise.all([
    db
      .select({
        id: products.id,
        skuCode: products.skuCode,
        name: products.name,
        hindiAliases: products.hindiAliases,
        packSize: products.packSize,
        caseSize: products.caseSize,
        stockCases: products.stockCases,
      })
      .from(products)
      .where(eq(products.active, true)),
    db
      .select({
        normalizedTerm: aliases.normalizedTerm,
        productId: aliases.productId,
      })
      .from(aliases)
      .where(eq(aliases.retailerId, retailerId)),
    db
      .select({
        productId: orderItems.productId,
        value: count(),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(eq(orders.retailerId, retailerId), ne(orders.status, "cancelled")),
      )
      .groupBy(orderItems.productId)
      .orderBy(desc(count()))
      .limit(60),
  ]);

  return {
    products: productRows,
    aliases: aliasRows,
    pastOrderCounts: new Map(
      pastOrderRows.map((row) => [row.productId, Number(row.value)]),
    ),
  };
}

async function extractLines(
  text: string,
  context: MatchContext,
): Promise<{ lines: ParsedLine[]; model: string; usedFallback: boolean }> {
  const provider = await extractWithAiProvider(text);

  if (provider && provider.lines.length > 0) {
    const lines = provider.lines.map((line) =>
      matchProductWords(
        {
          rawText: line.rawText,
          words: line.productWords || line.rawText,
          qty: line.qty,
          unit: line.unit as AiUnit,
          hadExplicitUnit: line.unit !== "unclear",
        },
        context,
        Math.round(line.confidence * 10_000),
      ),
    );
    return { lines, model: provider.model, usedFallback: false };
  }

  return {
    lines: parseOrderText(text, context).lines,
    model: "deterministic-v1",
    usedFallback: true,
  };
}

export async function createCapture(
  session: RetailerSession,
  text: string,
): Promise<{ capture: CaptureView; usedFallback: boolean }> {
  const inserted = await db
    .insert(aiCaptures)
    .values({
      retailerId: session.retailer.id,
      createdById: session.user.id,
      rawText: text,
      model: getEnv().AI_PROVIDER === "mock" ? "deterministic-v1" : "pending",
      promptVersion: "capture-v1",
      status: "processing",
    })
    .returning({ id: aiCaptures.id });

  const captureId = inserted[0]!.id;

  try {
    const context = await loadMatchContext(session.retailer.id);
    const extraction = await extractLines(text, context);

    if (extraction.lines.length > 0) {
      await db.insert(aiCaptureLines).values(
        extraction.lines.map((line, index) => ({
          captureId,
          lineNo: index + 1,
          rawText: line.rawText,
          productWords: line.productWords,
          productId: line.productId,
          qty: line.qty,
          unit: line.unit,
          confidenceBp: line.confidenceBp,
          alternatives: line.alternatives,
          needsClarification: line.needsClarification,
          matchMethod: line.matchMethod,
        })),
      );
    }

    await db
      .update(aiCaptures)
      .set({
        model: extraction.model,
        status: "review",
        parsedJson: {
          usedFallback: extraction.usedFallback,
          provider: getEnv().AI_PROVIDER,
          lineCount: extraction.lines.length,
        },
      })
      .where(eq(aiCaptures.id, captureId));

    const capture = await getCaptureView(captureId);
    if (!capture) {
      throw new ApiError("INTERNAL", 500, "Could not read the AI capture.");
    }

    return { capture, usedFallback: extraction.usedFallback };
  } catch (error) {
    await db
      .update(aiCaptures)
      .set({
        status: "failed",
        error:
          error instanceof Error
            ? "The capture could not be completed. Try again or order from the catalogue."
            : "Unknown capture error.",
      })
      .where(eq(aiCaptures.id, captureId));

    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "AI_UNAVAILABLE",
      503,
      "AI capture is unavailable right now. You can order from the catalogue instead.",
    );
  }
}

export async function getRetailerCapture(
  captureId: string,
  retailerId: string,
): Promise<CaptureView> {
  const rows = await db
    .select({ id: aiCaptures.id })
    .from(aiCaptures)
    .where(
      and(eq(aiCaptures.id, captureId), eq(aiCaptures.retailerId, retailerId)),
    )
    .limit(1);
  if (!rows[0]) {
    throw new ApiError("NOT_FOUND", 404, "We could not find that AI capture.");
  }
  const capture = await getCaptureView(captureId);
  if (!capture) {
    throw new ApiError("NOT_FOUND", 404, "We could not find that AI capture.");
  }
  return capture;
}

export async function listRetailerCaptures(
  retailerId: string,
  limit = 6,
): Promise<CaptureSummary[]> {
  const rows = await db
    .select({
      id: aiCaptures.id,
      rawText: aiCaptures.rawText,
      status: aiCaptures.status,
      model: aiCaptures.model,
      createdAt: aiCaptures.createdAt,
      lineCount: sql<number>`(select count(*)::int from ai_capture_lines l where l.capture_id = ${aiCaptures.id})`,
    })
    .from(aiCaptures)
    .where(eq(aiCaptures.retailerId, retailerId))
    .orderBy(desc(aiCaptures.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    rawText: row.rawText,
    status: row.status,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
    lineCount: Number(row.lineCount),
  }));
}

async function acceptedLines(
  captureId: string,
): Promise<AcceptedCaptureLine[]> {
  const rows = await db
    .select({
      productId: aiCaptureLines.productId,
      qty: aiCaptureLines.qty,
      productName: products.name,
      skuCode: products.skuCode,
    })
    .from(aiCaptureLines)
    .innerJoin(products, eq(products.id, aiCaptureLines.productId))
    .where(
      and(
        eq(aiCaptureLines.captureId, captureId),
        eq(aiCaptureLines.resolution, "accepted"),
      ),
    );

  const edited = await db
    .select({
      productId: aiCaptureLines.productId,
      qty: aiCaptureLines.qty,
      productName: products.name,
      skuCode: products.skuCode,
    })
    .from(aiCaptureLines)
    .innerJoin(products, eq(products.id, aiCaptureLines.productId))
    .where(
      and(
        eq(aiCaptureLines.captureId, captureId),
        eq(aiCaptureLines.resolution, "edited"),
      ),
    );

  return [...rows, ...edited]
    .filter(
      (
        row,
      ): row is {
        productId: string;
        qty: number;
        productName: string;
        skuCode: string;
      } => Boolean(row.productId && row.qty),
    )
    .map((row) => ({
      productId: row.productId,
      qtyCases: row.qty,
      productName: row.productName,
      skuCode: row.skuCode,
    }));
}

export async function confirmCapture(
  session: RetailerSession,
  captureId: string,
  input: AiConfirmInput,
): Promise<{ captureId: string; lines: AcceptedCaptureLine[] }> {
  const captureRows = await db
    .select({
      id: aiCaptures.id,
      status: aiCaptures.status,
      retailerId: aiCaptures.retailerId,
    })
    .from(aiCaptures)
    .where(
      and(
        eq(aiCaptures.id, captureId),
        eq(aiCaptures.retailerId, session.retailer.id),
      ),
    )
    .limit(1);

  const capture = captureRows[0];
  if (!capture) {
    throw new ApiError("NOT_FOUND", 404, "We could not find that AI capture.");
  }

  if (capture.status === "accepted") {
    return { captureId, lines: await acceptedLines(captureId) };
  }
  if (capture.status !== "review") {
    throw new ApiError(
      "CONFLICT",
      409,
      "This capture is no longer open for review.",
    );
  }

  const lineRows = await db
    .select()
    .from(aiCaptureLines)
    .where(eq(aiCaptureLines.captureId, captureId));
  const lineById = new Map(lineRows.map((line) => [line.id, line]));

  const getProduct = async (productId: string) => {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        skuCode: products.skuCode,
      })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.active, true)))
      .limit(1);
    return rows[0] ?? null;
  };

  await db.transaction(async (tx) => {
    const accepted: string[] = [];

    for (const line of input.lines) {
      const existing = lineById.get(line.lineId);
      if (!existing) {
        throw new ApiError(
          "VALIDATION_FAILED",
          422,
          "One of the AI lines no longer exists. Start the capture again.",
        );
      }

      if (line.action === "remove") {
        await tx
          .update(aiCaptureLines)
          .set({
            resolution: "removed",
            needsClarification: false,
            updatedAt: new Date(),
          })
          .where(eq(aiCaptureLines.id, line.lineId));
        continue;
      }

      if (line.unit !== "case") {
        throw new ApiError(
          "VALIDATION_FAILED",
          422,
          "Orders are placed in cases. Choose a case quantity for this line or remove it.",
          { lineId: line.lineId },
        );
      }

      const product = await getProduct(line.productId);
      if (!product) {
        throw new ApiError(
          "VALIDATION_FAILED",
          422,
          "That product is no longer available.",
          { lineId: line.lineId },
        );
      }

      const changed =
        existing.productId !== line.productId ||
        existing.qty !== line.qty ||
        existing.unit !== line.unit;

      await tx
        .update(aiCaptureLines)
        .set({
          productId: line.productId,
          qty: line.qty,
          unit: line.unit,
          needsClarification: false,
          resolution: changed ? "edited" : "accepted",
          updatedAt: new Date(),
        })
        .where(eq(aiCaptureLines.id, line.lineId));

      accepted.push(line.lineId);

      const rawTerm = (
        line.aliasTerm?.trim() ||
        existing.productWords ||
        existing.rawText
      ).slice(0, 120);
      const normalizedTerm = normalizeAliasTerm(
        aliasCandidate(rawTerm) || rawTerm,
      );
      if (
        normalizedTerm.length >= 3 &&
        (changed ||
          existing.matchMethod === "fuzzy" ||
          existing.matchMethod === "unmatched")
      ) {
        await tx
          .insert(aliases)
          .values({
            retailerId: session.retailer.id,
            rawTerm,
            normalizedTerm,
            productId: line.productId,
            createdById: session.user.id,
          })
          .onConflictDoUpdate({
            target: [aliases.retailerId, aliases.normalizedTerm],
            set: {
              rawTerm,
              productId: line.productId,
              createdById: session.user.id,
            },
          });
      }
    }

    if (accepted.length === 0) {
      throw new ApiError(
        "VALIDATION_FAILED",
        422,
        "Keep at least one line to add to the cart.",
      );
    }

    await tx
      .update(aiCaptures)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(aiCaptures.id, captureId));

    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      action: "ai.capture.accepted",
      entityType: "ai_capture",
      entityId: captureId,
      metadata: {
        acceptedLines: accepted.length,
        reviewedLines: input.lines.length,
      },
    });
  });

  const lines = await acceptedLines(captureId);
  return { captureId, lines };
}
