import {
  assertSameOrigin,
  fail,
  ok,
  parseBody,
  requireApiRole,
} from "@/lib/http/api";
import { apiErrors } from "@/lib/http/api-error";
import { deskActionSchema } from "@/lib/validation/order";
import { applyDeskOrderAction } from "@/lib/orders/service";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const session = await requireApiRole(["desk", "admin"]);

    const limit = checkRateLimit(`desk:${session.user.id}`, 60, 60_000);
    if (!limit.ok) throw apiErrors.rateLimited(limit.retryAfterSeconds);

    const { id } = await params;
    const action = await parseBody(request, deskActionSchema);
    await applyDeskOrderAction(session, id, action);
    return ok({ done: true });
  } catch (error) {
    return fail(error);
  }
}
