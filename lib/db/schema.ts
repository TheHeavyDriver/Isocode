import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */

export const userRoleEnum = pgEnum("user_role", ["retailer", "desk", "admin"]);
export const languageEnum = pgEnum("language", ["hi", "en"]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "credit_hold",
  "confirmed",
  "exported",
  "cancelled",
]);

export const orderSourceEnum = pgEnum("order_source", [
  "manual",
  "ai",
  "repeat",
  "desk",
]);

export const creditStatusEnum = pgEnum("credit_status", [
  "ok",
  "hold",
  "approved",
  "rejected",
]);

export const schemeTypeEnum = pgEnum("scheme_type", [
  "buy_x_get_y",
  "slab_percent",
]);

export const aiCaptureStatusEnum = pgEnum("ai_capture_status", [
  "processing",
  "review",
  "accepted",
  "failed",
]);

export const aiLineResolutionEnum = pgEnum("ai_line_resolution", [
  "pending",
  "accepted",
  "edited",
  "removed",
  "rejected",
]);

export const aiUnitEnum = pgEnum("ai_unit", ["case", "piece", "unclear"]);

export const exportFormatEnum = pgEnum("export_format", ["tally_xml", "csv"]);

/* --------------------------------------------------------------- identity */

export const retailers = pgTable(
  "retailers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopName: text("shop_name").notNull(),
    ownerName: text("owner_name").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    creditLimitPaisa: bigint("credit_limit_paisa", { mode: "number" })
      .notNull()
      .default(0),
    outstandingPaisa: bigint("outstanding_paisa", { mode: "number" })
      .notNull()
      .default(0),
    language: languageEnum("language").notNull().default("hi"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("retailers_phone_idx").on(table.phone),
    check("retailers_credit_limit_check", sql`${table.creditLimitPaisa} >= 0`),
    check("retailers_outstanding_check", sql`${table.outstandingPaisa} >= 0`),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    role: userRoleEnum("role").notNull(),
    retailerId: uuid("retailer_id").references(() => retailers.id, {
      onDelete: "restrict",
    }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_phone_idx").on(table.phone),
    index("users_retailer_idx").on(table.retailerId),
    check(
      "users_retailer_role_check",
      sql`(${table.role} = 'retailer' AND ${table.retailerId} IS NOT NULL) OR (${table.role} <> 'retailer' AND ${table.retailerId} IS NULL)`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
  ],
);

export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("otp_challenges_phone_created_idx").on(table.phone, table.createdAt),
    check("otp_challenges_attempts_check", sql`${table.attempts} >= 0`),
    check("otp_challenges_attempts_cap_check", sql`${table.attempts} <= 10`),
  ],
);

/* -------------------------------------------------------------- catalogue */

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    accent: text("accent").notNull().default("#175c3d"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("brands_slug_idx").on(table.slug)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    nameHi: text("name_hi").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skuCode: text("sku_code").notNull(),
    name: text("name").notNull(),
    hindiAliases: text("hindi_aliases")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    packSize: text("pack_size").notNull(),
    packUnit: text("pack_unit").notNull().default("pack"),
    caseSize: integer("case_size").notNull(),
    dealerPricePaisa: bigint("dealer_price_paisa", {
      mode: "number",
    }).notNull(),
    priceIncludesGst: boolean("price_includes_gst").notNull().default(true),
    gstRateBp: integer("gst_rate_bp").notNull().default(1800),
    stockCases: integer("stock_cases").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
    imageKey: text("image_key").notNull().default("generic"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("products_sku_code_idx").on(table.skuCode),
    index("products_category_idx").on(table.categoryId),
    index("products_brand_idx").on(table.brandId),
    index("products_active_idx").on(table.active),
    check("products_case_size_check", sql`${table.caseSize} > 0`),
    check("products_dealer_price_check", sql`${table.dealerPricePaisa} >= 0`),
    check(
      "products_gst_rate_check",
      sql`${table.gstRateBp} >= 0 AND ${table.gstRateBp} <= 10000`,
    ),
    check("products_stock_check", sql`${table.stockCases} >= 0`),
    check("products_low_stock_check", sql`${table.lowStockThreshold} >= 0`),
  ],
);

