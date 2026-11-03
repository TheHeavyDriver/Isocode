import { describe, expect, it } from "vitest";
import { seedProducts } from "@/lib/db/seed-data";
import {
  extractQuantity,
  matchProductWords,
  parseOrderText,
} from "@/lib/ai/parser";
import type { MatchContext, MatchProduct } from "@/lib/ai/types";

function context(): MatchContext {
  const products: MatchProduct[] = seedProducts
    .filter((product) => product.active !== false)
    .map((product) => ({
      id: product.id,
      skuCode: product.skuCode,
      name: product.name,
      hindiAliases: product.hindiAliases,
      packSize: product.packSize,
      caseSize: product.caseSize,
      stockCases: product.stockCases,
    }));

  return { products, aliases: [], pastOrderCounts: new Map() };
}

describe("extractQuantity", () => {
  it("reads a case quantity and strips it from the product words", () => {
    const result = extractQuantity("10 peti glucose biscuit");
    expect(result.qty).toBe(10);
    expect(result.unit).toBe("case");
    expect(result.cleaned).toContain("glucose");
    expect(result.cleaned).not.toContain("peti");
  });

  it("reads a piece quantity and flags it for clarification", () => {
    const result = extractQuantity("5 piece marie biscuit");
    expect(result.qty).toBe(5);
    expect(result.unit).toBe("piece");
  });

  it("marks a bare leading number as an unclear unit", () => {
    const result = extractQuantity("12 marie biscuit");
    expect(result.qty).toBe(12);
    expect(result.unit).toBe("unclear");
  });
});

describe("parseOrderText — deterministic evaluation set", () => {
  const cases: Array<{
    name: string;
    text: string;
    expected: Array<{ skuCode: string; qty: number; unit: string }>;
  }> = [
    {
      name: "English biscuits with aur",
      text: "10 case glucose biscuit 75 g aur 5 case Marie biscuit 150 g bhej do",
      expected: [
        { skuCode: "SKU-BS-075", qty: 10, unit: "case" },
        { skuCode: "SKU-BS-150", qty: 5, unit: "case" },
      ],
    },
    {
      name: "Hindi Devanagari with peti",
      text: "भैया 12 पेटी मारी बिस्किट और 6 पेटी डिटर्जेंट 1 किलो भेज दो",
      expected: [
        { skuCode: "SKU-BS-150", qty: 12, unit: "case" },
        { skuCode: "SKU-DT-1KG", qty: 6, unit: "case" },
      ],
    },
    {
      name: "Mixed three-line message",
      text: "5 case detergent 1 kg, 8 case aloo bhujia 100 g, 2 case dishwash 500 ml",
      expected: [
        { skuCode: "SKU-DT-1KG", qty: 5, unit: "case" },
        { skuCode: "SKU-SN-100", qty: 8, unit: "case" },
        { skuCode: "SKU-DL-500", qty: 2, unit: "case" },
      ],
    },
    {
      name: "Pack size disambiguates cream biscuit",
      text: "20 peti cream biscuit 200g",
      expected: [{ skuCode: "SKU-BS-200", qty: 20, unit: "case" }],
    },
    {
      name: "Quantity at the end of the line",
      text: "chai patti 500 g ki 7 peti",
      expected: [{ skuCode: "SKU-TE-500", qty: 7, unit: "case" }],
    },
    {
      name: "Box used as a case word",
      text: "3 box digestive biscuit",
      expected: [{ skuCode: "SKU-BS-300", qty: 3, unit: "case" }],
    },
    {
      name: "Salt biscuit small pack",
      text: "15 peti salt biscuit 50 g",
      expected: [{ skuCode: "SKU-BS-050", qty: 15, unit: "case" }],
    },
    {
      name: "Litre alias for floor cleaner",
      text: "4 case floor cleaner 1 litre",
      expected: [{ skuCode: "SKU-SF-1L", qty: 4, unit: "case" }],
    },
    {
      name: "Bath soap pack size",
      text: "6 case bath soap 150 g",
      expected: [{ skuCode: "SKU-SO-150", qty: 6, unit: "case" }],
    },
    {
      name: "Tea bags",
      text: "2 case tea bags 20 s",
      expected: [{ skuCode: "SKU-TE-DIP", qty: 2, unit: "case" }],
    },
  ];

  it.each(cases)("$name", ({ text, expected }) => {
    const parsed = parseOrderText(text, context());
    expect(parsed.lines).toHaveLength(expected.length);
    parsed.lines.forEach((line, index) => {
      const target = expected[index]!;
      expect(line.productId).not.toBeNull();
      const sku = context().products.find(
        (product) => product.id === line.productId,
      )?.skuCode;
      expect(sku).toBe(target.skuCode);
      expect(line.qty).toBe(target.qty);
      expect(line.unit).toBe(target.unit);
      expect(line.needsClarification).toBe(false);
    });
  });

  it("flags a piece quantity instead of silently converting it", () => {
    const parsed = parseOrderText("5 piece marie biscuit 150 g", context());
    expect(parsed.lines[0]?.productId).not.toBeNull();
    expect(parsed.lines[0]?.unit).toBe("piece");
    expect(parsed.lines[0]?.needsClarification).toBe(true);
  });

  it("leaves an unknown product unmatched rather than inventing a SKU", () => {
    const parsed = parseOrderText("10 case birthday candles", context());
    expect(parsed.lines[0]?.productId).toBeNull();
    expect(parsed.lines[0]?.matchMethod).toBe("unmatched");
    expect(parsed.lines[0]?.confidenceBp).toBe(0);
  });

  it("uses a retailer alias before fuzzy matching", () => {
    const ctx = context();
    const product = ctx.products.find(
      (entry) => entry.skuCode === "SKU-BS-075",
    )!;
    ctx.aliases = [{ normalizedTerm: "chhota", productId: product.id }];

    const line = matchProductWords(
      {
        rawText: "10 case chhota wala",
        words: "chhota wala",
        qty: 10,
        unit: "case",
        hadExplicitUnit: true,
      },
      ctx,
    );

    expect(line.productId).toBe(product.id);
    expect(line.matchMethod).toBe("retailer_alias");
    expect(line.needsClarification).toBe(false);
  });

  it("caps model confidence so an LLM cannot claim certainty", () => {
    const product = context().products.find(
      (entry) => entry.skuCode === "SKU-BS-075",
    )!;
    const line = matchProductWords(
      {
        rawText: "10 case glucose biscuit 75 g",
        words: "glucose biscuit 75 g",
        qty: 10,
        unit: "case",
        hadExplicitUnit: true,
      },
      context(),
      5500,
    );
    expect(line.productId).toBe(product.id);
    expect(line.confidenceBp).toBeLessThanOrEqual(5500);
  });
});
