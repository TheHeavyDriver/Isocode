export type StockStatus = "in" | "low" | "out";

export interface CatalogueScheme {
  id: string;
  name: string;
  type: "buy_x_get_y" | "slab_percent";
  label: string;
  terms: string;
  endsAt: string | null;
}

export interface CatalogueProduct {
  id: string;
  skuCode: string;
  name: string;
  hindiAliases: string[];
  brandName: string;
  brandSlug: string;
  brandAccent: string;
  categoryName: string;
  categoryNameHi: string;
  categorySlug: string;
  packSize: string;
  packUnit: string;
  caseSize: number;
  pricePerPackPaisa: number;
  casePricePaisa: number;
  dealerPricePaisa: number;
  isRetailerPrice: boolean;
  priceIncludesGst: boolean;
  gstRateBp: number;
  stockCases: number;
  lowStockThreshold: number;
  stockStatus: StockStatus;
  imageKey: string;
  scheme: CatalogueScheme | null;
}

export interface CatalogueFilterOption {
  id: string;
  name: string;
  nameHi?: string;
  slug: string;
}

export interface CatalogueFilters {
  q?: string;
  category?: string;
  brand?: string;
}

export interface CatalogueResult {
  products: CatalogueProduct[];
  categories: CatalogueFilterOption[];
  brands: CatalogueFilterOption[];
  filters: CatalogueFilters;
  total: number;
}
