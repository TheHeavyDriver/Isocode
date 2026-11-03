import { assertSameOrigin, fail, ok, parseBody } from "@/lib/http/api";
import { requestOtp } from "@/lib/auth/otp-service";
import { requestOtpSchema } from "@/lib/validation/order";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await parseBody(request, requestOtpSchema);
    const result = await requestOtp(body.phone);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
