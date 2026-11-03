import { describe, expect, it } from "vitest";
import { priceCart } from "@/lib/schemes/engine";
import type { SchemeProduct } from "@/lib/schemes/types";
import { fixedNow, makeProduct, makeScheme } from "./fixtures";

function mapOf(...products: SchemeProduct[]) {
  return new Map(products.map((product) => [product.id, product]));
}

describe("scheme engine — buy X get Y", () => {
  it("adds one free case at the exact threshold", () => {
    const biscuit = makeProduct({
      id: "biscuit",
      name: "Glucose biscuit",
      caseSize: 96,
      unitPricePaisa: 810,
      stockCases: 340,
    });

    const cart = priceCart({
      lines: [{ productId: "biscuit", qtyCases: 10 }],
      products: mapOf(biscuit),
      schemes: [makeScheme({ productId: "biscuit", buyQty: 10, freeQty: 1 })],
      now: fixedNow,
    });

    expect(cart.lines).toHaveLength(2);
    const paid = cart.lines[0]!;
    const free = cart.lines[1]!;
    expect(paid.qtyCases).toBe(10);
    expect(free.isFree).toBe(true);
    expect(free.qtyCases).toBe(1);
    expect(free.lineTotalPaisa).toBe(0);
    expect(cart.totals.freeCases).toBe(1);
    expect(cart.totals.freeGoodsValuePaisa).toBe(77760);
    expect(cart.totals.savingsPaisa).toBe(77760);
    expect(cart.nudges).toHaveLength(0);
  });

  it("does not add free goods one case below the threshold and shows a nudge", () => {
    const biscuit = makeProduct({
      id: "biscuit",
      unitPricePaisa: 810,
      caseSize: 96,
    });
    const cart = priceCart({
      lines: [{ productId: "biscuit", qtyCases: 9 }],
      products: mapOf(biscuit),
      schemes: [makeScheme({ productId: "biscuit" })],
      now: fixedNow,
    });

    expect(cart.lines).toHaveLength(1);
    expect(cart.totals.freeCases).toBe(0);
    expect(cart.nudges[0]).toMatchObject({
      qtyToNext: 1,
      type: "buy_x_get_y",
      potentialSavingPaisa: 77760,
    });
  });

  it("gives two free cases at double the threshold without compounding", () => {
    const biscuit = makeProduct({
      id: "biscuit",
      unitPricePaisa: 810,
      caseSize: 96,
    });
    const cart = priceCart({
      lines: [{ productId: "biscuit", qtyCases: 20 }],
      products: mapOf(biscuit),
      schemes: [makeScheme({ productId: "biscuit" })],
      now: fixedNow,
    });

    expect(cart.totals.freeCases).toBe(2);
    expect(cart.lines.filter((line) => line.isFree)).toHaveLength(1);
  });

  it("aggregates multiple lines of the same SKU before applying the scheme", () => {
    const biscuit = makeProduct({ id: "biscuit" });
    const cart = priceCart({
      lines: [
        { productId: "biscuit", qtyCases: 5 },
        { productId: "biscuit", qtyCases: 5 },
      ],
      products: mapOf(biscuit),
      schemes: [makeScheme({ productId: "biscuit" })],
      now: fixedNow,
    });

    expect(cart.lines).toHaveLength(2);
    expect(cart.lines[0]!.qtyCases).toBe(10);
    expect(cart.totals.freeCases).toBe(1);
  });

  it("caps free goods at available free stock and explains the shortfall", () => {
    const biscuit = makeProduct({ id: "biscuit", stockCases: 10 });
    const cart = priceCart({
      lines: [{ productId: "biscuit", qtyCases: 10 }],
      products: mapOf(biscuit),
      schemes: [makeScheme({ productId: "biscuit" })],
      now: fixedNow,
    });

    expect(cart.totals.freeCases).toBe(0);
    expect(cart.warnings.map((warning) => warning.code)).toContain(
      "FREE_STOCK_CAPPED",
    );
  });
});

