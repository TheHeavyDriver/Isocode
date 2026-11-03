import {
  NUMBER_WORDS,
  STOP_WORDS,
  meaningfulTokens,
  normalizeText,
  parseNumberWord,
  similarity,
  tokenize,
} from "@/lib/ai/normalize";
import type {
  AiUnit,
  MatchContext,
  MatchProduct,
  ParsedAlternative,
  ParsedLine,
  ParsedOrder,
} from "@/lib/ai/types";

const CASE_UNITS =
  "peti|petiyan|petis|cases|case|boxes|box|cartons|carton|ctns|ctn|पेटी|पेटियां|पेटियाँ|केस|कार्टन|बॉक्स";
const PIECE_UNITS =
  "pieces|piece|pcs|pc|nag|packets|packet|pkts|pkt|packs|pack|पीस|पैक|पैकेट|नग|पुड़िया";

const NUMBER_EXPRESSION = `(\\d+|${Object.keys(NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .join("|")})`;

const CASE_PATTERN = new RegExp(
  `(?:^|\\s)${NUMBER_EXPRESSION}\\s*(?:${CASE_UNITS})(?=\\s|$)`,
  "i",
);
const PIECE_PATTERN = new RegExp(
  `(?:^|\\s)${NUMBER_EXPRESSION}\\s*(?:${PIECE_UNITS})(?=\\s|$)`,
  "i",
);
const LEADING_QTY_PATTERN = new RegExp(`^\\s*${NUMBER_EXPRESSION}\\s+`, "i");

interface QuantityMatch {
  qty: number | null;
  unit: AiUnit;
  cleaned: string;
  hadExplicitUnit: boolean;
}

export function extractQuantity(segment: string): QuantityMatch {
  const normalized = normalizeText(segment);

  for (const [pattern, unit] of [
    [CASE_PATTERN, "case"] as const,
    [PIECE_PATTERN, "piece"] as const,
  ]) {
    const match = normalized.match(pattern);
    if (match) {
      const qty = match[1] ? parseNumberWord(match[1]) : null;
      if (qty) {
        return {
          qty,
          unit,
          cleaned: normalized
            .replace(match[0], " ")
            .replace(/\s+/g, " ")
            .trim(),
          hadExplicitUnit: true,
        };
      }
    }
  }

  const leading = normalized.match(LEADING_QTY_PATTERN);
  if (leading) {
    const qty = leading[1] ? parseNumberWord(leading[1]) : null;
    if (qty) {
      return {
        qty,
        unit: "unclear",
        cleaned: normalized.slice(leading[0].length).trim(),
        hadExplicitUnit: false,
      };
    }
  }

  return {
    qty: null,
    unit: "unclear",
    cleaned: normalized,
    hadExplicitUnit: false,
  };
}

function cleanProductWords(value: string): string {
  return tokenize(value)
    .filter((token) => !STOP_WORDS.has(token))
    .filter((token) => token !== "peti" && token !== "case" && token !== "box")
    .filter((token) => token !== "piece" && token !== "pcs" && token !== "pack")
    .join(" ")
    .trim();
}

interface PackKey {
  number: string;
  full: string;
}

function packKeys(value: string): PackKey[] {
  const keys: PackKey[] = [];
  const pattern =
    /(\d+(?:\.\d+)?)\s*(kg|kilos?|kilograms?|g|gms?|grams?|ml|l|ltr|litres?|liters?|bags?)?/gi;
  for (const match of value.matchAll(pattern)) {
    const number = match[1];
    if (!number) continue;
    const rawUnit = (match[2] ?? "").toLowerCase();
    const unit = rawUnit.startsWith("kilo")
      ? "kg"
      : rawUnit === "gm" || rawUnit === "gms" || rawUnit.startsWith("gram")
        ? "g"
        : rawUnit === "ltr" || rawUnit.startsWith("lit")
          ? "l"
          : rawUnit === "bag" || rawUnit === "bags"
            ? "bags"
            : rawUnit;
    keys.push({ number, full: unit ? `${number}${unit}` : number });
  }
  return keys;
}

function bestDice(queryTokens: string[], candidateTokens: string[]): number {
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;
  const query = new Set(queryTokens);
  const candidate = new Set(candidateTokens);
  let intersection = 0;
  for (const token of query) {
    if (candidate.has(token)) intersection += 1;
  }
  if (intersection === 0) return 0;
  return (2 * intersection) / (query.size + candidate.size);
}

interface ScoredProduct {
  product: MatchProduct;
  score: number;
  method: ParsedLine["matchMethod"];
  packMatched: boolean;
}

