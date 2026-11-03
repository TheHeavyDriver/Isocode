import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search, Sparkles, X } from "lucide-react";
import { requireRetailerPage } from "@/lib/auth/session";
import { getCatalogue } from "@/lib/catalogue/service";
import type { CatalogueFilters } from "@/lib/catalogue/types";
import { CreditStrip } from "@/components/retailer/credit-strip";
import { ProductCard } from "@/components/retailer/product-card";

export const metadata: Metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  category?: string;
  brand?: string;
}>;

function shopHref(filters: CatalogueFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.brand) params.set("brand", filters.brand);
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireRetailerPage();
  const raw = await searchParams;
  const filters: CatalogueFilters = {
    q: typeof raw.q === "string" ? raw.q : undefined,
    category: typeof raw.category === "string" ? raw.category : undefined,
    brand: typeof raw.brand === "string" ? raw.brand : undefined,
  };

  const catalogue = await getCatalogue(session.retailer.id, filters);
  const activeCategory = catalogue.categories.find(
    (category) => category.slug === filters.category,
  );
  const activeBrand = catalogue.brands.find(
    (brand) => brand.slug === filters.brand,
  );
  const hasFilters = Boolean(filters.q || filters.category || filters.brand);

  return (
    <div className="space-y-4">
      <section className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Retailer shop</p>
          <h1 className="display mt-1 text-[1.75rem] leading-none sm:text-3xl">
            Namaste, {session.retailer.ownerName.split(" ")[0]}.
          </h1>
          <p className="mt-1.5 text-xs text-ink-soft">
            {catalogue.total} product{catalogue.total === 1 ? "" : "s"} at your
            price{session.retailer.language === "hi" ? " · आपके दाम पर" : ""}
          </p>
        </div>
      </section>

      <CreditStrip
        limitPaisa={session.retailer.creditLimitPaisa}
        outstandingPaisa={session.retailer.outstandingPaisa}
      />

      <Link
        href="/ai"
        className="group flex items-center gap-3 rounded-2xl border border-green/20 bg-green px-4 py-3 text-surface shadow-card transition hover:bg-green-dark"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface/12">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            Have a WhatsApp order?
          </span>
          <span className="block text-[0.6875rem] leading-relaxed text-surface/65">
            Paste it in Hindi or English · AI suggests lines · you confirm
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-surface/70 transition group-hover:translate-x-0.5" />
      </Link>

      <section aria-label="Search and filters" className="space-y-3">
        <form action="/shop" method="get" className="relative">
          {filters.category && (
            <input type="hidden" name="category" value={filters.category} />
          )}
          {filters.brand && (
            <input type="hidden" name="brand" value={filters.brand} />
          )}
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search biscuit, चाय पत्ती, SKU…"
            aria-label="Search products"
            className="field h-12 pl-10 pr-24 text-sm"
          />
          {filters.q && (
            <Link
              href={shopHref({ ...filters, q: undefined })}
              aria-label="Clear search"
              className="absolute right-[4.6rem] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-paper hover:text-ink"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
          <button
            type="submit"
            className="btn btn-primary absolute right-1.5 top-1/2 h-9 min-h-9 -translate-y-1/2 rounded-lg px-3 text-xs"
          >
            Search
          </button>
        </form>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
          <FilterChip
            href={shopHref({ ...filters, category: undefined })}
            active={!filters.category}
          >
            All
          </FilterChip>
          {catalogue.categories.map((category) => (
            <FilterChip
              key={category.id}
              href={shopHref({ ...filters, category: category.slug })}
              active={filters.category === category.slug}
            >
              {category.name}
            </FilterChip>
          ))}
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <FilterChip
            small
            href={shopHref({ ...filters, brand: undefined })}
            active={!filters.brand}
          >
            All brands
          </FilterChip>
          {catalogue.brands.map((brand) => (
            <FilterChip
              key={brand.id}
              small
              href={shopHref({ ...filters, brand: brand.slug })}
              active={filters.brand === brand.slug}
            >
              {brand.name}
            </FilterChip>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-ink-muted">
          {hasFilters ? (
            <>
              {catalogue.total} result{catalogue.total === 1 ? "" : "s"}
              {activeCategory ? ` in ${activeCategory.name}` : ""}
              {activeBrand ? ` · ${activeBrand.name}` : ""}
              {filters.q ? ` for “${filters.q}”` : ""}
            </>
          ) : (
            "All active products, live stock"
          )}
        </p>
        {hasFilters && (
          <Link
            href="/shop"
            className="shrink-0 text-xs font-semibold text-green underline decoration-green/25 underline-offset-4"
          >
            Clear all
          </Link>
        )}
      </div>

      {catalogue.products.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-deep text-ink-muted">
            <Search className="h-6 w-6" />
          </span>
          <h2 className="display mt-4 text-xl">No products match.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            Try the Hindi name for a product, a shorter word, or clear the
            filters. For example, “चाय पत्ती” finds tea.
          </p>
          <Link href="/shop" className="btn btn-primary mt-5">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
          {catalogue.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <p className="pt-3 text-center text-[0.625rem] leading-relaxed text-ink-muted">
        Prices include GST unless marked otherwise. Schemes are applied on the
        paid quantity and capped by free stock. The server rechecks everything
        at checkout.
      </p>
    </div>
  );
}

function FilterChip({
  href,
  active,
  small = false,
  children,
}: {
  href: string;
  active: boolean;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full border font-semibold transition",
        small ? "min-h-8 px-3 text-[0.6875rem]" : "min-h-9 px-3.5 text-xs",
        active
          ? "border-green bg-green text-surface"
          : "border-line-strong bg-surface text-ink-soft hover:border-ink-muted hover:text-ink",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
