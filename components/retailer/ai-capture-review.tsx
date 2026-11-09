"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  History,
  LoaderCircle,
  MessageSquareText,
  PackageSearch,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { getJson, postJson } from "@/lib/client/api";
import { formatInr } from "@/lib/pricing/money";
import type { CatalogueProduct } from "@/lib/catalogue/types";
import type { CaptureLineView, CaptureView } from "@/lib/orders/types";
import { formatDateIst } from "@/lib/utils";

const AI_CAPTURE_KEY = "sahaj.pending.capture";

interface CaptureSummaryView {
  id: string;
  rawText: string;
  status: "processing" | "review" | "accepted" | "failed";
  model: string;
  createdAt: string;
  lineCount: number;
}

interface LineDraft {
  productId: string;
  qty: number;
  unit: "case" | "piece" | "unclear";
  remove: boolean;
  aliasTerm: string;
}

interface AiCaptureReviewProps {
  products: CatalogueProduct[];
  captures: CaptureSummaryView[];
}

const SAMPLES = [
  {
    label: "Biscuits",
    text: "10 case glucose biscuit 75 g and 5 case Marie biscuit 150 g",
  },
  {
    label: "Mixed items",
    text: "12 case Marie biscuit and 6 case detergent 1 kg",
  },
  {
    label: "Three lines",
    text: "5 case detergent 1 kg, 8 case aloo bhujia 100 g, 2 case dishwash 500 ml",
  },
];

function draftsFromCapture(capture: CaptureView): Record<string, LineDraft> {
  return Object.fromEntries(
    capture.lines.map((line) => [
      line.id,
      {
        productId: line.productId ?? "",
        qty: line.qty ?? 1,
        unit: line.unit,
        remove: line.resolution === "removed",
        aliasTerm: line.productWords,
      },
    ]),
  );
}

function confidenceTone(bp: number): "green" | "amber" | "red" {
  if (bp >= 7500) return "green";
  if (bp >= 5500) return "amber";
  return "red";
}

function statusLabel(status: CaptureSummaryView["status"]): string {
  if (status === "accepted") return "Added to cart";
  if (status === "review") return "Needs review";
  if (status === "failed") return "Could not read";
  return "Reading";
}

