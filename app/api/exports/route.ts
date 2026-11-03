import {
  assertSameOrigin,
  fail,
  ok,
  parseBody,
  requireApiRole,
} from "@/lib/http/api";
import { apiErrors } from "@/lib/http/api-error";
import { exportSchema } from "@/lib/validation/order";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createExport, listExports } from "@/lib/exports/service";

export async function GET() {
  try {
    await requireApiRole(["desk", "admin"]);
    return ok({ exports: await listExports() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireApiRole(["desk", "admin"]);

    const limit = checkRateLimit(`export:${session.user.id}`, 20, 60_000);
    if (!limit.ok) throw apiErrors.rateLimited(limit.retryAfterSeconds);

    const body = await parseBody(request, exportSchema);
    const result = await createExport(session, body);
    return ok({ export: result });
  } catch (error) {
    return fail(error);
  }
}
