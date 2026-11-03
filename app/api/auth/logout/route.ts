import { cookies } from "next/headers";
import { assertSameOrigin, fail, ok } from "@/lib/http/api";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { clearSessionCookie, revokeSessionByToken } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;

    if (token) {
      await revokeSessionByToken(token);
    }
    await clearSessionCookie();

    return ok({ signedOut: true });
  } catch (error) {
    return fail(error);
  }
}
