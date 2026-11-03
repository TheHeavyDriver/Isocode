export type AiUnit = "case" | "piece" | "unclear";
export type ConfidenceBand = "high" | "medium" | "low";

export interface MatchProduct {
  id: string;
  skuCode: string;
  name: string;
  hindiAliases: string[];
  packSize: string;
  caseSize: number;
  stockCases: number;
}

export interface MatchAlias {
  normalizedTerm: string;
  productId: string;
}

export interface MatchContext {
  products: MatchProduct[];
  aliases?: MatchAlias[];
  pastOrderCounts?: Map<string, number>;
}

export interface ParsedAlternative {
  productId: string;
  scoreBp: number;
}

export interface ParsedLine {
  rawText: string;
  productWords: string;
  productId: string | null;
  qty: number | null;
  unit: AiUnit;
  confidenceBp: number;
  alternatives: ParsedAlternative[];
  needsClarification: boolean;
  matchMethod: "retailer_alias" | "alias" | "exact" | "fuzzy" | "unmatched";
}

export interface ParsedOrder {
  lines: ParsedLine[];
}

export function confidenceBand(confidenceBp: number): ConfidenceBand {
  if (confidenceBp >= 8500) return "high";
  if (confidenceBp >= 6000) return "medium";
  return "low";
}

export function confidenceLabel(confidenceBp: number): string {
  if (confidenceBp >= 8500) return "High confidence";
  if (confidenceBp >= 6000) return "Check this line";
  return "Low confidence";
}
