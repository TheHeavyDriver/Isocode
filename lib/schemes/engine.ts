import { formatInr, percentFromBp } from "@/lib/pricing/money";
import {
  casePricePaisa,
  pricePaidLine,
  slabDiscountPaisa,
} from "@/lib/pricing/line";
import type {
  CartWarning,
  PricedCart,
  PricedCartTotals,
  PricedLine,
  PriceCartInput,
  SchemeNudge,
  SchemeProduct,
  SchemeRule,
} from "@/lib/schemes/types";

interface SchemeEvaluation {
  scheme: SchemeRule;
  discountPaisa: number;
  freeProduct: SchemeProduct | null;
  requestedFreeQty: number;
  cappedFreeQty: number;
  savingPaisa: number;
  explanation: string;
  cappedByStock: boolean;
}

function toTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function isSchemeLive(scheme: SchemeRule, now: Date): boolean {
  if (!scheme.active) return false;
  if (scheme.type === "buy_x_get_y") {
    if (!scheme.buyQty || scheme.buyQty <= 0) return false;
    if (!scheme.freeQty || scheme.freeQty <= 0) return false;
  }
  if (scheme.type === "slab_percent") {
    if (!scheme.minQty || scheme.minQty <= 0) return false;
    if (!scheme.percentBp || scheme.percentBp <= 0) return false;
  }

  const nowMs = now.getTime();
  if (toTime(scheme.startsAt) > nowMs) return false;
  if (scheme.endsAt && toTime(scheme.endsAt) < nowMs) return false;
  return true;
}

function evaluateScheme(
  scheme: SchemeRule,
  product: SchemeProduct,
  qtyCases: number,
  products: Map<string, SchemeProduct>,
  remainingStock: Map<string, number>,
): SchemeEvaluation | null {
  const unitPricePaisa = casePricePaisa(product);
  const subtotalPaisa = unitPricePaisa * qtyCases;

  if (scheme.type === "slab_percent") {
    const minQty = scheme.minQty ?? 0;
    const percentBp = scheme.percentBp ?? 0;
    if (qtyCases < minQty) return null;

    const discountPaisa = slabDiscountPaisa(subtotalPaisa, percentBp);
    if (discountPaisa <= 0) return null;

    return {
      scheme,
      discountPaisa,
      freeProduct: null,
      requestedFreeQty: 0,
      cappedFreeQty: 0,
      savingPaisa: discountPaisa,
      explanation: `${percentFromBp(percentBp)} off on ${minQty}+ cases — ${formatInr(discountPaisa)} saved.`,
      cappedByStock: false,
    };
  }

  const buyQty = scheme.buyQty ?? 0;
  const freeQty = scheme.freeQty ?? 0;
  const earnedFreeQty = Math.floor(qtyCases / buyQty) * freeQty;
  if (earnedFreeQty <= 0) return null;

  const freeProduct = products.get(scheme.freeProductId ?? product.id);
  if (!freeProduct) return null;

  const availableFreeStock = Math.max(
    0,
    remainingStock.get(freeProduct.id) ?? 0,
  );
  const cappedFreeQty = Math.min(earnedFreeQty, availableFreeStock);
  const freeCasePrice = casePricePaisa(freeProduct);
  const savingPaisa = cappedFreeQty * freeCasePrice;

  let explanation =
    scheme.freeProductId && scheme.freeProductId !== product.id
      ? `Buy ${buyQty} ${product.name}, get ${freeQty} ${freeProduct.name} free.`
      : `Buy ${buyQty}, get ${freeQty} free.`;

  if (cappedFreeQty < earnedFreeQty) {
    explanation += ` Only ${cappedFreeQty} of ${earnedFreeQty} free cases fit available stock.`;
  } else if (cappedFreeQty > 0) {
    explanation += ` ${cappedFreeQty} free case${cappedFreeQty === 1 ? "" : "s"} added.`;
  }

  return {
    scheme,
    discountPaisa: 0,
    freeProduct,
    requestedFreeQty: earnedFreeQty,
    cappedFreeQty,
    savingPaisa,
    explanation,
    cappedByStock: cappedFreeQty < earnedFreeQty,
  };
}

function compareEvaluations(a: SchemeEvaluation, b: SchemeEvaluation): number {
  if (b.savingPaisa !== a.savingPaisa) return b.savingPaisa - a.savingPaisa;
  if (a.scheme.priority !== b.scheme.priority) {
    return a.scheme.priority - b.scheme.priority;
  }
  return a.scheme.id.localeCompare(b.scheme.id);
}

