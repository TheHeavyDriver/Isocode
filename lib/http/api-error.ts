export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_TOO_MANY_ATTEMPTS"
  | "CSRF_REJECTED"
  | "STOCK_CHANGED"
  | "PRICE_CHANGED"
  | "SCHEME_CHANGED"
  | "CREDIT_EXCEEDED"
  | "ORDER_NOT_CANCELLABLE"
  | "ALREADY_EXPORTED"
  | "AI_UNAVAILABLE"
  | "CONFLICT"
  | "INTERNAL";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiErrors = {
  unauthenticated: () =>
    new ApiError("UNAUTHENTICATED", 401, "Please sign in to continue."),
  forbidden: (message = "You do not have access to this action.") =>
    new ApiError("FORBIDDEN", 403, message),
  notFound: (message = "We could not find that item.") =>
    new ApiError("NOT_FOUND", 404, message),
  validation: (details?: unknown) =>
    new ApiError(
      "VALIDATION_FAILED",
      422,
      "Please check the highlighted fields.",
      details,
    ),
  rateLimited: (retryAfterSeconds: number) =>
    new ApiError(
      "RATE_LIMITED",
      429,
      `Too many attempts. Try again in ${retryAfterSeconds} seconds.`,
      { retryAfterSeconds },
    ),
};
