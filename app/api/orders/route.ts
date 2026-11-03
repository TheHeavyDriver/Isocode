import {
  assertSameOrigin,
  fail,
  ok,
  parseBody,
  requireApiRetailer,
} from "@/lib/http/api";
import { apiErrors } from "@/lib/http/api-error";
import { placeOrderSchema } from "@/lib/validation/order";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createRetailerOrder, listRetailerOrders } from "@/lib/orders/service";

export async function GET() {
  try {
    const session = await requireApiRetailer();
    const orders = await listRetailerOrders(session.retailer.id);
    return ok({ orders });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireApiRetailer();

    const limit = checkRateLimit(`orders:${session.user.id}`, 12, 60_000);
    if (!limit.ok) throw apiErrors.rateLimited(limit.retryAfterSeconds);

    const body = await parseBody(request, placeOrderSchema);
    const order = await createRetailerOrder(session, body);
    return ok({ order });
  } catch (error) {
    return fail(error);
  }
}
