import { fail, ok, requireApiRetailer } from "@/lib/http/api";
import { getRetailerCapture } from "@/lib/ai/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRetailer();
    const { id } = await params;
    const capture = await getRetailerCapture(id, session.retailer.id);
    return ok({ capture });
  } catch (error) {
    return fail(error);
  }
}
