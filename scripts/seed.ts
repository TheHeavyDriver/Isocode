import "./load-env";
import { createHash } from "node:crypto";
import { sql } from "@/lib/db/client";
import { db } from "@/lib/db/client";
import {
  aiCaptureLines,
  aiCaptures,
  aliases,
  auditLogs,
  brands,
  categories,
  exportOrders,
  exports,
  orderItems,
  orders,
  products,
  retailerPrices,
  retailers,
  schemes,
  users,
} from "@/lib/db/schema";
import type { SchemeProduct, SchemeRule } from "@/lib/schemes/types";
import { priceCart } from "@/lib/schemes/engine";
import {
  productIdBySku,
  retailerUserId,
  sampleCaptureText,
  seedAdminUser,
  seedBrands,
  seedCategories,
  seedDeskUsers,
  seedProducts,
  seedRetailerPrices,
  seedRetailers,
  seedSchemes,
  unclearUnitCaptureText,
} from "@/lib/db/seed-data";

type SeedStatus =
  | "pending"
  | "credit_hold"
  | "confirmed"
  | "exported"
  | "cancelled";

interface SeedOrderDef {
  id: string;
  orderNo: string;
  retailer: number;
  status: SeedStatus;
  source: "manual" | "ai" | "repeat";
  createdAt: string;
  notes?: string;
  creditReason?: string;
  lines: Array<{ sku: string; qty: number }>;
}

