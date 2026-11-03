import type { LineProduct, PricedLineAmounts } from "@/lib/pricing/line";

export type SchemeType = "buy_x_get_y" | "slab_percent";

export interface SchemeRule {
  id: string;
  name: string;
  type: SchemeType;
  productId: string;
  freeProductId?: string | null;
  buyQty?: number | null;
  freeQty?: number | null;
  minQty?: number | null;
  percentBp?: number | null;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  priority: number;
  active: boolean;
}

export interface SchemeProduct extends LineProduct {
  stockCases: number;
  lowStockThreshold: number;
}

export interface CartLineInput {
  productId: string;
  qtyCases: number;
}

export interface PricedLine extends PricedLineAmounts {
  productId: string;
  skuCode: string;
  name: string;
  packSize: string;
  caseSize: number;
  qtyCases: number;
  paidQtyCases: number;
  freeQtyCases: number;
  isFree: boolean;
  schemeId: string | null;
  schemeName: string | null;
  schemeExplanation: string | null;
  gstRateBp: number;
  priceIncludesGst: boolean;
  lineNo: number;
}

export type CartWarningCode =
  | "INSUFFICIENT_STOCK"
  | "OUT_OF_STOCK"
  | "FREE_STOCK_CAPPED"
  | "UNKNOWN_PRODUCT";

export interface CartWarning {
  code: CartWarningCode;
  productId: string | null;
  message: string;
}

export interface SchemeNudge {
  productId: string;
  schemeId: string;
  schemeName: string;
  type: SchemeType;
  qtyToNext: number;
  potentialSavingPaisa: number;
  message: string;
}

export interface PricedCartTotals {
  paidCases: number;
  freeCases: number;
  subtotalPaisa: number;
  discountPaisa: number;
  freeGoodsValuePaisa: number;
  taxablePaisa: number;
  taxPaisa: number;
  totalPaisa: number;
  savingsPaisa: number;
}

export interface PricedCart {
  lines: PricedLine[];
  totals: PricedCartTotals;
  warnings: CartWarning[];
  nudges: SchemeNudge[];
}

export interface PriceCartInput {
  lines: CartLineInput[];
  products: Map<string, SchemeProduct>;
  schemes: SchemeRule[];
  now?: Date;
  /** Optional stock overrides; defaults to product stock. */
  freeStock?: Map<string, number>;
}