export const retailerPrices = pgTable(
  "retailer_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    retailerId: uuid("retailer_id")
      .notNull()
      .references(() => retailers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    pricePaisa: bigint("price_paisa", { mode: "number" }).notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true })
      .notNull()
      .defaultNow(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("retailer_prices_window_idx").on(
      table.retailerId,
      table.productId,
      table.validFrom,
    ),
    index("retailer_prices_lookup_idx").on(
      table.retailerId,
      table.productId,
      table.validFrom,
    ),
    check("retailer_prices_price_check", sql`${table.pricePaisa} >= 0`),
  ],
);

/* ------------------------------------------------------------- commercial */

export const schemes = pgTable(
  "schemes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: schemeTypeEnum("type").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    freeProductId: uuid("free_product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    buyQty: integer("buy_qty"),
    freeQty: integer("free_qty"),
    minQty: integer("min_qty"),
    percentBp: integer("percent_bp"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    priority: integer("priority").notNull().default(100),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("schemes_product_window_idx").on(
      table.productId,
      table.active,
      table.startsAt,
      table.endsAt,
    ),
    check(
      "schemes_buy_x_get_y_check",
      sql`(${table.type} <> 'buy_x_get_y') OR (${table.buyQty} > 0 AND ${table.freeQty} > 0)`,
    ),
    check(
      "schemes_slab_percent_check",
      sql`(${table.type} <> 'slab_percent') OR (${table.minQty} > 0 AND ${table.percentBp} > 0 AND ${table.percentBp} <= 10000)`,
    ),
    check("schemes_priority_check", sql`${table.priority} >= 0`),
  ],
);

/* ------------------------------------------------------------------- AI  */

export const aiCaptures = pgTable(
  "ai_captures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    retailerId: uuid("retailer_id")
      .notNull()
      .references(() => retailers.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    rawText: text("raw_text").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    status: aiCaptureStatusEnum("status").notNull().default("processing"),
    parsedJson: jsonb("parsed_json"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (table) => [
    index("ai_captures_retailer_created_idx").on(
      table.retailerId,
      table.createdAt,
    ),
  ],
);

export const aiCaptureLines = pgTable(
  "ai_capture_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    captureId: uuid("capture_id")
      .notNull()
      .references(() => aiCaptures.id, { onDelete: "cascade" }),
    lineNo: integer("line_no").notNull(),
    rawText: text("raw_text").notNull(),
    productWords: text("product_words").notNull().default(""),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    qty: integer("qty"),
    unit: aiUnitEnum("unit").notNull().default("case"),
    confidenceBp: integer("confidence_bp").notNull().default(0),
    alternatives: jsonb("alternatives")
      .$type<Array<{ productId: string; scoreBp: number }>>()
      .notNull()
      .default([]),
    needsClarification: boolean("needs_clarification").notNull().default(false),
    matchMethod: text("match_method").notNull().default("unmatched"),
    resolution: aiLineResolutionEnum("resolution").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_capture_lines_capture_idx").on(table.captureId, table.lineNo),
    check(
      "ai_capture_lines_qty_check",
      sql`${table.qty} IS NULL OR ${table.qty} > 0`,
    ),
    check(
      "ai_capture_lines_confidence_check",
      sql`${table.confidenceBp} >= 0 AND ${table.confidenceBp} <= 10000`,
    ),
  ],
);

export const aliases = pgTable(
  "aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    retailerId: uuid("retailer_id")
      .notNull()
      .references(() => retailers.id, { onDelete: "cascade" }),
    rawTerm: text("raw_term").notNull(),
    normalizedTerm: text("normalized_term").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("aliases_retailer_term_idx").on(
      table.retailerId,
      table.normalizedTerm,
    ),
    index("aliases_retailer_idx").on(table.retailerId),
  ],
);

