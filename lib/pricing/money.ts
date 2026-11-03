/** Integer money helpers. Every amount in this project is paisa. */

export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/**
 * Computes (a * b) / c with half-up rounding, using integer arithmetic.
 * Safe for the paisa values used in this app.
 */
export function mulDivRoundHalfUp(a: number, b: number, c: number): number {
  if (c <= 0) throw new Error("Denominator must be positive");
  return Math.floor((a * b + c / 2) / c);
}

/** Splits a GST-inclusive gross amount into taxable value and tax. */
export function splitInclusiveGst(grossPaisa: number, gstRateBp: number) {
  if (grossPaisa < 0) throw new Error("Amount cannot be negative");
  if (gstRateBp < 0 || gstRateBp > 10_000) {
    throw new Error("GST rate must be between 0 and 10000 basis points");
  }

  const taxablePaisa = mulDivRoundHalfUp(
    grossPaisa,
    10_000,
    10_000 + gstRateBp,
  );
  return {
    taxablePaisa,
    taxPaisa: grossPaisa - taxablePaisa,
    totalPaisa: grossPaisa,
  };
}

/** Adds GST to an exclusive net amount. */
export function addExclusiveGst(netPaisa: number, gstRateBp: number) {
  if (netPaisa < 0) throw new Error("Amount cannot be negative");
  if (gstRateBp < 0 || gstRateBp > 10_000) {
    throw new Error("GST rate must be between 0 and 10000 basis points");
  }

  const taxPaisa = mulDivRoundHalfUp(netPaisa, gstRateBp, 10_000);
  return {
    taxablePaisa: netPaisa,
    taxPaisa,
    totalPaisa: netPaisa + taxPaisa,
  };
}

export function gstBreakdown(
  netPaisa: number,
  gstRateBp: number,
  priceIncludesGst: boolean,
) {
  return priceIncludesGst
    ? splitInclusiveGst(netPaisa, gstRateBp)
    : addExclusiveGst(netPaisa, gstRateBp);
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatInr(paisa: number): string {
  return inrFormatter.format(paisa / 100);
}

/** Whole-rupee formatting for dense desk rows. */
export function formatInrCompact(paisa: number): string {
  return inrCompactFormatter.format(paisa / 100);
}

export function percentFromBp(percentBp: number): string {
  return `${(percentBp / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}%`;
}

export function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}
