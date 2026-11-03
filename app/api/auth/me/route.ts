import { fail, ok, requireApiSession } from "@/lib/http/api";
import { availableCreditPaisa } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await requireApiSession();
    return ok({
      user: session.user,
      retailer: session.retailer
        ? {
            ...session.retailer,
            availableCreditPaisa: availableCreditPaisa(session.retailer),
          }
        : null,
    });
  } catch (error) {
    return fail(error);
  }
}