const orderDefs: SeedOrderDef[] = [
  {
    id: "a2000000-0000-4000-8000-000000000001",
    orderNo: "SO-20261102-0042",
    retailer: 1,
    status: "pending",
    source: "ai",
    createdAt: "2026-11-02T09:10:00+05:30",
    notes: "WhatsApp order captured by AI. Please check the tea line.",
    lines: [
      { sku: "SKU-BS-075", qty: 10 },
      { sku: "SKU-DT-1KG", qty: 5 },
      { sku: "SKU-BS-150", qty: 12 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000002",
    orderNo: "SO-20261102-0041",
    retailer: 2,
    status: "credit_hold",
    source: "manual",
    createdAt: "2026-11-02T08:45:00+05:30",
    creditReason: "Monthly stock order exceeds the available credit limit.",
    lines: [
      { sku: "SKU-BS-075", qty: 20 },
      { sku: "SKU-DT-1KG", qty: 10 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000003",
    orderNo: "SO-20261102-0040",
    retailer: 3,
    status: "confirmed",
    source: "manual",
    createdAt: "2026-11-02T08:20:00+05:30",
    lines: [
      { sku: "SKU-BS-150", qty: 12 },
      { sku: "SKU-DT-500", qty: 5 },
      { sku: "SKU-SN-100", qty: 8 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000004",
    orderNo: "SO-20261101-0039",
    retailer: 4,
    status: "exported",
    source: "ai",
    createdAt: "2026-11-01T17:30:00+05:30",
    lines: [
      { sku: "SKU-BS-075", qty: 10 },
      { sku: "SKU-DT-1KG", qty: 5 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000005",
    orderNo: "SO-20261101-0038",
    retailer: 5,
    status: "confirmed",
    source: "manual",
    createdAt: "2026-11-01T16:10:00+05:30",
    lines: [
      { sku: "SKU-BS-075", qty: 12 },
      { sku: "SKU-SN-200", qty: 6 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000006",
    orderNo: "SO-20261101-0037",
    retailer: 1,
    status: "exported",
    source: "repeat",
    createdAt: "2026-11-01T11:05:00+05:30",
    lines: [
      { sku: "SKU-DT-1KG", qty: 5 },
      { sku: "SKU-BS-250", qty: 2 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000007",
    orderNo: "SO-20261031-0036",
    retailer: 6,
    status: "cancelled",
    source: "manual",
    createdAt: "2026-10-31T18:20:00+05:30",
    notes: "Shop cancelled after a stock correction.",
    lines: [
      { sku: "SKU-BS-075", qty: 5 },
      { sku: "SKU-SN-100", qty: 3 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000008",
    orderNo: "SO-20261031-0035",
    retailer: 7,
    status: "pending",
    source: "ai",
    createdAt: "2026-10-31T12:40:00+05:30",
    lines: [
      { sku: "SKU-BS-075", qty: 10 },
      { sku: "SKU-TE-100", qty: 4 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000009",
    orderNo: "SO-20261030-0034",
    retailer: 8,
    status: "confirmed",
    source: "manual",
    createdAt: "2026-10-30T17:10:00+05:30",
    lines: [
      { sku: "SKU-DT-1KG", qty: 8 },
      { sku: "SKU-DS-500", qty: 3 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000010",
    orderNo: "SO-20261030-0033",
    retailer: 9,
    status: "credit_hold",
    source: "manual",
    createdAt: "2026-10-30T15:55:00+05:30",
    creditReason:
      "Only ₹200 of credit is available. Desk to approve or reject.",
    lines: [
      { sku: "SKU-BS-075", qty: 20 },
      { sku: "SKU-DT-2KG", qty: 5 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000011",
    orderNo: "SO-20261030-0032",
    retailer: 10,
    status: "confirmed",
    source: "manual",
    createdAt: "2026-10-30T10:15:00+05:30",
    lines: [
      { sku: "SKU-ST-1KG", qty: 4 },
      { sku: "SKU-ST-5KG", qty: 3 },
      { sku: "SKU-ST-1L", qty: 2 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000012",
    orderNo: "SO-20261029-0031",
    retailer: 2,
    status: "exported",
    source: "manual",
    createdAt: "2026-10-29T16:35:00+05:30",
    lines: [
      { sku: "SKU-BS-150", qty: 12 },
      { sku: "SKU-SN-100", qty: 8 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000013",
    orderNo: "SO-20261029-0030",
    retailer: 3,
    status: "cancelled",
    source: "ai",
    createdAt: "2026-10-29T11:20:00+05:30",
    notes: "Duplicate of an earlier order.",
    lines: [{ sku: "SKU-BS-050", qty: 10 }],
  },
  {
    id: "a2000000-0000-4000-8000-000000000014",
    orderNo: "SO-20261029-0029",
    retailer: 4,
    status: "pending",
    source: "manual",
    createdAt: "2026-10-29T09:05:00+05:30",
    lines: [
      { sku: "SKU-PC-100", qty: 6 },
      { sku: "SKU-SO-100", qty: 10 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000015",
    orderNo: "SO-20261028-0028",
    retailer: 5,
    status: "exported",
    source: "manual",
    createdAt: "2026-10-28T17:45:00+05:30",
    lines: [
      { sku: "SKU-DT-1KG", qty: 10 },
      { sku: "SKU-DT-500", qty: 10 },
      { sku: "SKU-SF-1L", qty: 4 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000016",
    orderNo: "SO-20261028-0027",
    retailer: 6,
    status: "confirmed",
    source: "manual",
    createdAt: "2026-10-28T14:30:00+05:30",
    lines: [
      { sku: "SKU-ST-500", qty: 5 },
      { sku: "SKU-SN-150", qty: 4 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000017",
    orderNo: "SO-20261027-0026",
    retailer: 7,
    status: "pending",
    source: "manual",
    createdAt: "2026-10-27T18:00:00+05:30",
    lines: [
      { sku: "SKU-BS-075", qty: 30 },
      { sku: "SKU-SN-100", qty: 10 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000018",
    orderNo: "SO-20261027-0025",
    retailer: 8,
    status: "exported",
    source: "ai",
    createdAt: "2026-10-27T13:25:00+05:30",
    lines: [
      { sku: "SKU-BS-075", qty: 10 },
      { sku: "SKU-DT-1KG", qty: 5 },
      { sku: "SKU-TE-100", qty: 4 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000019",
    orderNo: "SO-20261026-0024",
    retailer: 9,
    status: "confirmed",
    source: "manual",
    createdAt: "2026-10-26T16:15:00+05:30",
    lines: [
      { sku: "SKU-BS-150", qty: 12 },
      { sku: "SKU-SN-100", qty: 8 },
    ],
  },
  {
    id: "a2000000-0000-4000-8000-000000000020",
    orderNo: "SO-20261026-0023",
    retailer: 10,
    status: "cancelled",
    source: "manual",
    createdAt: "2026-10-26T10:40:00+05:30",
    lines: [
      { sku: "SKU-DT-1KG", qty: 5 },
      { sku: "SKU-DL-500", qty: 4 },
    ],
  },
];

const schemeRules: SchemeRule[] = seedSchemes.map((scheme) => ({
  id: scheme.id,
  name: scheme.name,
  type: scheme.type,
  productId: productIdBySku[scheme.productSku]!,
  freeProductId: scheme.freeProductSku
    ? productIdBySku[scheme.freeProductSku]
    : null,
  buyQty: scheme.buyQty,
  freeQty: scheme.freeQty,
  minQty: scheme.minQty,
  percentBp: scheme.percentBp,
  startsAt: scheme.startsAt,
  endsAt: scheme.endsAt,
  priority: scheme.priority,
  active: scheme.active,
}));

function productMapForRetailer(
  retailerNumber: number,
): Map<string, SchemeProduct> {
  const overrides = new Map(
    seedRetailerPrices
      .filter((price) => price.retailer === retailerNumber)
      .map((price) => [price.sku, price.pricePaisa]),
  );

  return new Map(
    seedProducts.map((product) => [
      product.id,
      {
        id: product.id,
        skuCode: product.skuCode,
        name: product.name,
        packSize: product.packSize,
        caseSize: product.caseSize,
        unitPricePaisa:
          overrides.get(product.skuCode) ?? product.dealerPricePaisa,
        gstRateBp: product.gstRateBp,
        priceIncludesGst: true,
        stockCases: product.stockCases,
        lowStockThreshold: product.lowStockThreshold,
      },
    ]),
  );
}

const createdAtFor = (order: SeedOrderDef) => new Date(order.createdAt);

async function seed() {
  console.log("Seeding brands, categories, products, and retailers ...");

  await db.transaction(async (tx) => {
    for (const brand of seedBrands) {
      await tx
        .insert(brands)
        .values(brand)
        .onConflictDoUpdate({
          target: brands.id,
          set: { name: brand.name, slug: brand.slug, accent: brand.accent },
        });
    }

    for (const category of seedCategories) {
      await tx
        .insert(categories)
        .values(category)
        .onConflictDoUpdate({
          target: categories.id,
          set: {
            name: category.name,
            nameHi: category.nameHi,
            slug: category.slug,
            sortOrder: category.sortOrder,
          },
        });
    }

    const brandIdBySlug = new Map(
      seedBrands.map((brand) => [brand.slug, brand.id]),
    );
    const categoryIdBySlug = new Map(
      seedCategories.map((category) => [category.slug, category.id]),
    );

    for (const product of seedProducts) {
      const values = {
        id: product.id,
        skuCode: product.skuCode,
        name: product.name,
        hindiAliases: product.hindiAliases,
        brandId: brandIdBySlug.get(product.brandSlug)!,
        categoryId: categoryIdBySlug.get(product.categorySlug)!,
        packSize: product.packSize,
        packUnit: product.packUnit,
        caseSize: product.caseSize,
        dealerPricePaisa: product.dealerPricePaisa,
        priceIncludesGst: true,
        gstRateBp: product.gstRateBp,
        stockCases: product.stockCases,
        lowStockThreshold: product.lowStockThreshold,
        imageKey: product.imageKey,
        active: product.active ?? true,
      };

      await tx
        .insert(products)
        .values(values)
        .onConflictDoUpdate({
          target: products.id,
          set: {
            skuCode: values.skuCode,
            name: values.name,
            hindiAliases: values.hindiAliases,
            brandId: values.brandId,
            categoryId: values.categoryId,
            packSize: values.packSize,
            packUnit: values.packUnit,
            caseSize: values.caseSize,
            dealerPricePaisa: values.dealerPricePaisa,
            priceIncludesGst: values.priceIncludesGst,
            gstRateBp: values.gstRateBp,
            stockCases: values.stockCases,
            lowStockThreshold: values.lowStockThreshold,
            imageKey: values.imageKey,
            active: values.active,
          },
        });
    }

    for (const retailer of seedRetailers) {
      await tx
        .insert(retailers)
        .values(retailer)
        .onConflictDoUpdate({
          target: retailers.id,
          set: {
            shopName: retailer.shopName,
            ownerName: retailer.ownerName,
            phone: retailer.phone,
            address: retailer.address,
            creditLimitPaisa: retailer.creditLimitPaisa,
            outstandingPaisa: retailer.outstandingPaisa,
            language: retailer.language,
          },
        });
    }

    for (const [index, retailer] of seedRetailers.entries()) {
      const user = {
        id: retailerUserId(index + 1),
        phone: retailer.phone,
        name: retailer.ownerName,
        role: "retailer" as const,
        retailerId: retailer.id,
      };
      await tx
        .insert(users)
        .values(user)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            phone: user.phone,
            name: user.name,
            role: user.role,
            retailerId: user.retailerId,
          },
        });
    }

    for (const deskUser of seedDeskUsers) {
      await tx
        .insert(users)
        .values({ ...deskUser, role: "desk" })
        .onConflictDoUpdate({
          target: users.id,
          set: { phone: deskUser.phone, name: deskUser.name, role: "desk" },
        });
    }

    await tx
      .insert(users)
      .values({ ...seedAdminUser, role: "admin" })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          phone: seedAdminUser.phone,
          name: seedAdminUser.name,
          role: "admin",
        },
      });

    const fixedValidityStart = new Date("2026-10-01T00:00:00+05:30");
    for (const [index, price] of seedRetailerPrices.entries()) {
      await tx
        .insert(retailerPrices)
        .values({
          id: `a4000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          retailerId: seedRetailers[price.retailer - 1]!.id,
          productId: productIdBySku[price.sku]!,
          pricePaisa: price.pricePaisa,
          validFrom: fixedValidityStart,
        })
        .onConflictDoUpdate({
          target: retailerPrices.id,
          set: {
            retailerId: seedRetailers[price.retailer - 1]!.id,
            productId: productIdBySku[price.sku]!,
            pricePaisa: price.pricePaisa,
            validFrom: fixedValidityStart,
          },
        });
    }

    for (const scheme of seedSchemes) {
      const values = {
        id: scheme.id,
        name: scheme.name,
        type: scheme.type,
        productId: productIdBySku[scheme.productSku]!,
        freeProductId: scheme.freeProductSku
          ? productIdBySku[scheme.freeProductSku]!
          : null,
        buyQty: scheme.buyQty,
        freeQty: scheme.freeQty,
        minQty: scheme.minQty,
        percentBp: scheme.percentBp,
        startsAt: scheme.startsAt,
        endsAt: scheme.endsAt,
        priority: scheme.priority,
        active: scheme.active,
      };
      await tx
        .insert(schemes)
        .values(values)
        .onConflictDoUpdate({ target: schemes.id, set: values });
    }

    console.log("Seeding aliases ...");
    const aliasDefs = [
      {
        id: "a6000000-0000-4000-8000-000000000001",
        retailerId: seedRetailers[0]!.id,
        rawTerm: "biscuit chhota",
        normalizedTerm: "biscuit chhota",
        productId: productIdBySku["SKU-BS-075"]!,
      },
      {
        id: "a6000000-0000-4000-8000-000000000002",
        retailerId: seedRetailers[0]!.id,
        rawTerm: "washing powder",
        normalizedTerm: "washing powder",
        productId: productIdBySku["SKU-DT-1KG"]!,
      },
      {
        id: "a6000000-0000-4000-8000-000000000003",
        retailerId: seedRetailers[0]!.id,
        rawTerm: "chai patti",
        normalizedTerm: "chai patti",
        productId: productIdBySku["SKU-TE-250"]!,
      },
    ];
    for (const alias of aliasDefs) {
      await tx
        .insert(aliases)
        .values({ ...alias, createdById: retailerUserId(1) })
        .onConflictDoUpdate({
          target: aliases.id,
          set: {
            rawTerm: alias.rawTerm,
            normalizedTerm: alias.normalizedTerm,
            productId: alias.productId,
          },
        });
    }

    console.log("Seeding AI captures ...");
    const captureDefs = [
      {
        id: "a3000000-0000-4000-8000-000000000001",
        retailerId: seedRetailers[0]!.id,
        createdById: retailerUserId(1),
        rawText: sampleCaptureText,
        model: "seeded",
        promptVersion: "seed-v1",
        status: "review" as const,
        createdAt: new Date("2026-11-02T09:05:00+05:30"),
        lines: [
          {
            id: "a3100000-0000-4000-8000-000000000001",
            lineNo: 1,
            rawText: "5 peti biscuit chhota",
            productWords: "biscuit chhota",
            productId: productIdBySku["SKU-BS-075"]!,
            qty: 5,
            unit: "case" as const,
            confidenceBp: 9600,
            alternatives: [],
            needsClarification: false,
            matchMethod: "alias",
          },
          {
            id: "a3100000-0000-4000-8000-000000000002",
            lineNo: 2,
            rawText: "2 peti washing powder 1 kilo",
            productWords: "washing powder 1 kilo",
            productId: productIdBySku["SKU-DT-1KG"]!,
            qty: 2,
            unit: "case" as const,
            confidenceBp: 9400,
            alternatives: [
              { productId: productIdBySku["SKU-DT-500"]!, scoreBp: 2400 },
            ],
            needsClarification: false,
            matchMethod: "alias",
          },
          {
            id: "a3100000-0000-4000-8000-000000000003",
            lineNo: 3,
            rawText: "chai patti 250 wala 1 peti",
            productWords: "chai patti 250",
            productId: productIdBySku["SKU-TE-250"]!,
            qty: 1,
            unit: "case" as const,
            confidenceBp: 9100,
            alternatives: [],
            needsClarification: false,
            matchMethod: "alias",
          },
        ],
      },
      {
        id: "a3000000-0000-4000-8000-000000000002",
        retailerId: seedRetailers[0]!.id,
        createdById: retailerUserId(1),
        rawText: unclearUnitCaptureText,
        model: "seeded",
        promptVersion: "seed-v1",
        status: "review" as const,
        createdAt: new Date("2026-11-02T09:20:00+05:30"),
        lines: [
          {
            id: "a3100000-0000-4000-8000-000000000004",
            lineNo: 1,
            rawText: "3 peti washing powder",
            productWords: "washing powder",
            productId: productIdBySku["SKU-DT-1KG"]!,
            qty: 3,
            unit: "case" as const,
            confidenceBp: 9000,
            alternatives: [],
            needsClarification: false,
            matchMethod: "alias",
          },
          {
            id: "a3100000-0000-4000-8000-000000000005",
            lineNo: 2,
            rawText: "2 chai patti 250",
            productWords: "chai patti 250",
            productId: productIdBySku["SKU-TE-250"]!,
            qty: 2,
            unit: "unclear" as const,
            confidenceBp: 5200,
            alternatives: [],
            needsClarification: true,
            matchMethod: "fuzzy",
          },
          {
            id: "a3100000-0000-4000-8000-000000000006",
            lineNo: 3,
            rawText: "12 biscuit chhota",
            productWords: "biscuit chhota",
            productId: productIdBySku["SKU-BS-075"]!,
            qty: 12,
            unit: "unclear" as const,
            confidenceBp: 4800,
            alternatives: [
              { productId: productIdBySku["SKU-BS-150"]!, scoreBp: 3100 },
            ],
            needsClarification: true,
            matchMethod: "fuzzy",
          },
        ],
      },
    ];

    for (const capture of captureDefs) {
      await tx
        .insert(aiCaptures)
        .values({
          id: capture.id,
          retailerId: capture.retailerId,
          createdById: capture.createdById,
          rawText: capture.rawText,
          model: capture.model,
          promptVersion: capture.promptVersion,
          status: capture.status,
          createdAt: capture.createdAt,
        })
        .onConflictDoNothing({ target: aiCaptures.id });

      for (const line of capture.lines) {
        await tx
          .insert(aiCaptureLines)
          .values({
            ...line,
            captureId: capture.id,
            createdAt: capture.createdAt,
            updatedAt: capture.createdAt,
          })
          .onConflictDoNothing({ target: aiCaptureLines.id });
      }
    }

    console.log("Seeding orders ...");
    const exportedOrderData: Array<{
      orderNo: string;
      date: string;
      party: string;
      lines: Array<{
        skuCode: string;
        name: string;
        qtyCases: number;
        isFree: boolean;
        unitPricePaisa: number;
        discountPaisa: number;
        taxPaisa: number;
        lineTotalPaisa: number;
      }>;
    }> = [];

    for (const orderDef of orderDefs) {
      const retailer = seedRetailers[orderDef.retailer - 1]!;
      const productsForRetailer = productMapForRetailer(orderDef.retailer);
      const priced = priceCart({
        lines: orderDef.lines.map((line) => ({
          productId: productIdBySku[line.sku]!,
          qtyCases: line.qty,
        })),
        products: productsForRetailer,
        schemes: schemeRules,
        now: createdAtFor(orderDef),
      });

      const createdAt = createdAtFor(orderDef);
      const confirmedAt =
        orderDef.status === "confirmed" || orderDef.status === "exported"
          ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
          : null;
      const exportedAt =
        orderDef.status === "exported"
          ? new Date(createdAt.getTime() + 5 * 60 * 60 * 1000)
          : null;
      const cancelledAt =
        orderDef.status === "cancelled"
          ? new Date(createdAt.getTime() + 90 * 60 * 1000)
          : null;

      const inserted = await tx
        .insert(orders)
        .values({
          id: orderDef.id,
          orderNo: orderDef.orderNo,
          retailerId: retailer.id,
          createdById: retailerUserId(orderDef.retailer),
          source: orderDef.source,
          status: orderDef.status,
          creditStatus: orderDef.status === "credit_hold" ? "hold" : "ok",
          creditReason: orderDef.creditReason ?? null,
          subtotalPaisa: priced.totals.subtotalPaisa,
          discountPaisa: priced.totals.discountPaisa,
          taxablePaisa: priced.totals.taxablePaisa,
          taxPaisa: priced.totals.taxPaisa,
          totalPaisa: priced.totals.totalPaisa,
          notes: orderDef.notes ?? null,
          confirmedAt,
          exportedAt,
          cancelledAt,
          createdAt,
          updatedAt: exportedAt ?? cancelledAt ?? confirmedAt ?? createdAt,
        })
        .onConflictDoNothing({ target: orders.orderNo })
        .returning({ id: orders.id });

      if (!inserted[0]) continue;

      await tx.insert(orderItems).values(
        priced.lines.map((line) => ({
          orderId: orderDef.id,
          lineNo: line.lineNo,
          productId: line.productId,
          skuCode: line.skuCode,
          productName: line.name,
          packSize: line.packSize,
          qtyCases: line.qtyCases,
          unitPricePaisa: line.unitPricePaisa,
          subtotalPaisa: line.subtotalPaisa,
          discountPaisa: line.discountPaisa,
          taxablePaisa: line.taxablePaisa,
          taxPaisa: line.taxPaisa,
          lineTotalPaisa: line.lineTotalPaisa,
          gstRateBp: line.gstRateBp,
          isFree: line.isFree,
          schemeId: line.schemeId,
          schemeExplanation: line.schemeExplanation,
          createdAt,
        })),
      );

      const auditBase = {
        actorId: retailerUserId(orderDef.retailer),
        entityType: "order",
        entityId: orderDef.id,
      };
      await tx.insert(auditLogs).values({
        ...auditBase,
        action: "order.created",
        metadata: {
          orderNo: orderDef.orderNo,
          status: orderDef.status,
          source: orderDef.source,
          totalPaisa: priced.totals.totalPaisa,
        },
        createdAt,
      });

      if (orderDef.status === "credit_hold") {
        await tx.insert(auditLogs).values({
          ...auditBase,
          action: "order.credit_hold",
          metadata: { reason: orderDef.creditReason },
          createdAt: new Date(createdAt.getTime() + 20 * 60 * 1000),
        });
      }
      if (confirmedAt) {
        await tx.insert(auditLogs).values({
          ...auditBase,
          action: "order.confirmed",
          metadata: { orderNo: orderDef.orderNo },
          createdAt: confirmedAt,
        });
      }
      if (cancelledAt) {
        await tx.insert(auditLogs).values({
          ...auditBase,
          action: "order.cancelled",
          metadata: { reason: orderDef.notes ?? "Cancelled before export" },
          createdAt: cancelledAt,
        });
      }

      if (orderDef.status === "exported") {
        exportedOrderData.push({
          orderNo: orderDef.orderNo,
          date: orderDef.createdAt.slice(0, 10),
          party: retailer.shopName,
          lines: priced.lines.map((line) => ({
            skuCode: line.skuCode,
            name: line.name,
            qtyCases: line.qtyCases,
            isFree: line.isFree,
            unitPricePaisa: line.unitPricePaisa,
            discountPaisa: line.discountPaisa,
            taxPaisa: line.taxPaisa,
            lineTotalPaisa: line.lineTotalPaisa,
          })),
        });
      }
    }

    console.log("Seeding export log ...");
    const exportedDefs = orderDefs.filter(
      (order) => order.status === "exported",
    );
    const csvHeader =
      "order_no,order_date,party,item_code,item_name,qty_cases,free_cases,rate_inr,discount_inr,tax_inr,total_inr\n";
    const csvRows = exportedOrderData
      .flatMap((order) =>
        order.lines.map((line) =>
          [
            order.orderNo,
            order.date,
            order.party,
            line.skuCode,
            line.name,
            line.qtyCases,
            line.isFree ? line.qtyCases : 0,
            (line.unitPricePaisa / 100).toFixed(2),
            (line.discountPaisa / 100).toFixed(2),
            (line.taxPaisa / 100).toFixed(2),
            (line.lineTotalPaisa / 100).toFixed(2),
          ].join(","),
        ),
      )
      .join("\n");
    const exportContent = `${csvHeader}${csvRows}\n`;
    const exportChecksum = createHash("sha256")
      .update(exportContent)
      .digest("hex");

    const exportDef = {
      id: "a5000000-0000-4000-8000-000000000001",
      format: "csv" as const,
      fileName: "sahaj-order-export-20261101.csv",
      orderCount: exportedDefs.length,
      checksum: exportChecksum,
      content: exportContent,
      createdById: seedDeskUsers[0]!.id,
      createdAt: new Date("2026-11-01T19:05:00+05:30"),
    };
    await tx
      .insert(exports)
      .values(exportDef)
      .onConflictDoUpdate({
        target: exports.id,
        set: {
          fileName: exportDef.fileName,
          orderCount: exportDef.orderCount,
          checksum: exportDef.checksum,
          content: exportDef.content,
        },
      });

    for (const order of exportedDefs) {
      const link = await tx
        .insert(exportOrders)
        .values({ exportId: exportDef.id, orderId: order.id })
        .onConflictDoNothing()
        .returning({ orderId: exportOrders.orderId });

      if (!link[0]) continue;

      await tx.insert(auditLogs).values({
        actorId: seedDeskUsers[0]!.id,
        action: "order.exported",
        entityType: "order",
        entityId: order.id,
        metadata: { exportId: exportDef.id, format: "csv" },
        createdAt: exportDef.createdAt,
      });
    }
  });

  console.log("Seed complete.");
  await sql.end();
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await sql.end();
  process.exit(1);
});
