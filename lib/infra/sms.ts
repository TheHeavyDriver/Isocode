import { getEnv } from "@/lib/config/env";

/**
 * Mock SMS delivery for the demo. A real provider plugs in here later.
 * OTP codes are never written to logs.
 */
export async function sendOtpSms(_input: {
  phone: string;
  code: string;
}): Promise<void> {
  const provider = getEnv().SMS_PROVIDER;
  if (provider === "none") {
    throw new Error("SMS delivery is not configured");
  }
  // Mock provider: delivery is intentionally a no-op.
}
