import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { getEnv } from "@/lib/config/env";

export function hashOtp(phone: string, code: string): string {
  return createHmac("sha256", getEnv().OTP_PEPPER)
    .update(`${phone}:${code}`)
    .digest("hex");
}

export function verifyOtpHash(
  phone: string,
  code: string,
  expected: string,
): boolean {
  const actual = hashOtp(phone, code);
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHmac("sha256", getEnv().AUTH_SECRET).update(token).digest("hex");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
