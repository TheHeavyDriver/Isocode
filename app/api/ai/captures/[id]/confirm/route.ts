import {
  assertSameOrigin,
  fail,
  ok,
  parseBody,
  requireApiRetailer,
} from "@/lib/http/api";
import { apiErrors } from "@/lib/http/api-error";
import { aiConfirmSchema } from "@/lib/validation/order";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { confirmCapture } from "@/lib/ai/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const session = await requireApiRetailer();

    const limit = checkRateLimit(`ai-confirm:${session.user.id}`, 12, 60_000);
    if (!limit.ok) throw apiErrors.rateLimited(limit.retryAfterSeconds);

    const { id } = await params;
    const body = await parseBody(request, aiConfirmSchema);
    const result = await confirmCapture(session, id, body);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
