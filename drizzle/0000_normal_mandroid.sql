CREATE TYPE "public"."ai_capture_status" AS ENUM('processing', 'review', 'accepted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_line_resolution" AS ENUM('pending', 'accepted', 'edited', 'removed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ai_unit" AS ENUM('case', 'piece', 'unclear');--> statement-breakpoint
CREATE TYPE "public"."credit_status" AS ENUM('ok', 'hold', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."export_format" AS ENUM('tally_xml', 'csv');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('hi', 'en');--> statement-breakpoint
CREATE TYPE "public"."order_source" AS ENUM('manual', 'ai', 'repeat', 'desk');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'credit_hold', 'confirmed', 'exported', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."scheme_type" AS ENUM('buy_x_get_y', 'slab_percent');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('retailer', 'desk', 'admin');--> statement-breakpoint
CREATE TABLE "ai_capture_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capture_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"raw_text" text NOT NULL,
	"product_words" text DEFAULT '' NOT NULL,
	"product_id" uuid,
	"qty" integer,
	"unit" "ai_unit" DEFAULT 'case' NOT NULL,
	"confidence_bp" integer DEFAULT 0 NOT NULL,
	"alternatives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"needs_clarification" boolean DEFAULT false NOT NULL,
	"match_method" text DEFAULT 'unmatched' NOT NULL,
	"resolution" "ai_line_resolution" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_capture_lines_qty_check" CHECK ("ai_capture_lines"."qty" IS NULL OR "ai_capture_lines"."qty" > 0),
	CONSTRAINT "ai_capture_lines_confidence_check" CHECK ("ai_capture_lines"."confidence_bp" >= 0 AND "ai_capture_lines"."confidence_bp" <= 10000)
);
--> statement-breakpoint
CREATE TABLE "ai_captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"retailer_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"status" "ai_capture_status" DEFAULT 'processing' NOT NULL,
	"parsed_json" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"retailer_id" uuid NOT NULL,
	"raw_term" text NOT NULL,
	"normalized_term" text NOT NULL,
	"product_id" uuid NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"accent" text DEFAULT '#175c3d' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_hi" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_orders" (
	"export_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "export_orders_export_id_order_id_pk" PRIMARY KEY("export_id","order_id")
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"format" "export_format" NOT NULL,
	"file_name" text NOT NULL,
	"order_count" integer NOT NULL,
	"checksum" text NOT NULL,
	"content" text NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"product_id" uuid NOT NULL,
	"sku_code" text NOT NULL,
	"product_name" text NOT NULL,
	"pack_size" text NOT NULL,
	"qty_cases" integer NOT NULL,
	"unit_price_paisa" bigint NOT NULL,
	"subtotal_paisa" bigint NOT NULL,
	"discount_paisa" bigint DEFAULT 0 NOT NULL,
	"taxable_paisa" bigint NOT NULL,
	"tax_paisa" bigint NOT NULL,
	"line_total_paisa" bigint NOT NULL,
	"gst_rate_bp" integer NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"scheme_id" uuid,
	"scheme_explanation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_qty_check" CHECK ("order_items"."qty_cases" > 0),
	CONSTRAINT "order_items_money_check" CHECK ("order_items"."subtotal_paisa" >= 0 AND "order_items"."discount_paisa" >= 0 AND "order_items"."line_total_paisa" >= 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_no" text NOT NULL,
	"retailer_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"source" "order_source" DEFAULT 'manual' NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"credit_status" "credit_status" DEFAULT 'ok' NOT NULL,
	"subtotal_paisa" bigint DEFAULT 0 NOT NULL,
	"discount_paisa" bigint DEFAULT 0 NOT NULL,
	"taxable_paisa" bigint DEFAULT 0 NOT NULL,
	"tax_paisa" bigint DEFAULT 0 NOT NULL,
	"total_paisa" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"ai_capture_id" uuid,
	"idempotency_key" text,
	"credit_reason" text,
	"confirmed_at" timestamp with time zone,
	"exported_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_totals_check" CHECK ("orders"."total_paisa" >= 0)
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "otp_challenges_attempts_check" CHECK ("otp_challenges"."attempts" >= 0),
	CONSTRAINT "otp_challenges_attempts_cap_check" CHECK ("otp_challenges"."attempts" <= 10)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_code" text NOT NULL,
	"name" text NOT NULL,
	"hindi_aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"brand_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"pack_size" text NOT NULL,
	"pack_unit" text DEFAULT 'pack' NOT NULL,
	"case_size" integer NOT NULL,
	"dealer_price_paisa" bigint NOT NULL,
	"price_includes_gst" boolean DEFAULT true NOT NULL,
	"gst_rate_bp" integer DEFAULT 1800 NOT NULL,
	"stock_cases" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 10 NOT NULL,
	"image_key" text DEFAULT 'generic' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_case_size_check" CHECK ("products"."case_size" > 0),
	CONSTRAINT "products_dealer_price_check" CHECK ("products"."dealer_price_paisa" >= 0),
	CONSTRAINT "products_gst_rate_check" CHECK ("products"."gst_rate_bp" >= 0 AND "products"."gst_rate_bp" <= 10000),
	CONSTRAINT "products_stock_check" CHECK ("products"."stock_cases" >= 0),
	CONSTRAINT "products_low_stock_check" CHECK ("products"."low_stock_threshold" >= 0)
);
--> statement-breakpoint
CREATE TABLE "retailer_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"retailer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"price_paisa" bigint NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retailer_prices_price_check" CHECK ("retailer_prices"."price_paisa" >= 0)
);
--> statement-breakpoint
CREATE TABLE "retailers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_name" text NOT NULL,
	"owner_name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"credit_limit_paisa" bigint DEFAULT 0 NOT NULL,
	"outstanding_paisa" bigint DEFAULT 0 NOT NULL,
	"language" "language" DEFAULT 'hi' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retailers_credit_limit_check" CHECK ("retailers"."credit_limit_paisa" >= 0),
	CONSTRAINT "retailers_outstanding_check" CHECK ("retailers"."outstanding_paisa" >= 0)
);
--> statement-breakpoint
CREATE TABLE "schemes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "scheme_type" NOT NULL,
	"product_id" uuid NOT NULL,
	"free_product_id" uuid,
	"buy_qty" integer,
	"free_qty" integer,
	"min_qty" integer,
	"percent_bp" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"priority" integer DEFAULT 100 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schemes_buy_x_get_y_check" CHECK (("schemes"."type" <> 'buy_x_get_y') OR ("schemes"."buy_qty" > 0 AND "schemes"."free_qty" > 0)),
	CONSTRAINT "schemes_slab_percent_check" CHECK (("schemes"."type" <> 'slab_percent') OR ("schemes"."min_qty" > 0 AND "schemes"."percent_bp" > 0 AND "schemes"."percent_bp" <= 10000)),
	CONSTRAINT "schemes_priority_check" CHECK ("schemes"."priority" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"retailer_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_retailer_role_check" CHECK (("users"."role" = 'retailer' AND "users"."retailer_id" IS NOT NULL) OR ("users"."role" <> 'retailer' AND "users"."retailer_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "ai_capture_lines" ADD CONSTRAINT "ai_capture_lines_capture_id_ai_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."ai_captures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_capture_lines" ADD CONSTRAINT "ai_capture_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_captures" ADD CONSTRAINT "ai_captures_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_captures" ADD CONSTRAINT "ai_captures_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aliases" ADD CONSTRAINT "aliases_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aliases" ADD CONSTRAINT "aliases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aliases" ADD CONSTRAINT "aliases_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_orders" ADD CONSTRAINT "export_orders_export_id_exports_id_fk" FOREIGN KEY ("export_id") REFERENCES "public"."exports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_orders" ADD CONSTRAINT "export_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_scheme_id_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."schemes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_ai_capture_id_ai_captures_id_fk" FOREIGN KEY ("ai_capture_id") REFERENCES "public"."ai_captures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_prices" ADD CONSTRAINT "retailer_prices_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_prices" ADD CONSTRAINT "retailer_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schemes" ADD CONSTRAINT "schemes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schemes" ADD CONSTRAINT "schemes_free_product_id_products_id_fk" FOREIGN KEY ("free_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_capture_lines_capture_idx" ON "ai_capture_lines" USING btree ("capture_id","line_no");--> statement-breakpoint
CREATE INDEX "ai_captures_retailer_created_idx" ON "ai_captures" USING btree ("retailer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "aliases_retailer_term_idx" ON "aliases" USING btree ("retailer_id","normalized_term");--> statement-breakpoint
CREATE INDEX "aliases_retailer_idx" ON "aliases" USING btree ("retailer_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "export_orders_order_idx" ON "export_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "exports_created_idx" ON "exports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id","line_no");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_no_idx" ON "orders" USING btree ("order_no");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_retailer_idempotency_idx" ON "orders" USING btree ("retailer_id","idempotency_key") WHERE "orders"."idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "orders_retailer_created_idx" ON "orders" USING btree ("retailer_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_phone_created_idx" ON "otp_challenges" USING btree ("phone","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_code_idx" ON "products" USING btree ("sku_code");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "products_active_idx" ON "products" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "retailer_prices_window_idx" ON "retailer_prices" USING btree ("retailer_id","product_id","valid_from");--> statement-breakpoint
CREATE INDEX "retailer_prices_lookup_idx" ON "retailer_prices" USING btree ("retailer_id","product_id","valid_from");--> statement-breakpoint
CREATE UNIQUE INDEX "retailers_phone_idx" ON "retailers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "schemes_product_window_idx" ON "schemes" USING btree ("product_id","active","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_retailer_idx" ON "users" USING btree ("retailer_id");