describe("scheme engine — slab percent", () => {
  it("applies the slab at the exact threshold", () => {
    const detergent = makeProduct({
      id: "detergent",
      name: "Detergent 1 kg",
      caseSize: 20,
      unitPricePaisa: 10150,
    });

    const cart = priceCart({
      lines: [{ productId: "detergent", qtyCases: 5 }],
      products: mapOf(detergent),
      schemes: [
        makeScheme({
          productId: "detergent",
          type: "slab_percent",
          minQty: 5,
          percentBp: 300,
          buyQty: null,
          freeQty: null,
        }),
      ],
      now: fixedNow,
    });

    expect(cart.totals.discountPaisa).toBe(30450);
    expect(cart.totals.totalPaisa).toBe(1_015_000 - 30_450);
    expect(cart.lines[0]!.schemeExplanation).toContain("3% off");
  });

  it("does not apply below the threshold and shows the quantity gap", () => {
    const detergent = makeProduct({
      id: "detergent",
      caseSize: 20,
      unitPricePaisa: 10150,
    });

    const cart = priceCart({
      lines: [{ productId: "detergent", qtyCases: 4 }],
      products: mapOf(detergent),
      schemes: [
        makeScheme({
          productId: "detergent",
          type: "slab_percent",
          minQty: 5,
          percentBp: 300,
          buyQty: null,
          freeQty: null,
        }),
      ],
      now: fixedNow,
    });

    expect(cart.totals.discountPaisa).toBe(0);
    expect(cart.nudges[0]).toMatchObject({
      qtyToNext: 1,
      type: "slab_percent",
    });
  });

  it("rounds a half-paisa discount half-up at line level", () => {
    const product = makeProduct({
      id: "rounding",
      caseSize: 10,
      unitPricePaisa: 105,
    });

    const cart = priceCart({
      lines: [{ productId: "rounding", qtyCases: 1 }],
      products: mapOf(product),
      schemes: [
        makeScheme({
          productId: "rounding",
          type: "slab_percent",
          minQty: 1,
          percentBp: 500,
          buyQty: null,
          freeQty: null,
        }),
      ],
      now: fixedNow,
    });

    // 1050 × 5% = 52.5 paisa, which rounds to 53.
    expect(cart.totals.discountPaisa).toBe(53);
  });
});

describe("scheme engine — precedence and dates", () => {
  it("chooses the single best scheme when schemes overlap", () => {
    const biscuit = makeProduct({
      id: "biscuit",
      caseSize: 96,
      unitPricePaisa: 810,
    });
    const buyTen = makeScheme({
      id: "buy-ten",
      productId: "biscuit",
      type: "buy_x_get_y",
      buyQty: 10,
      freeQty: 1,
      priority: 100,
    });
    const slab = makeScheme({
      id: "slab",
      productId: "biscuit",
      type: "slab_percent",
      buyQty: null,
      freeQty: null,
      minQty: 6,
      percentBp: 200,
      priority: 90,
    });

    const cart = priceCart({
      lines: [{ productId: "biscuit", qtyCases: 10 }],
      products: mapOf(biscuit),
      schemes: [slab, buyTen],
      now: fixedNow,
    });

    expect(cart.lines[0]!.schemeId).toBe("buy-ten");
    expect(cart.totals.freeCases).toBe(1);
    expect(cart.totals.discountPaisa).toBe(0);
  });

  it("nudges towards a better scheme even when a smaller scheme applies", () => {
    const biscuit = makeProduct({
      id: "biscuit",
      caseSize: 96,
      unitPricePaisa: 810,
    });
    const buyTen = makeScheme({
      id: "buy-ten",
      productId: "biscuit",
      type: "buy_x_get_y",
      buyQty: 10,
      freeQty: 1,
    });
    const slab = makeScheme({
      id: "slab",
      productId: "biscuit",
      type: "slab_percent",
      buyQty: null,
      freeQty: null,
      minQty: 6,
      percentBp: 200,
      priority: 90,
    });

    const cart = priceCart({
      lines: [{ productId: "biscuit", qtyCases: 8 }],
      products: mapOf(biscuit),
      schemes: [buyTen, slab],
      now: fixedNow,
    });

    expect(cart.lines[0]!.schemeId).toBe("slab");
    expect(cart.nudges[0]).toMatchObject({
      schemeId: "buy-ten",
      qtyToNext: 2,
      potentialSavingPaisa: 77760,
    });
  });

  it("ignores an expired scheme entirely", () => {
    const product = makeProduct({
      id: "cleaner",
      caseSize: 40,
      unitPricePaisa: 5200,
    });
    const cart = priceCart({
      lines: [{ productId: "cleaner", qtyCases: 10 }],
      products: mapOf(product),
      schemes: [
        makeScheme({
          productId: "cleaner",
          type: "slab_percent",
          buyQty: null,
          freeQty: null,
          minQty: 5,
          percentBp: 400,
          endsAt: new Date("2026-10-15T23:59:59Z"),
        }),
      ],
      now: fixedNow,
    });

    expect(cart.totals.discountPaisa).toBe(0);
    expect(cart.nudges).toHaveLength(0);
    expect(cart.lines[0]!.schemeId).toBeNull();
  });

  it("ignores an inactive scheme", () => {
    const biscuit = makeProduct({ id: "biscuit" });
    const cart = priceCart({
      lines: [{ productId: "biscuit", qtyCases: 10 }],
      products: mapOf(biscuit),
      schemes: [makeScheme({ productId: "biscuit", active: false })],
      now: fixedNow,
    });

    expect(cart.totals.freeCases).toBe(0);
    expect(cart.nudges).toHaveLength(0);
  });
});

