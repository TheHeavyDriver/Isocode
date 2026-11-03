import { assertSameOrigin, fail, ok, parseBody } from "@/lib/http/api";
import { verifyOtpCode } from "@/lib/auth/otp-service";
import {
  createSession,
  homeForRole,
  setSessionCookie,
} from "@/lib/auth/session";
import { verifyOtpSchema } from "@/lib/validation/order";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await parseBody(request, verifyOtpSchema);
    const user = await verifyOtpCode(body.phone, body.code);
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return ok({
      user,
      redirectTo: homeForRole(user.role),
    });
  } catch (error) {
    return fail(error);
  }
}
