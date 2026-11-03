import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  brands,
  categories,
  products,
  retailerPrices,
  schemes,
} from "@/lib/db/schema";
import type {
  CatalogueFilters,
  CatalogueProduct,
  CatalogueResult,
  CatalogueScheme,
  StockStatus,
} from "@/lib/catalogue/types";
import { formatDateIst } from "@/lib/utils";
import { percentFromBp } from "@/lib/pricing/money";

function stockStatus(
  stockCases: number,
  lowStockThreshold: number,
): StockStatus {
  if (stockCases <= 0) return "out";
  if (stockCases <= lowStockThreshold) return "low";
  return "in";
}

function describeScheme(
  scheme: typeof schemes.$inferSelect,
  freeProductName: string | null,
): CatalogueScheme {
  if (scheme.type === "buy_x_get_y") {
    const isSameProduct = !scheme.freeProductId;
    return {
      id: scheme.id,
      name: scheme.name,
      type: scheme.type,
      label: `Buy ${scheme.buyQty} get ${scheme.freeQty} free`,
      terms: isSameProduct
        ? `Buy ${scheme.buyQty} cases, get ${scheme.freeQty} case${scheme.freeQty === 1 ? "" : "s"} free. Free stock is limited.`
        : `Buy ${scheme.buyQty} cases, get ${scheme.freeQty} case${scheme.freeQty === 1 ? "" : "s"} of ${freeProductName ?? "the free product"} free. Free stock is limited.`,
      endsAt: scheme.endsAt?.toISOString() ?? null,
    };
  }

  return {
    id: scheme.id,
    name: scheme.name,
    type: scheme.type,
    label: `${percentFromBp(scheme.percentBp ?? 0)} off ${scheme.minQty}+`,
    terms: `Get ${percentFromBp(scheme.percentBp ?? 0)} off when you order ${scheme.minQty} or more cases.`,
    endsAt: scheme.endsAt?.toISOString() ?? null,
  };
}

export async function getCatalogue(
  retailerId: string,
  filters: CatalogueFilters = {},
  now = new Date(),
): Promise<CatalogueResult> {
  const conditions = [eq(products.active, true)];

  if (filters.category) {
    conditions.push(eq(categories.slug, filters.category));
  }
  if (filters.brand) {
    conditions.push(eq(brands.slug, filters.brand));
  }
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim().replace(/[%_\\]/g, "")}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.skuCode, term),
        ilike(brands.name, term),
        ilike(categories.name, term),
        sql`array_to_string(${products.hindiAliases}, ' ') ILIKE ${term}`,
      )!,
    );
  }

  const rows = await db
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
      brandSlug: brands.slug,
      brandAccent: brands.accent,
      categoryName: categories.name,
      categoryNameHi: categories.nameHi,
      categorySlug: categories.slug,
      categorySortOrder: categories.sortOrder,
    })
    .from(products)
    .innerJoin(brands, eq(brands.id, products.brandId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conditions))
    .orderBy(asc(categories.sortOrder), asc(brands.name), asc(products.name));

  const productIds = rows.map((row) => row.id);

  const priceRows = await db
    .select({
      productId: retailerPrices.productId,
      pricePaisa: retailerPrices.pricePaisa,
      validFrom: retailerPrices.validFrom,
    })
    .from(retailerPrices)
    .where(
      and(
        eq(retailerPrices.retailerId, retailerId),
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

  const liveSchemes = await db
    .select()
    .from(schemes)
    .where(
      and(
        eq(schemes.active, true),
        lte(schemes.startsAt, now),
        or(isNull(schemes.endsAt), gte(schemes.endsAt, now))!,
      ),
    )
    .orderBy(asc(schemes.priority));

  const allProductNames = await db
    .select({ id: products.id, name: products.name })
    .from(products);
  const productNameById = new Map(
    allProductNames.map((product) => [product.id, product.name]),
  );

  const bestSchemeByProduct = new Map<string, CatalogueScheme>();
  for (const scheme of liveSchemes) {
    if (!productIds.includes(scheme.productId)) continue;
    if (bestSchemeByProduct.has(scheme.productId)) continue;
    bestSchemeByProduct.set(
      scheme.productId,
      describeScheme(
        scheme,
        scheme.freeProductId
          ? (productNameById.get(scheme.freeProductId) ?? null)
          : null,
      ),
    );
  }

  const categoryRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      nameHi: categories.nameHi,
      slug: categories.slug,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder));

  const brandRows = await db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
    })
    .from(brands)
    .orderBy(asc(brands.name));

  const mapped: CatalogueProduct[] = rows.map((row) => {
    const override = overrideByProduct.get(row.id);
    const pricePerPackPaisa = override ?? row.dealerPricePaisa;

    return {
      id: row.id,
      skuCode: row.skuCode,
      name: row.name,
      hindiAliases: row.hindiAliases,
      brandName: row.brandName,
      brandSlug: row.brandSlug,
      brandAccent: row.brandAccent,
      categoryName: row.categoryName,
      categoryNameHi: row.categoryNameHi,
      categorySlug: row.categorySlug,
      packSize: row.packSize,
      packUnit: row.packUnit,
      caseSize: row.caseSize,
      pricePerPackPaisa,
      casePricePaisa: pricePerPackPaisa * row.caseSize,
      dealerPricePaisa: row.dealerPricePaisa,
      isRetailerPrice: override !== undefined,
      priceIncludesGst: row.priceIncludesGst,
      gstRateBp: row.gstRateBp,
      stockCases: row.stockCases,
      lowStockThreshold: row.lowStockThreshold,
      stockStatus: stockStatus(row.stockCases, row.lowStockThreshold),
      imageKey: row.imageKey,
      scheme: bestSchemeByProduct.get(row.id) ?? null,
    };
  });

  return {
    products: mapped,
    categories: categoryRows,
    brands: brandRows,
    filters: {
      q: filters.q?.trim() || undefined,
      category: filters.category || undefined,
      brand: filters.brand || undefined,
    },
    total: mapped.length,
  };
}

export function schemeEndLabel(scheme: CatalogueScheme): string | null {
  if (!scheme.endsAt) return null;
  return `Ends ${formatDateIst(scheme.endsAt, false)}`;
}
