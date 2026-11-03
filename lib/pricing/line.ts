import { gstBreakdown, mulDivRoundHalfUp } from "@/lib/pricing/money";

export interface LineProduct {
  id: string;
  skuCode: string;
  name: string;
  packSize: string;
  caseSize: number;
  /** Resolved retailer price for one pack, in paisa. */
  unitPricePaisa: number;
  gstRateBp: number;
  priceIncludesGst: boolean;
}

export interface PricedLineAmounts {
  unitPricePaisa: number;
  subtotalPaisa: number;
  discountPaisa: number;
  taxablePaisa: number;
  taxPaisa: number;
  lineTotalPaisa: number;
}

export function casePricePaisa(product: LineProduct): number {
  return product.unitPricePaisa * product.caseSize;
}

/**
 * Prices one paid line. `discountPaisa` is the scheme discount applied to the
 * paid line subtotal. GST is computed on the discounted value and rounded
 * half-up at line level.
 */
export function pricePaidLine(
  product: LineProduct,
  qtyCases: number,
  discountPaisa = 0,
): PricedLineAmounts {
  if (qtyCases <= 0) throw new Error("Quantity must be positive");

  const unitPricePaisa = casePricePaisa(product);
  const subtotalPaisa = unitPricePaisa * qtyCases;
  if (discountPaisa < 0) throw new Error("Discount cannot be negative");
  const cappedDiscount = Math.min(discountPaisa, subtotalPaisa);
  const netPaisa = subtotalPaisa - cappedDiscount;
  const breakdown = gstBreakdown(
    netPaisa,
    product.gstRateBp,
    product.priceIncludesGst,
  );

  return {
    unitPricePaisa,
    subtotalPaisa,
    discountPaisa: cappedDiscount,
    taxablePaisa: breakdown.taxablePaisa,
    taxPaisa: breakdown.taxPaisa,
    lineTotalPaisa: breakdown.totalPaisa,
  };
}

export function slabDiscountPaisa(
  subtotalPaisa: number,
  percentBp: number,
): number {
  return Math.min(
    subtotalPaisa,
    mulDivRoundHalfUp(subtotalPaisa, percentBp, 10_000),
  );
}
