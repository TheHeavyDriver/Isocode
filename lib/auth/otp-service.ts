import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { otpChallenges, users } from "@/lib/db/schema";
import {
  OTP_MAX_ATTEMPTS,
  OTP_REQUESTS_PER_WINDOW,
  OTP_REQUEST_WINDOW_SECONDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
} from "@/lib/auth/constants";
import { generateOtp, hashOtp, verifyOtpHash } from "@/lib/auth/crypto";
import { getEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/http/api-error";
import { sendOtpSms } from "@/lib/infra/sms";
import { checkRateLimit } from "@/lib/security/rate-limit";

export interface OtpRequestResult {
  expiresInSeconds: number;
  resendAfterSeconds: number;
  demoOtpEnabled: boolean;
}

/**
 * Creates an OTP challenge for a registered phone. Unknown phones receive the
 * same response as registered phones to avoid account enumeration.
 */
export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  const ipLimit = checkRateLimit(
    `otp-request:${phone}`,
    OTP_REQUESTS_PER_WINDOW,
    OTP_REQUEST_WINDOW_SECONDS * 1000,
  );
  if (!ipLimit.ok) {
    throw new ApiError(
      "RATE_LIMITED",
      429,
      `Too many codes requested. Try again in ${ipLimit.retryAfterSeconds} seconds.`,
      { retryAfterSeconds: ipLimit.retryAfterSeconds },
    );
  }

  const [user] = await db
    .select({ id: users.id, active: users.active })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  const now = new Date();
  const windowStart = new Date(
    now.getTime() - OTP_REQUEST_WINDOW_SECONDS * 1000,
  );

  if (user?.active) {
    const [latest] = await db
      .select({ createdAt: otpChallenges.createdAt })
      .from(otpChallenges)
      .where(eq(otpChallenges.phone, phone))
      .orderBy(desc(otpChallenges.createdAt))
      .limit(1);

    if (latest) {
      const elapsedSeconds =
        (now.getTime() - latest.createdAt.getTime()) / 1000;
      if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
        const retryAfterSeconds = Math.ceil(
          OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds,
        );
        throw new ApiError(
          "RATE_LIMITED",
          429,
          `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
          { retryAfterSeconds },
        );
      }
    }

    const [recent] = await db
      .select({ total: count() })
      .from(otpChallenges)
      .where(
        and(
          eq(otpChallenges.phone, phone),
          gt(otpChallenges.createdAt, windowStart),
        ),
      );

    if ((recent?.total ?? 0) >= OTP_REQUESTS_PER_WINDOW) {
      throw new ApiError(
        "RATE_LIMITED",
        429,
        "Too many codes requested for this number. Try again later.",
        { retryAfterSeconds: OTP_REQUEST_WINDOW_SECONDS },
      );
    }
  }

  if (!user?.active) {
    return {
      expiresInSeconds: OTP_TTL_SECONDS,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      demoOtpEnabled: Boolean(getEnv().DEMO_OTP),
    };
  }

  const code = getEnv().DEMO_OTP ?? generateOtp();
  const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);

  await db.insert(otpChallenges).values({
    phone,
    codeHash: hashOtp(phone, code),
    expiresAt,
  });

  await sendOtpSms({ phone, code });

  return {
    expiresInSeconds: OTP_TTL_SECONDS,
    resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    demoOtpEnabled: Boolean(getEnv().DEMO_OTP),
  };
}

export interface VerifiedUser {
  id: string;
  name: string;
  phone: string;
  role: "retailer" | "desk" | "admin";
}

export async function verifyOtpCode(
  phone: string,
  code: string,
): Promise<VerifiedUser> {
  const limit = checkRateLimit(
    `otp-verify:${phone}`,
    OTP_MAX_ATTEMPTS * 2,
    OTP_REQUEST_WINDOW_SECONDS * 1000,
  );
  if (!limit.ok) {
    throw new ApiError(
      "OTP_TOO_MANY_ATTEMPTS",
      429,
      "Too many attempts. Request a new code later.",
      { retryAfterSeconds: limit.retryAfterSeconds },
    );
  }

  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(
      and(eq(otpChallenges.phone, phone), isNull(otpChallenges.consumedAt)),
    )
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);

  if (!challenge) {
    throw new ApiError("OTP_INVALID", 422, "That code is not valid.");
  }

  if (challenge.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(
      "OTP_EXPIRED",
      422,
      "That code has expired. Request a new one.",
    );
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(
      "OTP_TOO_MANY_ATTEMPTS",
      429,
      "Too many wrong attempts. Request a new code.",
    );
  }

  const matches = verifyOtpHash(phone, code, challenge.codeHash);
  if (!matches) {
    const attempts = challenge.attempts + 1;
    await db
      .update(otpChallenges)
      .set({ attempts })
      .where(eq(otpChallenges.id, challenge.id));

    if (attempts >= OTP_MAX_ATTEMPTS) {
      throw new ApiError(
        "OTP_TOO_MANY_ATTEMPTS",
        429,
        "Too many wrong attempts. Request a new code.",
      );
    }

    throw new ApiError(
      "OTP_INVALID",
      422,
      `That code does not match. ${OTP_MAX_ATTEMPTS - attempts} attempt${OTP_MAX_ATTEMPTS - attempts === 1 ? "" : "s"} left.`,
    );
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      role: users.role,
      active: users.active,
    })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (!user?.active) {
    throw new ApiError("OTP_INVALID", 422, "That code is not valid.");
  }

  await db
    .update(otpChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(otpChallenges.id, challenge.id));

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
  };
}
