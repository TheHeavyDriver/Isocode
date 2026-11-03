import {
  assertSameOrigin,
  fail,
  ok,
  parseBody,
  requireApiRetailer,
} from "@/lib/http/api";
import { apiErrors, ApiError } from "@/lib/http/api-error";
import { cartSchema } from "@/lib/validation/order";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { previewRetailerCart } from "@/lib/orders/pricing";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireApiRetailer();

    const limit = checkRateLimit(`cart:${session.user.id}`, 120, 60_000);
    if (!limit.ok) throw apiErrors.rateLimited(limit.retryAfterSeconds);

    const body = await parseBody(request, cartSchema);
    const preview = await previewRetailerCart(session.retailer, body.lines);
    return ok(preview);
  } catch (error) {
    if (error instanceof ApiError) return fail(error);
    return fail(error);
  }
}