function scoreProduct(
  product: MatchProduct,
  words: string,
  queryPackKeys: PackKey[],
  context: MatchContext,
): ScoredProduct {
  const normalizedName = normalizeText(product.name);
  const aliases = [
    normalizedName,
    ...product.hindiAliases.map(normalizeText),
    normalizeText(product.skuCode.replace(/-/g, " ")),
  ].filter(Boolean);

  let score = 0;
  let method: ParsedLine["matchMethod"] = "fuzzy";

  for (const alias of context.aliases ?? []) {
    if (alias.productId !== product.id) continue;
    const term = normalizeText(alias.normalizedTerm);
    if (!term || term.length < 3) continue;
    if (words === term || words.includes(term)) {
      if (9700 > score) {
        score = 9700;
        method = "retailer_alias";
      }
    }
  }

  for (const alias of aliases) {
    if (alias.length < 3) continue;
    if (words === alias || words.includes(alias)) {
      // A longer, multi-word alias is more specific than a generic one:
      // “मारी बिस्किट” must beat the shared “बिस्किट” alias.
      const tokenBonus = Math.min(
        400,
        Math.max(0, meaningfulTokens(alias).length - 1) * 150,
      );
      const exactBonus = words === alias ? 200 : 0;
      const value =
        (alias === normalizedName ? 9000 : 9300) + tokenBonus + exactBonus;
      if (value > score) {
        score = value;
        method = alias === normalizedName ? "exact" : "alias";
      }
    }
  }

  const queryTokens = meaningfulTokens(words);
  let dice = 0;
  for (const alias of aliases) {
    dice = Math.max(dice, bestDice(queryTokens, meaningfulTokens(alias)));
  }
  if (dice > 0) {
    const tokenScore = 3000 + Math.round(dice * 5800);
    if (tokenScore > score) {
      score = tokenScore;
      method = "fuzzy";
    }
  }

  if (score < 7000) {
    const fullSimilarity = Math.max(
      ...aliases.map((alias) => similarity(words, alias)),
    );
    if (fullSimilarity >= 0.78) {
      const fuzzyScore = 3000 + Math.round(fullSimilarity * 3600);
      if (fuzzyScore > score) {
        score = fuzzyScore;
        method = "fuzzy";
      }
    }
  }

  const candidatePacks = packKeys(`${normalizedName} ${product.packSize}`);
  let packMatched = false;
  let fullPackMatched = false;
  for (const key of queryPackKeys) {
    if (candidatePacks.some((candidate) => candidate.full === key.full)) {
      packMatched = true;
      fullPackMatched = true;
      break;
    }
    if (candidatePacks.some((candidate) => candidate.number === key.number)) {
      packMatched = true;
    }
  }

  if (packMatched) score += fullPackMatched ? 1000 : 700;
  if (queryPackKeys.length > 0 && !packMatched) score -= 1400;

  const pastCount = context.pastOrderCounts?.get(product.id) ?? 0;
  if (pastCount > 0) score += Math.min(300, 80 + pastCount * 30);

  if (product.stockCases <= 0) score -= 250;

  return {
    product,
    score: Math.max(0, Math.min(9900, score)),
    method: score > 0 ? method : "unmatched",
    packMatched,
  };
}

function buildAlternatives(
  scored: ScoredProduct[],
  bestId: string | null,
): ParsedAlternative[] {
  return scored
    .filter((candidate) => candidate.product.id !== bestId)
    .filter((candidate) => candidate.score >= 1800)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((candidate) => ({
      productId: candidate.product.id,
      scoreBp: Math.min(9900, candidate.score),
    }));
}

export function parseLine(
  rawSegment: string,
  context: MatchContext,
): ParsedLine | null {
  const rawText = rawSegment.trim();
  if (!rawText) return null;

  const quantity = extractQuantity(rawText);
  const words =
    cleanProductWords(quantity.cleaned) ||
    cleanProductWords(rawText) ||
    normalizeText(rawText);

  if (!words) return null;

  return matchProductWords(
    {
      rawText,
      words,
      qty: quantity.qty,
      unit: quantity.unit,
      hadExplicitUnit: quantity.hadExplicitUnit,
    },
    context,
  );
}

export interface ProductWordsMatchInput {
  rawText: string;
  words: string;
  qty: number | null;
  unit: AiUnit;
  hadExplicitUnit?: boolean;
}

/**
 * Grounds already-extracted product words in the catalogue. Used by both the
 * deterministic parser and the LLM adapter, so a model can never invent a SKU.
 */
export function matchProductWords(
  input: ProductWordsMatchInput,
  context: MatchContext,
  capConfidenceBp?: number,
): ParsedLine {
  const words = cleanProductWords(input.words) || input.words;
  const queryPackKeys = packKeys(words);
  const scored = context.products
    .map((product) => scoreProduct(product, words, queryPackKeys, context))
    .sort(
      (a, b) =>
        b.score - a.score || a.product.name.localeCompare(b.product.name),
    );

  const best = scored[0];
  const matched = best && best.score >= 2600 ? best : null;
  const productId = matched?.product.id ?? null;
  const alternatives = buildAlternatives(scored, productId);

  let confidence = matched?.score ?? 0;
  if (matched) {
    if (input.unit === "unclear") confidence -= 2600;
    if (input.unit === "piece") confidence -= 1800;
    if (!input.qty) confidence -= 3000;
    if (!input.hadExplicitUnit && input.unit === "unclear") confidence -= 300;
  } else {
    confidence = 0;
  }
  if (capConfidenceBp !== undefined) {
    confidence = Math.min(confidence, capConfidenceBp);
  }
  if (productId === null) confidence = 0;
  confidence = Math.max(0, Math.min(9900, confidence));

  const needsClarification =
    !productId || !input.qty || input.unit !== "case" || confidence < 5500;

  return {
    rawText: input.rawText,
    productWords: words,
    productId,
    qty: input.qty,
    unit: input.unit,
    confidenceBp: confidence,
    alternatives,
    needsClarification,
    matchMethod: matched?.method ?? "unmatched",
  };
}

export function splitOrderText(text: string): string[] {
  return text
    .split(/\r?\n|;|,|\s+(?:aur|plus|और|तथा)\s+/gi)
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter((segment) => segment.length > 0);
}

export function parseOrderText(
  text: string,
  context: MatchContext,
): ParsedOrder {
  const lines = splitOrderText(text)
    .map((segment) => parseLine(segment, context))
    .filter((line): line is ParsedLine => line !== null);

  return { lines };
}

/** Removes filler words from a product phrase for retailer-scoped alias storage. */
export function aliasCandidate(productWords: string): string {
  const tokens = tokenize(productWords).filter((token) => {
    if (STOP_WORDS.has(token)) return false;
    if (token === "peti" || token === "case" || token === "box") return false;
    if (token === "piece" || token === "pcs" || token === "pack") return false;
    return true;
  });
  return tokens.join(" ").trim().slice(0, 120);
}
