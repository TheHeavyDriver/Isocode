import type {
  AiCaptureLine,
  Order,
  OrderItem,
  Retailer,
} from "@/lib/db/schema";

export type OrderStatus = Order["status"];
export type OrderSource = Order["source"];
export type CreditStatus = Order["creditStatus"];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    short: string;
    tone: "neutral" | "amber" | "green" | "blue" | "red";
  }
> = {
  pending: { label: "Waiting for desk", short: "Pending", tone: "amber" },
  credit_hold: { label: "On credit hold", short: "Credit hold", tone: "red" },
  confirmed: { label: "Confirmed", short: "Confirmed", tone: "green" },
  exported: { label: "Sent to Tally", short: "Exported", tone: "blue" },
  cancelled: { label: "Cancelled", short: "Cancelled", tone: "neutral" },
};

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  manual: "Catalogue",
  ai: "AI capture",
  repeat: "Repeat order",
  desk: "Desk",
};

export interface OrderListItem {
  id: string;
  orderNo: string;
  status: OrderStatus;
  source: OrderSource;
  creditStatus: CreditStatus;
  totalPaisa: number;
  paidCases: number;
  freeCases: number;
  createdAt: string;
  shopName: string;
  ownerName: string;
  phone: string;
  notes: string | null;
  creditReason: string | null;
}

export interface OrderLineView {
  id: string;
  lineNo: number;
  productId: string;
  skuCode: string;
  productName: string;
  packSize: string;
  qtyCases: number;
  unitPricePaisa: number;
  subtotalPaisa: number;
  discountPaisa: number;
  taxablePaisa: number;
  taxPaisa: number;
  lineTotalPaisa: number;
  gstRateBp: number;
  isFree: boolean;
  schemeId: string | null;
  schemeExplanation: string | null;
}

export interface CaptureLineView {
  id: string;
  lineNo: number;
  rawText: string;
  productWords: string;
  productId: string | null;
  productName: string | null;
  qty: number | null;
  unit: AiCaptureLine["unit"];
  confidenceBp: number;
  alternatives: Array<{
    productId: string;
    scoreBp: number;
    productName: string | null;
  }>;
  needsClarification: boolean;
  matchMethod: string;
  resolution: AiCaptureLine["resolution"];
}

export interface CaptureView {
  id: string;
  rawText: string;
  model: string;
  promptVersion: string;
  status: "processing" | "review" | "accepted" | "failed";
  error: string | null;
  createdAt: string;
  acceptedAt: string | null;
  lines: CaptureLineView[];
}

export interface AuditEntry {
  id: string;
  action: string;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface OrderDetail extends OrderListItem {
  subtotalPaisa: number;
  discountPaisa: number;
  freeGoodsValuePaisa: number;
  taxablePaisa: number;
  taxPaisa: number;
  confirmedAt: string | null;
  exportedAt: string | null;
  cancelledAt: string | null;
  creditLimitPaisa: number;
  outstandingPaisa: number;
  address: string;
  items: OrderLineView[];
  capture: CaptureView | null;
  audit: AuditEntry[];
}

export interface CreatedOrder {
  id: string;
  orderNo: string;
  status: OrderStatus;
  creditStatus: CreditStatus;
  totalPaisa: number;
  creditReason: string | null;
}

export interface DeskOrderFilters {
  status?: OrderStatus;
  q?: string;
  date?: "all" | "today" | "7d";
}

export type DeskOrderAction =
  | { action: "hold"; reason: string }
  | { action: "approve_credit"; reason?: string }
  | { action: "reject_credit"; reason?: string }
  | { action: "confirm" }
  | { action: "cancel"; reason?: string };

export interface RetailerSummary {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  creditLimitPaisa: number;
  outstandingPaisa: number;
}

export type OrderWithRetailer = Order & {
  retailer: Pick<
    Retailer,
    | "id"
    | "shopName"
    | "ownerName"
    | "phone"
    | "address"
    | "creditLimitPaisa"
    | "outstandingPaisa"
  >;
};

export type OrderItemRecord = OrderItem;
