export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ClientApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  let payload: { ok: true; data: T } | ApiFailure;
  try {
    payload = await response.json();
  } catch {
    throw new ClientApiError(
      "INTERNAL",
      "The server sent an unexpected response. Please try again.",
    );
  }

  if (!payload.ok) {
    throw new ClientApiError(
      payload.error.code,
      payload.error.message,
      payload.error.details,
    );
  }

  return payload.data;
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "GET" });
  return parseResponse<T>(response);
}
