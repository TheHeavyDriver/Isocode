import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { ApiError } from "@/lib/http/api-error";
import { getSession } from "@/lib/auth/session";
import type { SessionContext, UserRole } from "@/lib/auth/session";
import { getEnv } from "@/lib/config/env";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init);
}

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        ok: false as const,
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      },
      { status: error.status },
    );
  }

  console.error("Unhandled API error", error);
  return NextResponse.json(
    {
      ok: false as const,
      error: {
        code: "INTERNAL" as const,
        message: "Something went wrong. Please try again.",
        details: null,
      },
    },
    { status: 500 },
  );
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new ApiError(
      "CSRF_REJECTED",
      403,
      "This request did not come from the app.",
    );
  }

  if (!origin) return;

  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = new URL(getEnv().APP_URL).origin;
  if (origin !== requestOrigin && origin !== configuredOrigin) {
    throw new ApiError(
      "CSRF_REJECTED",
      403,
      "This request did not come from the app.",
    );
  }
}

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError("VALIDATION_FAILED", 422, "Send a valid JSON body.");
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiError(
      "VALIDATION_FAILED",
      422,
      "Please check the highlighted fields.",
      result.error.flatten().fieldErrors,
    );
  }
  return result.data;
}

export async function requireApiSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    throw new ApiError("UNAUTHENTICATED", 401, "Please sign in to continue.");
  }
  return session;
}

export async function requireApiRole(
  roles: UserRole[],
): Promise<SessionContext> {
  const session = await requireApiSession();
  if (!roles.includes(session.user.role)) {
    throw new ApiError(
      "FORBIDDEN",
      403,
      "You do not have access to this action.",
    );
  }
  return session;
}

export async function requireApiRetailer(): Promise<
  SessionContext & { retailer: NonNullable<SessionContext["retailer"]> }
> {
  const session = await requireApiRole(["retailer"]);
  if (!session.retailer) {
    throw new ApiError("FORBIDDEN", 403, "No shop is linked to this account.");
  }
  return session as SessionContext & {
    retailer: NonNullable<SessionContext["retailer"]>;
  };
}