export function AiCaptureReview({ products, captures }: AiCaptureReviewProps) {
  const cart = useCart();
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capture, setCapture] = useState<CaptureView | null>(null);
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({});
  const [readingHistory, setReadingHistory] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const activeLines = capture
    ? capture.lines.filter((line) => !drafts[line.id]?.remove)
    : [];
  const keptLines = activeLines.length;
  const issueLines = activeLines.filter((line) => {
    const draft = drafts[line.id];
    return (
      !draft ||
      !draft.productId ||
      draft.qty < 1 ||
      draft.unit !== "case" ||
      (productById.get(draft.productId)?.stockCases ?? 0) < draft.qty
    );
  });
  const canConfirm =
    Boolean(capture) &&
    keptLines > 0 &&
    issueLines.length === 0 &&
    !confirming &&
    (capture?.status === "review" || capture?.status === "accepted");

  function updateDraft(lineId: string, patch: Partial<LineDraft>) {
    setDrafts((current) => ({
      ...current,
      [lineId]: { ...current[lineId]!, ...patch },
    }));
    setConfirmError(null);
  }

  async function readOrder(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 3 || submitting) return;
    setSubmitting(true);
    setError(null);
    setCapture(null);
    setDrafts({});
    setConfirmError(null);

    try {
      const result = await postJson<{
        capture: CaptureView;
        usedFallback: boolean;
      }>("/api/ai/captures", { text: trimmed });
      setCapture(result.capture);
      setDrafts(draftsFromCapture(result.capture));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "AI could not read that order. Try again or use the catalogue.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function openCapture(id: string) {
    if (readingHistory) return;
    setReadingHistory(id);
    setHistoryError(null);
    setConfirmError(null);
    try {
      const result = await getJson<{ capture: CaptureView }>(
        `/api/ai/captures/${id}`,
      );
      setCapture(result.capture);
      setDrafts(draftsFromCapture(result.capture));
      setText(result.capture.rawText);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setHistoryError(
        requestError instanceof Error
          ? requestError.message
          : "Could not open that capture.",
      );
    } finally {
      setReadingHistory(null);
    }
  }

  async function addToCart() {
    if (!capture || !canConfirm) return;
    setConfirming(true);
    setConfirmError(null);

    const lines = capture.lines.map((line) => {
      const draft = drafts[line.id]!;
      if (draft.remove) {
        return { action: "remove" as const, lineId: line.id };
      }
      return {
        action: "accept" as const,
        lineId: line.id,
        productId: draft.productId,
        qty: draft.qty,
        unit: draft.unit as "case",
        ...(draft.aliasTerm.trim()
          ? { aliasTerm: draft.aliasTerm.trim().slice(0, 120) }
          : {}),
      };
    });

    try {
      const result = await postJson<{
        captureId: string;
        lines: Array<{ productId: string; qtyCases: number }>;
      }>(`/api/ai/captures/${capture.id}/confirm`, { lines });

      for (const line of result.lines) {
        cart.add(line.productId, line.qtyCases);
      }
      try {
        window.sessionStorage.setItem(AI_CAPTURE_KEY, capture.id);
      } catch {
        // The cart query parameter still links this order to the capture.
      }
      router.push(`/cart?capture=${capture.id}`);
    } catch (requestError) {
      setConfirmError(
        requestError instanceof Error
          ? requestError.message
          : "Could not add the reviewed lines to the cart.",
      );
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="eyebrow">AI order capture</p>
        <h1 className="display mt-2 text-[2rem] leading-[1.02] sm:text-[2.6rem]">
          Paste the WhatsApp order.
        </h1>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-ink-soft">
          Paste the order text. AI suggests lines; nothing reaches your cart
          until you confirm.
        </p>
      </header>

      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <MessageSquareText className="h-4 w-4 text-green" strokeWidth={1.7} />
          <h2 className="text-sm font-medium">Order message</h2>
          <span className="pill ml-auto bg-surface text-ink-muted">
            {text.length}/2000
          </span>
        </div>
        <div className="p-4">
          <label htmlFor="ai-order-text" className="sr-only">
            Paste the order message
          </label>
          <textarea
            id="ai-order-text"
            value={text}
            onChange={(event) => {
              setText(event.target.value.slice(0, 2000));
              setError(null);
            }}
            rows={5}
            className="field min-h-32 resize-y text-sm leading-relaxed"
            placeholder={
              "Example: 10 peti glucose biscuit aur 5 case Marie biscuit bhej do…"
            }
          />

          <div className="mt-2 flex flex-wrap gap-1.5">
            {SAMPLES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setText(sample.text);
                  setError(null);
                }}
                className="rounded-md border border-line-strong bg-surface px-2.5 py-1 text-[0.625rem] font-medium text-ink-soft transition hover:border-ink/30 hover:text-ink"
              >
                {sample.label}
              </button>
            ))}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-lg border border-red/20 bg-red-soft px-3 py-2.5 text-xs leading-relaxed text-red"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <p className="font-medium">We could not read that order.</p>
                <p className="mt-0.5">{error}</p>
                <p className="mt-1 text-red/75">
                  You can try again, or{" "}
                  <Link href="/shop" className="underline underline-offset-2">
                    order from the catalogue
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => readOrder(text)}
            disabled={submitting || text.trim().length < 3}
            className="btn btn-primary mt-3 w-full"
          >
            {submitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" /> Reading the
                order…
              </>
            ) : (
              <>
                <WandSparkles className="h-4 w-4" /> Read order with AI
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[0.625rem] leading-relaxed text-ink-muted">
            The message is used only for this capture. The model never chooses
            prices, stock, or schemes.
          </p>
        </div>
      </section>

      {submitting && (
        <section className="card space-y-3 p-4" aria-busy="true">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-16 w-full rounded-lg" />
          <div className="skeleton h-20 w-full rounded-lg" />
          <p className="text-center text-xs text-ink-muted">
            Reading the message and matching products…
          </p>
        </section>
      )}

      {capture && !submitting && (
        <section className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-green" strokeWidth={1.7} />
              <h2 className="text-sm font-medium">Review before ordering</h2>
              <span className="pill bg-paper-deep text-ink-muted">
                {capture.model}
              </span>
              <span
                className={[
                  "pill ml-auto",
                  capture.status === "accepted"
                    ? "bg-green-soft text-green-dark"
                    : "bg-amber-soft text-amber",
                ].join(" ")}
              >
                {capture.status === "accepted" ? "Confirmed" : "Human check"}
              </span>
            </div>
            <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink-soft">
              {capture.status === "accepted"
                ? "These lines were already reviewed. You can add them to the cart again."
                : "Check the product and case quantity on every line. This is a suggestion, not an order."}
            </p>
          </div>

          <div className="space-y-3 p-4">
            {capture.lines.length === 0 ? (
              <div className="rounded-lg border border-amber/20 bg-amber-soft px-3.5 py-4 text-center">
                <CircleHelp
                  className="mx-auto h-6 w-6 text-amber"
                  strokeWidth={1.7}
                />
                <p className="mt-2 text-sm font-medium text-amber">
                  No product lines found.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber/80">
                  Try adding a quantity and a product name, like “5 case Marie
                  biscuit 150 g”, or build the order from the catalogue.
                </p>
                <Link
                  href="/shop"
                  className="btn btn-secondary mt-3 h-9 min-h-9 text-xs"
                >
                  Browse catalogue
                </Link>
              </div>
            ) : (
              capture.lines.map((line) => (
                <CaptureLineEditor
                  key={line.id}
                  line={line}
                  draft={drafts[line.id]}
                  products={products}
                  productById={productById}
                  onChange={(patch) => updateDraft(line.id, patch)}
                />
              ))
            )}
          </div>

          {capture.lines.length > 0 && (
            <div className="space-y-2 border-t border-line bg-paper/35 p-4">
              {issueLines.length > 0 && (
                <p className="flex items-start gap-1.5 text-[0.6875rem] leading-relaxed text-amber">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Check {issueLines.length} line
                  {issueLines.length === 1 ? "" : "s"}: choose a product, a case
                  quantity, and enough stock.
                </p>
              )}
              {confirmError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red/20 bg-red-soft px-3 py-2 text-xs text-red"
                >
                  {confirmError}
                </p>
              )}
              <button
                type="button"
                onClick={addToCart}
                disabled={!canConfirm}
                className="btn btn-primary w-full"
              >
                {confirming ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Adding to
                    cart…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Confirm {keptLines} line
                    {keptLines === 1 ? "" : "s"} and add to cart
                  </>
                )}
              </button>
              <p className="text-center text-[0.625rem] leading-relaxed text-ink-muted">
                You will still review prices, schemes, and credit in the cart
                before placing the order.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <History className="h-4 w-4 text-ink-muted" strokeWidth={1.7} />
          <h2 className="text-sm font-medium">Recent captures</h2>
          <span className="pill ml-auto bg-paper-deep text-ink-muted">
            {captures.length}
          </span>
        </div>
        {historyError && (
          <p
            role="alert"
            className="border-b border-red/15 bg-red-soft px-4 py-2 text-xs text-red"
          >
            {historyError}
          </p>
        )}
        {captures.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <PackageSearch
              className="mx-auto h-7 w-7 text-ink-muted"
              strokeWidth={1.6}
            />
            <p className="mt-2 text-sm font-medium">No captures yet.</p>
            <p className="mt-1 text-xs text-ink-muted">
              Paste a message above to start your first AI order.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {captures.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openCapture(item.id)}
                  disabled={readingHistory !== null}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-paper/60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-paper text-ink-muted">
                    {readingHistory === item.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquareText className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 block text-xs font-medium text-ink">
                      {item.rawText}
                    </span>
                    <span className="mt-0.5 block text-[0.625rem] text-ink-muted">
                      {formatDateIst(item.createdAt)} · {item.lineCount} line
                      {item.lineCount === 1 ? "" : "s"} ·{" "}
                      {statusLabel(item.status)}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {capture && (
        <div className="flex items-center justify-center pb-2 text-center text-[0.625rem] text-ink-muted">
          <Sparkles className="mr-1 h-3 w-3" /> AI suggestions are grounded in
          your catalogue. A person must confirm every line.
        </div>
      )}

      <Link
        href="/shop"
        className="flex items-center justify-center gap-1 text-xs font-medium text-green"
      >
        Order from the catalogue instead <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function CaptureLineEditor({
  line,
  draft,
  products,
  productById,
  onChange,
}: {
  line: CaptureLineView;
  draft: LineDraft | undefined;
  products: CatalogueProduct[];
  productById: Map<string, CatalogueProduct>;
  onChange: (patch: Partial<LineDraft>) => void;
}) {
  if (!draft) return null;
  const selected = draft.productId
    ? productById.get(draft.productId)
    : undefined;
  const tone = confidenceTone(line.confidenceBp);
  const outOfStock = selected ? selected.stockCases <= 0 : false;
  const overStock = selected ? draft.qty > selected.stockCases : false;

  if (draft.remove) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper/50 px-3 py-2.5">
        <p className="min-w-0 truncate text-xs text-ink-muted line-through">
          {line.rawText}
        </p>
        <button
          type="button"
          onClick={() => onChange({ remove: false })}
          className="shrink-0 text-[0.6875rem] font-medium text-green underline underline-offset-2"
        >
          Keep line
        </button>
      </div>
    );
  }

  return (
    <article className="rounded-lg border border-line bg-surface p-3.5 shadow-[0_1px_2px_rgba(11,3,6,0.03)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-muted">
            Line {line.lineNo} · “{line.rawText}”
          </p>
          <p className="mt-0.5 text-[0.625rem] text-ink-muted">
            Matched by {line.matchMethod.replaceAll("_", " ")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={[
              "pill",
              tone === "green"
                ? "bg-green-soft text-green-dark"
                : tone === "amber"
                  ? "bg-amber-soft text-amber"
                  : "bg-red-soft text-red",
            ].join(" ")}
          >
            {Math.round(line.confidenceBp / 100)}%
          </span>
          <button
            type="button"
            onClick={() => onChange({ remove: true })}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-red-soft hover:text-red"
            aria-label={`Remove line ${line.lineNo}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {line.needsClarification && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-soft px-2.5 py-1.5 text-[0.6875rem] leading-relaxed text-amber">
          <CircleHelp className="mt-0.5 h-3 w-3 shrink-0" />
          {line.unit === "piece"
            ? "The message says pieces. Choose how many cases to order."
            : line.unit === "unclear"
              ? "The unit is unclear. Choose case quantity."
              : "Check the product match and case quantity."}
        </p>
      )}

      <div className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_5.5rem_6rem]">
        <label className="block">
          <span className="label text-[0.625rem]">Product</span>
          <select
            value={draft.productId}
            onChange={(event) => onChange({ productId: event.target.value })}
            className="field min-h-10 px-2 text-xs"
            aria-label={`Product for line ${line.lineNo}`}
          >
            <option value="">Choose a product…</option>
            {products.map((product) => (
              <option
                key={product.id}
                value={product.id}
                disabled={product.stockCases <= 0}
              >
                {product.name} · {product.skuCode} · {product.stockCases} case
                {product.stockCases === 1 ? "" : "s"}
                {product.stockCases <= 0 ? " (out)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label text-[0.625rem]">Cases</span>
          <input
            type="number"
            min={1}
            max={999}
            value={draft.qty}
            onChange={(event) =>
              onChange({
                qty: Math.max(
                  1,
                  Math.min(999, Number(event.target.value) || 1),
                ),
              })
            }
            className="field min-h-10 px-2 text-xs"
            aria-label={`Case quantity for line ${line.lineNo}`}
          />
        </label>

        <label className="block">
          <span className="label text-[0.625rem]">Unit</span>
          <select
            value={draft.unit}
            onChange={(event) =>
              onChange({
                unit: event.target.value as LineDraft["unit"],
              })
            }
            className="field min-h-10 px-2 text-xs"
            aria-label={`Unit for line ${line.lineNo}`}
          >
            <option value="case">Cases</option>
            <option value="piece">Pieces</option>
            <option value="unclear">Not sure</option>
          </select>
        </label>
      </div>

      {line.alternatives.length > 0 && (
        <div className="mt-2">
          <p className="text-[0.625rem] font-medium text-ink-muted">
            Other close matches
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {line.alternatives.map((alternative) => (
              <button
                key={alternative.productId}
                type="button"
                onClick={() =>
                  onChange({ productId: alternative.productId, unit: "case" })
                }
                className={[
                  "rounded-md border px-2 py-1 text-[0.625rem] font-medium transition",
                  draft.productId === alternative.productId
                    ? "border-ink bg-ink text-white"
                    : "border-line-strong bg-surface text-ink-soft hover:border-ink/30 hover:text-ink",
                ].join(" ")}
              >
                {alternative.productName ?? "Unknown product"} ·{" "}
                {Math.round(alternative.scoreBp / 100)}%
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-[0.625rem]">
        <p className={outOfStock || overStock ? "text-red" : "text-ink-muted"}>
          {outOfStock
            ? "Out of stock — remove or choose another product."
            : overStock
              ? `Only ${selected?.stockCases} cases available.`
              : selected
                ? `${formatInr(selected.casePricePaisa)} per case · ${selected.stockCases} in stock`
                : "Pick the product this line refers to."}
        </p>
        <label className="flex items-center gap-1 text-ink-muted">
          <span className="sr-only">Alias term for line {line.lineNo}</span>
          <input
            value={draft.aliasTerm}
            onChange={(event) =>
              onChange({ aliasTerm: event.target.value.slice(0, 120) })
            }
            className="w-28 rounded-md border border-line bg-surface px-1.5 py-1 text-[0.625rem]"
            placeholder="Your name for it"
            aria-label={`Retailer alias for line ${line.lineNo}`}
          />
        </label>
      </div>
    </article>
  );
}
