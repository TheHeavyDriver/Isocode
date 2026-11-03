import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db/client";
import { retailers, sessions, users } from "@/lib/db/schema";
import { getEnv } from "@/lib/config/env";
import { generateSessionToken, hashSessionToken } from "@/lib/auth/crypto";
import { SESSION_COOKIE, SESSION_TTL_DAYS } from "@/lib/auth/constants";

export type UserRole = "retailer" | "desk" | "admin";

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
}

export interface SessionRetailer {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  creditLimitPaisa: number;
  outstandingPaisa: number;
  language: "hi" | "en";
}

export interface SessionContext {
  sessionId: string;
  user: SessionUser;
  retailer: SessionRetailer | null;
}

export function homeForRole(role: UserRole): string {
  return role === "retailer" ? "/shop" : "/desk";
}

export function availableCreditPaisa(retailer: SessionRetailer): number {
  return Math.max(0, retailer.creditLimitPaisa - retailer.outstandingPaisa);
}

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.insert(sessions).values({ userId, tokenHash, expiresAt });
  return { token, tokenHash, expiresAt };
}

export async function revokeSessionByToken(token: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, hashSessionToken(token)));
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: getEnv().APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Resolves the current session from the httpOnly cookie.
 * Cached for the duration of one request so layouts and pages share the read.
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      name: users.name,
      phone: users.phone,
      role: users.role,
      active: users.active,
      retailerId: retailers.id,
      shopName: retailers.shopName,
      ownerName: retailers.ownerName,
      retailerPhone: retailers.phone,
      address: retailers.address,
      creditLimitPaisa: retailers.creditLimitPaisa,
      outstandingPaisa: retailers.outstandingPaisa,
      language: retailers.language,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(retailers, eq(retailers.id, users.retailerId))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
        eq(users.active, true),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    sessionId: row.sessionId,
    user: {
      id: row.userId,
      name: row.name,
      phone: row.phone,
      role: row.role,
    },
    retailer: row.retailerId
      ? {
          id: row.retailerId,
          shopName: row.shopName!,
          ownerName: row.ownerName!,
          phone: row.retailerPhone!,
          address: row.address!,
          creditLimitPaisa: row.creditLimitPaisa!,
          outstandingPaisa: row.outstandingPaisa!,
          language: row.language ?? "hi",
        }
      : null,
  };
});

export async function requirePageSession(
  allowedRoles?: UserRole[],
): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    redirect(homeForRole(session.user.role));
  }
  return session;
}

export async function requireRetailerPage(): Promise<
  SessionContext & { retailer: SessionRetailer }
> {
  const session = await requirePageSession(["retailer"]);
  if (!session.retailer) redirect("/login");
  return session as SessionContext & { retailer: SessionRetailer };
}

export async function requireDeskPage(): Promise<SessionContext> {
  return requirePageSession(["desk", "admin"]);
}