describe("scheme engine — stock and unknown products", () => {
  it("warns when the paid quantity exceeds stock", () => {
    const biscuit = makeProduct({ id: "biscuit", stockCases: 3 });
    const cart = priceCart({
      lines: [{ productId: "biscuit", qtyCases: 5 }],
      products: mapOf(biscuit),
      schemes: [],
      now: fixedNow,
    });

    expect(cart.warnings.map((warning) => warning.code)).toContain(
      "INSUFFICIENT_STOCK",
    );
  });

  it("warns when a product is out of stock", () => {
    const tea = makeProduct({ id: "tea", stockCases: 0 });
    const cart = priceCart({
      lines: [{ productId: "tea", qtyCases: 1 }],
      products: mapOf(tea),
      schemes: [],
      now: fixedNow,
    });

    expect(cart.warnings.map((warning) => warning.code)).toContain(
      "OUT_OF_STOCK",
    );
  });

  it("ignores unknown products and warns", () => {
    const cart = priceCart({
      lines: [{ productId: "missing", qtyCases: 1 }],
      products: new Map(),
      schemes: [],
      now: fixedNow,
    });

    expect(cart.lines).toHaveLength(0);
    expect(cart.warnings[0]?.code).toBe("UNKNOWN_PRODUCT");
  });
});

describe("scheme engine — totals", () => {
  it("reconciles line totals with the order total and splits inclusive GST", () => {
    const product = makeProduct({
      id: "inclusive",
      caseSize: 1,
      unitPricePaisa: 11800,
      gstRateBp: 1800,
      priceIncludesGst: true,
    });

    const cart = priceCart({
      lines: [{ productId: "inclusive", qtyCases: 1 }],
      products: mapOf(product),
      schemes: [],
      now: fixedNow,
    });

    const line = cart.lines[0]!;
    expect(line.taxablePaisa).toBe(10000);
    expect(line.taxPaisa).toBe(1800);
    expect(line.lineTotalPaisa).toBe(11800);
    expect(cart.totals.totalPaisa).toBe(11800);
    expect(cart.lines.reduce((sum, item) => sum + item.lineTotalPaisa, 0)).toBe(
      cart.totals.totalPaisa,
    );
  });

  it("adds GST on an exclusive price", () => {
    const product = makeProduct({
      id: "exclusive",
      caseSize: 1,
      unitPricePaisa: 11800,
      gstRateBp: 1800,
      priceIncludesGst: false,
    });

    const cart = priceCart({
      lines: [{ productId: "exclusive", qtyCases: 1 }],
      products: mapOf(product),
      schemes: [],
      now: fixedNow,
    });

    expect(cart.lines[0]!.lineTotalPaisa).toBe(13924);
    expect(cart.totals.totalPaisa).toBe(13924);
  });
});
