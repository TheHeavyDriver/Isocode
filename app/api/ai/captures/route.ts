import {
  assertSameOrigin,
  fail,
  ok,
  parseBody,
  requireApiRetailer,
} from "@/lib/http/api";
import { apiErrors } from "@/lib/http/api-error";
import { aiCaptureSchema } from "@/lib/validation/order";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createCapture } from "@/lib/ai/service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireApiRetailer();

    const limit = checkRateLimit(`ai:${session.user.id}`, 8, 60_000);
    if (!limit.ok) throw apiErrors.rateLimited(limit.retryAfterSeconds);

    const body = await parseBody(request, aiCaptureSchema);
    const result = await createCapture(session, body.text);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