function nudgeFor(
  scheme: SchemeRule,
  product: SchemeProduct,
  qtyCases: number,
  products: Map<string, SchemeProduct>,
  remainingStock: Map<string, number>,
  appliedSavingPaisa: number,
): SchemeNudge | null {
  if (scheme.type === "slab_percent") {
    const minQty = scheme.minQty ?? 0;
    const percentBp = scheme.percentBp ?? 0;
    if (qtyCases >= minQty) return null;

    const gap = minQty - qtyCases;
    const potential = slabDiscountPaisa(
      casePricePaisa(product) * minQty,
      percentBp,
    );
    if (potential <= appliedSavingPaisa) return null;

    return {
      productId: product.id,
      schemeId: scheme.id,
      schemeName: scheme.name,
      type: scheme.type,
      qtyToNext: gap,
      potentialSavingPaisa: potential,
      message: `Add ${gap} more case${gap === 1 ? "" : "s"} for ${percentFromBp(percentBp)} off — save ${formatInr(potential)}.`,
    };
  }

  const buyQty = scheme.buyQty ?? 0;
  const freeQty = scheme.freeQty ?? 0;
  const freeProduct = products.get(scheme.freeProductId ?? product.id);
  if (!freeProduct) return null;
  if ((remainingStock.get(freeProduct.id) ?? 0) <= 0) return null;

  const nextThreshold = (Math.floor(qtyCases / buyQty) + 1) * buyQty;
  const gap = nextThreshold - qtyCases;
  const freeAtThreshold = Math.floor(nextThreshold / buyQty) * freeQty;
  const potential =
    Math.min(freeAtThreshold, remainingStock.get(freeProduct.id) ?? 0) *
    casePricePaisa(freeProduct);
  if (potential <= appliedSavingPaisa) return null;

  const extraFree = Math.min(freeAtThreshold, freeQty);
  return {
    productId: product.id,
    schemeId: scheme.id,
    schemeName: scheme.name,
    type: scheme.type,
    qtyToNext: gap,
    potentialSavingPaisa: potential,
    message: `Add ${gap} more case${gap === 1 ? "" : "s"} for ${extraFree} free — save ${formatInr(potential)}.`,
  };
}

