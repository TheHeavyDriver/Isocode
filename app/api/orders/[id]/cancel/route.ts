import { assertSameOrigin, fail, ok, requireApiRetailer } from "@/lib/http/api";
import { cancelRetailerOrder } from "@/lib/orders/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const session = await requireApiRetailer();
    const { id } = await params;
    await cancelRetailerOrder(session, id);
    return ok({ cancelled: true });
  } catch (error) {
    return fail(error);
  }
}
