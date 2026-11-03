import {
  assertSameOrigin,
  fail,
  ok,
  parseBody,
  requireApiRetailer,
} from "@/lib/http/api";
import { db } from "@/lib/db/client";
import { retailers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { languageSchema } from "@/lib/validation/order";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireApiRetailer();
    const body = await parseBody(request, languageSchema);

    await db
      .update(retailers)
      .set({ language: body.language, updatedAt: new Date() })
      .where(eq(retailers.id, session.retailer.id));

    return ok({ language: body.language });
  } catch (error) {
    return fail(error);
  }
}
