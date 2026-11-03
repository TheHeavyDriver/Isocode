import type { SchemeProduct, SchemeRule } from "@/lib/schemes/types";

export function makeProduct(
  overrides: Partial<SchemeProduct> & { id?: string } = {},
): SchemeProduct {
  return {
    id: overrides.id ?? "p1",
    skuCode: overrides.skuCode ?? "SKU-TEST",
    name: overrides.name ?? "Test product",
    packSize: overrides.packSize ?? "100 g",
    caseSize: overrides.caseSize ?? 10,
    unitPricePaisa: overrides.unitPricePaisa ?? 1000,
    gstRateBp: overrides.gstRateBp ?? 0,
    priceIncludesGst: overrides.priceIncludesGst ?? true,
    stockCases: overrides.stockCases ?? 100,
    lowStockThreshold: overrides.lowStockThreshold ?? 10,
  };
}

export function makeScheme(
  overrides: Partial<SchemeRule> & { id?: string; productId?: string },
): SchemeRule {
  return {
    id: overrides.id ?? "s1",
    name: overrides.name ?? "Test scheme",
    type: overrides.type ?? "buy_x_get_y",
    productId: overrides.productId ?? "p1",
    freeProductId: overrides.freeProductId ?? null,
    buyQty: overrides.buyQty ?? 10,
    freeQty: overrides.freeQty ?? 1,
    minQty: overrides.minQty ?? null,
    percentBp: overrides.percentBp ?? null,
    startsAt: overrides.startsAt ?? new Date("2026-01-01T00:00:00Z"),
    endsAt: overrides.endsAt ?? new Date("2026-12-31T23:59:59Z"),
    priority: overrides.priority ?? 100,
    active: overrides.active ?? true,
  };
}

export const fixedNow = new Date("2026-11-02T10:00:00Z");