export function priceCart(input: PriceCartInput): PricedCart {
  const now = input.now ?? new Date();
  const warnings: CartWarning[] = [];
  const order: string[] = [];
  const qtyByProduct = new Map<string, number>();

  for (const line of input.lines) {
    if (!Number.isInteger(line.qtyCases) || line.qtyCases <= 0) continue;

    const product = input.products.get(line.productId);
    if (!product) {
      warnings.push({
        code: "UNKNOWN_PRODUCT",
        productId: line.productId,
        message: "This product is no longer available.",
      });
      continue;
    }

    if (!qtyByProduct.has(line.productId)) {
      order.push(line.productId);
      qtyByProduct.set(line.productId, 0);
    }
    qtyByProduct.set(
      line.productId,
      (qtyByProduct.get(line.productId) ?? 0) + line.qtyCases,
    );
  }

  const remainingStock = new Map<string, number>();
  for (const [productId, product] of input.products) {
    remainingStock.set(
      productId,
      Math.max(0, input.freeStock?.get(productId) ?? product.stockCases),
    );
  }

  // Reserve paid quantities first so free goods are capped by what is left.
  for (const productId of order) {
    const qty = qtyByProduct.get(productId) ?? 0;
    remainingStock.set(productId, (remainingStock.get(productId) ?? 0) - qty);
  }

  const liveSchemes = input.schemes.filter((scheme) =>
    isSchemeLive(scheme, now),
  );

  const lines: PricedLine[] = [];
  const nudges: SchemeNudge[] = [];
  let lineNo = 1;

  for (const productId of order) {
    const product = input.products.get(productId);
    if (!product) continue;

    const qtyCases = qtyByProduct.get(productId) ?? 0;
    if (qtyCases <= 0) continue;

    const stock = product.stockCases;
    if (stock <= 0) {
      warnings.push({
        code: "OUT_OF_STOCK",
        productId,
        message: `${product.name} is out of stock.`,
      });
    } else if (qtyCases > stock) {
      warnings.push({
        code: "INSUFFICIENT_STOCK",
        productId,
        message: `Only ${stock} case${stock === 1 ? "" : "s"} of ${product.name} are available.`,
      });
    }

    const candidates = liveSchemes
      .filter((scheme) => scheme.productId === productId)
      .map((scheme) =>
        evaluateScheme(
          scheme,
          product,
          qtyCases,
          input.products,
          remainingStock,
        ),
      )
      .filter((evaluation): evaluation is SchemeEvaluation =>
        Boolean(evaluation),
      )
      .sort(compareEvaluations);

    const best = candidates[0] ?? null;
    const applied = best && best.savingPaisa > 0 ? best : null;
    const appliedSaving = applied?.savingPaisa ?? 0;

    const amounts = pricePaidLine(
      product,
      qtyCases,
      applied?.discountPaisa ?? 0,
    );

    lines.push({
      ...amounts,
      productId,
      skuCode: product.skuCode,
      name: product.name,
      packSize: product.packSize,
      caseSize: product.caseSize,
      qtyCases,
      paidQtyCases: qtyCases,
      freeQtyCases: 0,
      isFree: false,
      schemeId: applied?.scheme.id ?? null,
      schemeName: applied?.scheme.name ?? null,
      schemeExplanation: applied?.explanation ?? null,
      gstRateBp: product.gstRateBp,
      priceIncludesGst: product.priceIncludesGst,
      lineNo: lineNo++,
    });

    if (applied?.freeProduct && applied.cappedFreeQty > 0) {
      const freeProduct = applied.freeProduct;
      remainingStock.set(
        freeProduct.id,
        (remainingStock.get(freeProduct.id) ?? 0) - applied.cappedFreeQty,
      );

      lines.push({
        productId: freeProduct.id,
        skuCode: freeProduct.skuCode,
        name: freeProduct.name,
        packSize: freeProduct.packSize,
        caseSize: freeProduct.caseSize,
        qtyCases: applied.cappedFreeQty,
        paidQtyCases: 0,
        freeQtyCases: applied.cappedFreeQty,
        isFree: true,
        unitPricePaisa: casePricePaisa(freeProduct),
        subtotalPaisa: 0,
        discountPaisa: 0,
        taxablePaisa: 0,
        taxPaisa: 0,
        lineTotalPaisa: 0,
        schemeId: applied.scheme.id,
        schemeName: applied.scheme.name,
        schemeExplanation: applied.explanation,
        gstRateBp: freeProduct.gstRateBp,
        priceIncludesGst: freeProduct.priceIncludesGst,
        lineNo: lineNo++,
      });
    }

    if (best?.cappedByStock && best.freeProduct) {
      warnings.push({
        code: "FREE_STOCK_CAPPED",
        productId: best.freeProduct.id,
        message: `${product.name}: ${best.requestedFreeQty} free case${best.requestedFreeQty === 1 ? "" : "s"} earned, but only ${best.cappedFreeQty} can be fulfilled from free stock.`,
      });
    }

    const appliedSchemeId = applied?.scheme.id;
    const candidateNudges = candidates
      .filter((evaluation) => evaluation.scheme.id !== appliedSchemeId)
      .map((evaluation) =>
        nudgeFor(
          evaluation.scheme,
          product,
          qtyCases,
          input.products,
          remainingStock,
          appliedSaving,
        ),
      )
      .filter((nudge): nudge is SchemeNudge => Boolean(nudge));

    for (const scheme of liveSchemes.filter(
      (candidate) =>
        candidate.productId === productId &&
        !candidates.some((evaluation) => evaluation.scheme.id === candidate.id),
    )) {
      const nudge = nudgeFor(
        scheme,
        product,
        qtyCases,
        input.products,
        remainingStock,
        appliedSaving,
      );
      if (nudge) candidateNudges.push(nudge);
    }

    candidateNudges.sort((a, b) => {
      if (b.potentialSavingPaisa !== a.potentialSavingPaisa) {
        return b.potentialSavingPaisa - a.potentialSavingPaisa;
      }
      return a.qtyToNext - b.qtyToNext;
    });

    if (candidateNudges[0]) nudges.push(candidateNudges[0]);
  }

  const totals = lines.reduce<PricedCartTotals>(
    (accumulator, line) => {
      if (line.isFree) {
        accumulator.freeCases += line.qtyCases;
        accumulator.freeGoodsValuePaisa += line.qtyCases * line.unitPricePaisa;
      } else {
        accumulator.paidCases += line.qtyCases;
        accumulator.subtotalPaisa += line.subtotalPaisa;
        accumulator.discountPaisa += line.discountPaisa;
        accumulator.taxablePaisa += line.taxablePaisa;
        accumulator.taxPaisa += line.taxPaisa;
        accumulator.totalPaisa += line.lineTotalPaisa;
      }
      return accumulator;
    },
    {
      paidCases: 0,
      freeCases: 0,
      subtotalPaisa: 0,
      discountPaisa: 0,
      freeGoodsValuePaisa: 0,
      taxablePaisa: 0,
      taxPaisa: 0,
      totalPaisa: 0,
      savingsPaisa: 0,
    },
  );

  totals.savingsPaisa = totals.discountPaisa + totals.freeGoodsValuePaisa;

  return { lines, totals, warnings, nudges };
}
