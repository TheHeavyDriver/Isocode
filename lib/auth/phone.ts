/** Normalises Indian mobile numbers to E.164 (+91XXXXXXXXXX). */
export function normalizePhone(input: string): string | null {
  const cleaned = input.trim().replace(/[\s\-().]/g, "");
  const withoutPlus = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;

  if (!/^\d{10,15}$/.test(withoutPlus)) return null;

  if (withoutPlus.length === 10 && /^[6-9]/.test(withoutPlus)) {
    return `+91${withoutPlus}`;
  }

  if (withoutPlus.length === 12 && withoutPlus.startsWith("91")) {
    const national = withoutPlus.slice(2);
    if (/^[6-9]/.test(national)) return `+${withoutPlus}`;
  }

  if (cleaned.startsWith("+") && withoutPlus.length >= 11) {
    return `+${withoutPlus}`;
  }

  return null;
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return "••••";
  return `${phone.slice(0, 3)}••••••${phone.slice(-2)}`;
}

/** Best-effort client IP for rate limiting, never stored raw. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
