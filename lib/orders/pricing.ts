import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  brands,
  categories,
  products,
  retailerPrices,
  schemes,
} from "@/lib/db/schema";
import type { SchemeProduct, SchemeRule } from "@/lib/schemes/types";
import type { StockStatus } from "@/lib/catalogue/types";
import type { SessionRetailer } from "@/lib/auth/session";
import { priceCart } from "@/lib/schemes/engine";
import type { CartLineInput, PricedCart } from "@/lib/schemes/types";

type Database = typeof db;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbExecutor = Database | Transaction;

export interface CartProductMeta {
  id: string;
  skuCode: string;
  name: string;
  hindiAliases: string[];
  brandName: string;
  brandAccent: string;
  categoryName: string;
  categoryNameHi: string;
  packSize: string;
  packUnit: string;
  caseSize: number;
  dealerPricePaisa: number;
  pricePerPackPaisa: number;
  isRetailerPrice: boolean;
  priceIncludesGst: boolean;
  gstRateBp: number;
  stockCases: number;
  lowStockThreshold: number;
  stockStatus: StockStatus;
  imageKey: string;
}

export interface RetailerPricingContext {
  products: Map<string, SchemeProduct>;
  meta: Map<string, CartProductMeta>;
  rules: SchemeRule[];
  missingProductIds: string[];
}

export interface CreditPosition {
  limitPaisa: number;
  outstandingPaisa: number;
  availablePaisa: number;
  orderTotalPaisa: number;
  afterOrderPaisa: number;
  exceedsLimit: boolean;
}

export interface CartPreview {
  lines: PricedCart["lines"];
  totals: PricedCart["totals"];
  warnings: PricedCart["warnings"];
  nudges: PricedCart["nudges"];
  products: Record<string, CartProductMeta>;
  credit: CreditPosition;
  generatedAt: string;
}

function stockStatus(
  stockCases: number,
  lowStockThreshold: number,
): StockStatus {
  if (stockCases <= 0) return "out";
  if (stockCases <= lowStockThreshold) return "low";
  return "in";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * Loads everything the pure scheme engine needs for one retailer: resolved
 * retailer prices, product stock, and live schemes. The caller may pass a
 * transaction so checkout reads a consistent snapshot.
 */
export async function loadRetailerPricing(
  executor: DbExecutor,
  retailerId: string,
  cartProductIds: string[],
  now = new Date(),
): Promise<RetailerPricingContext> {
  const ids = unique(cartProductIds);
  if (ids.length === 0) {
    return {
      products: new Map(),
      meta: new Map(),
      rules: [],
      missingProductIds: [],
    };
  }

  const liveSchemeRows = await executor
    .select()
    .from(schemes)
    .where(
      and(
        eq(schemes.active, true),
        inArray(schemes.productId, ids),
        lte(schemes.startsAt, now),
        or(isNull(schemes.endsAt), gt(schemes.endsAt, now))!,
      ),
    );

  const freeProductIds = liveSchemeRows
    .map((scheme) => scheme.freeProductId)
    .filter((id): id is string => Boolean(id));

  const allProductIds = unique([...ids, ...freeProductIds]);

  const productRows = await executor
    .select({
      id: products.id,
      skuCode: products.skuCode,
      name: products.name,
      hindiAliases: products.hindiAliases,
      packSize: products.packSize,
      packUnit: products.packUnit,
      caseSize: products.caseSize,
      dealerPricePaisa: products.dealerPricePaisa,
      priceIncludesGst: products.priceIncludesGst,
      gstRateBp: products.gstRateBp,
      stockCases: products.stockCases,
      lowStockThreshold: products.lowStockThreshold,
      imageKey: products.imageKey,
      brandName: brands.name,
      brandAccent: brands.accent,
      categoryName: categories.name,
      categoryNameHi: categories.nameHi,
    })
    .from(products)
    .innerJoin(brands, eq(brands.id, products.brandId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.active, true), inArray(products.id, allProductIds)));

  const priceRows = await executor
    .select({
      productId: retailerPrices.productId,
      pricePaisa: retailerPrices.pricePaisa,
      validFrom: retailerPrices.validFrom,
    })
    .from(retailerPrices)
    .where(
      and(
        eq(retailerPrices.retailerId, retailerId),
        inArray(retailerPrices.productId, allProductIds),
        lte(retailerPrices.validFrom, now),
        or(isNull(retailerPrices.validTo), gt(retailerPrices.validTo, now))!,
      ),
    )
    .orderBy(desc(retailerPrices.validFrom));

  const overrideByProduct = new Map<string, number>();
  for (const price of priceRows) {
    if (!overrideByProduct.has(price.productId)) {
      overrideByProduct.set(price.productId, price.pricePaisa);
    }
  }

  const productMap = new Map<string, SchemeProduct>();
  const meta = new Map<string, CartProductMeta>();

  for (const row of productRows) {
    const override = overrideByProduct.get(row.id);
    const unitPricePaisa = override ?? row.dealerPricePaisa;

    productMap.set(row.id, {
      id: row.id,
      skuCode: row.skuCode,
      name: row.name,
      packSize: row.packSize,
      caseSize: row.caseSize,
      unitPricePaisa,
      gstRateBp: row.gstRateBp,
      priceIncludesGst: row.priceIncludesGst,
      stockCases: row.stockCases,
      lowStockThreshold: row.lowStockThreshold,
    });

    meta.set(row.id, {
      ...row,
      pricePerPackPaisa: unitPricePaisa,
      isRetailerPrice: override !== undefined,
      stockStatus: stockStatus(row.stockCases, row.lowStockThreshold),
    });
  }

  const rules: SchemeRule[] = liveSchemeRows.map((scheme) => ({
    id: scheme.id,
    name: scheme.name,
    type: scheme.type,
    productId: scheme.productId,
    freeProductId: scheme.freeProductId,
    buyQty: scheme.buyQty,
    freeQty: scheme.freeQty,
    minQty: scheme.minQty,
    percentBp: scheme.percentBp,
    startsAt: scheme.startsAt,
    endsAt: scheme.endsAt,
    priority: scheme.priority,
    active: scheme.active,
  }));

  return {
    products: productMap,
    meta,
    rules,
    missingProductIds: ids.filter(
      (id) => !productRows.some((row) => row.id === id),
    ),
  };
}

export function creditPosition(
  retailer: Pick<SessionRetailer, "creditLimitPaisa" | "outstandingPaisa">,
  orderTotalPaisa: number,
): CreditPosition {
  const availablePaisa = Math.max(
    0,
    retailer.creditLimitPaisa - retailer.outstandingPaisa,
  );
  return {
    limitPaisa: retailer.creditLimitPaisa,
    outstandingPaisa: retailer.outstandingPaisa,
    availablePaisa,
    orderTotalPaisa,
    afterOrderPaisa: availablePaisa - orderTotalPaisa,
    exceedsLimit: orderTotalPaisa > availablePaisa,
  };
}

export async function previewRetailerCart(
  retailer: SessionRetailer,
  lines: CartLineInput[],
  now = new Date(),
): Promise<CartPreview> {
  const context = await loadRetailerPricing(
    db,
    retailer.id,
    lines.map((line) => line.productId),
    now,
  );

  const priced = priceCart({
    lines,
    products: context.products,
    schemes: context.rules,
    now,
  });

  return {
    lines: priced.lines,
    totals: priced.totals,
    warnings: priced.warnings,
    nudges: priced.nudges,
    products: Object.fromEntries(context.meta),
    credit: creditPosition(retailer, priced.totals.totalPaisa),
    generatedAt: now.toISOString(),
  };
}
