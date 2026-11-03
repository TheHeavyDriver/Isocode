/** Text normalisation shared by the deterministic matcher and the AI adapter. */

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

export const NUMBER_WORDS: Record<string, number> = {
  ek: 1,
  ik: 1,
  one: 1,
  do: 2,
  two: 2,
  teen: 3,
  tin: 3,
  three: 3,
  char: 4,
  chaar: 4,
  four: 4,
  paanch: 5,
  panch: 5,
  five: 5,
  chhe: 6,
  chhah: 6,
  che: 6,
  six: 6,
  saat: 7,
  sat: 7,
  seven: 7,
  aath: 8,
  ath: 8,
  eight: 8,
  nau: 9,
  nine: 9,
  das: 10,
  dus: 10,
  ten: 10,
  bees: 20,
  twenty: 20,
};

export const STOP_WORDS = new Set([
  "bhaiya",
  "bhai",
  "bhaiyya",
  "ji",
  "please",
  "plz",
  "pls",
  "order",
  "chahiye",
  "chaiye",
  "chahie",
  "dena",
  "dedo",
  "de",
  "do",
  "kar",
  "karo",
  "hai",
  "hain",
  "ka",
  "ke",
  "ki",
  "ko",
  "me",
  "mein",
  "se",
  "aur",
  "and",
  "wala",
  "wale",
  "wali",
  "waley",
  "bhejo",
  "bhej",
  "send",
  "need",
  "want",
  "for",
  "the",
  "of",
  "some",
  "भैया",
  "भाई",
  "जी",
  "ऑर्डर",
  "चाहिए",
  "चाहिये",
  "देना",
  "दो",
  "देदो",
  "भेज",
  "भेजो",
  "भेजना",
  "कर",
  "करो",
  "है",
  "हैं",
  "का",
  "के",
  "की",
  "को",
  "में",
  "से",
  "और",
  "वाला",
  "वाले",
  "वाली",
]);

export const MEASURE_UNITS = new Set([
  "g",
  "gm",
  "gms",
  "gram",
  "grams",
  "kg",
  "kilo",
  "kilos",
  "kilogram",
  "kilograms",
  "ml",
  "l",
  "lt",
  "ltr",
  "litre",
  "litres",
  "liter",
  "liters",
  "bag",
  "bags",
  "s",
]);

export function normalizeText(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[०-९]/g, (digit) => DEVANAGARI_DIGITS[digit] ?? digit)
      // \p{M} keeps Devanagari vowel signs (matras); stripping them turns
      // “मारी” into “म र” and breaks Hindi matching.
      .replace(/[^\p{L}\p{M}\p{N}\s.%]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function tokenize(value: string): string[] {
  return normalizeText(value).split(" ").filter(Boolean);
}

export function meaningfulTokens(value: string): string[] {
  return tokenize(value).filter((token) => {
    if (STOP_WORDS.has(token)) return false;
    if (MEASURE_UNITS.has(token)) return false;
    if (/^\d+(?:\.\d+)?$/.test(token)) return false;
    return true;
  });
}

export function normalizeAliasTerm(value: string): string {
  return normalizeText(value).replace(/\s+/g, " ").trim();
}

export function parseNumberWord(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  if (/^\d+$/.test(normalized)) {
    const parsed = Number.parseInt(normalized, 10);
    return parsed > 0 ? parsed : null;
  }
  return NUMBER_WORDS[normalized] ?? null;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }
    previous = current;
  }
  return previous[b.length] ?? Math.max(a.length, b.length);
}

export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}