/* ---------------------------------------------------------------- orders  */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNo: text("order_no").notNull(),
    retailerId: uuid("retailer_id")
      .notNull()
      .references(() => retailers.id, { onDelete: "restrict" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    source: orderSourceEnum("source").notNull().default("manual"),
    status: orderStatusEnum("status").notNull().default("pending"),
    creditStatus: creditStatusEnum("credit_status").notNull().default("ok"),
    subtotalPaisa: bigint("subtotal_paisa", { mode: "number" })
      .notNull()
      .default(0),
    discountPaisa: bigint("discount_paisa", { mode: "number" })
      .notNull()
      .default(0),
    taxablePaisa: bigint("taxable_paisa", { mode: "number" })
      .notNull()
      .default(0),
    taxPaisa: bigint("tax_paisa", { mode: "number" }).notNull().default(0),
    totalPaisa: bigint("total_paisa", { mode: "number" }).notNull().default(0),
    notes: text("notes"),
    aiCaptureId: uuid("ai_capture_id").references(() => aiCaptures.id, {
      onDelete: "set null",
    }),
    idempotencyKey: text("idempotency_key"),
    creditReason: text("credit_reason"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    exportedAt: timestamp("exported_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_order_no_idx").on(table.orderNo),
    uniqueIndex("orders_retailer_idempotency_idx")
      .on(table.retailerId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("orders_retailer_created_idx").on(table.retailerId, table.createdAt),
    index("orders_status_created_idx").on(table.status, table.createdAt),
    check("orders_totals_check", sql`${table.totalPaisa} >= 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    lineNo: integer("line_no").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    skuCode: text("sku_code").notNull(),
    productName: text("product_name").notNull(),
    packSize: text("pack_size").notNull(),
    qtyCases: integer("qty_cases").notNull(),
    unitPricePaisa: bigint("unit_price_paisa", { mode: "number" }).notNull(),
    subtotalPaisa: bigint("subtotal_paisa", { mode: "number" }).notNull(),
    discountPaisa: bigint("discount_paisa", { mode: "number" })
      .notNull()
      .default(0),
    taxablePaisa: bigint("taxable_paisa", { mode: "number" }).notNull(),
    taxPaisa: bigint("tax_paisa", { mode: "number" }).notNull(),
    lineTotalPaisa: bigint("line_total_paisa", { mode: "number" }).notNull(),
    gstRateBp: integer("gst_rate_bp").notNull(),
    isFree: boolean("is_free").notNull().default(false),
    schemeId: uuid("scheme_id").references(() => schemes.id, {
      onDelete: "set null",
    }),
    schemeExplanation: text("scheme_explanation"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId, table.lineNo),
    check("order_items_qty_check", sql`${table.qtyCases} > 0`),
    check(
      "order_items_money_check",
      sql`${table.subtotalPaisa} >= 0 AND ${table.discountPaisa} >= 0 AND ${table.lineTotalPaisa} >= 0`,
    ),
  ],
);

/* ------------------------------------------------------- export and audit */

export const exports = pgTable(
  "exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    format: exportFormatEnum("format").notNull(),
    fileName: text("file_name").notNull(),
    orderCount: integer("order_count").notNull(),
    checksum: text("checksum").notNull(),
    content: text("content").notNull(),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("exports_created_idx").on(table.createdAt)],
);

export const exportOrders = pgTable(
  "export_orders",
  {
    exportId: uuid("export_id")
      .notNull()
      .references(() => exports.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.exportId, table.orderId] }),
    uniqueIndex("export_orders_order_idx").on(table.orderId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);

/* ----------------------------------------------------------------- types */

export type Retailer = typeof retailers.$inferSelect;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type RetailerPrice = typeof retailerPrices.$inferSelect;
export type Scheme = typeof schemes.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type AiCapture = typeof aiCaptures.$inferSelect;
export type AiCaptureLine = typeof aiCaptureLines.$inferSelect;
export type Alias = typeof aliases.$inferSelect;
export type ExportRecord = typeof exports.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
