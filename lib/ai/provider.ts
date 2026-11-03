import { z } from "zod";
import { getEnv } from "@/lib/config/env";
import type { AiUnit } from "@/lib/ai/types";

const providerLineSchema = z.object({
  rawText: z.string().trim().min(1).max(300),
  productWords: z.string().trim().max(160).default(""),
  qty: z.number().int().min(1).max(999).nullable().default(null),
  unit: z.enum(["case", "piece", "unclear"]).default("unclear"),
  confidence: z.number().min(0).max(1).default(0.5),
});

const providerResponseSchema = z.object({
  lines: z.array(providerLineSchema).max(50),
});

export interface ProviderLine {
  rawText: string;
  productWords: string;
  qty: number | null;
  unit: AiUnit;
  confidence: number;
}

export interface ProviderExtraction {
  model: string;
  lines: ProviderLine[];
}

const SYSTEM_PROMPT = `You extract product order lines from a distributor's order message.
The message may be Hindi, English, Hinglish, or a mix.
Return JSON only, with this exact shape:
{"lines":[{"rawText":"original words for this line","productWords":"product words only","qty":5,"unit":"case","confidence":0.9}]}

Rules:
- Split on commas, newlines, "aur", and "plus".
- "peti", "case", "box" are unit "case". "piece", "pcs", "nag" are unit "piece".
- If the message does not state a unit, use "unclear". Never guess case or piece.
- qty must be a whole number, or null when no quantity is stated.
- confidence is between 0 and 1. Be honest when the product or unit is unclear.
- Do not invent a product that is not in the message.
- Do not add commentary or markdown.`;

function stripCodeFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(9000),
      });
      if (response.ok) return response;
      lastError = new Error(`AI provider returned ${response.status}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("AI provider request failed");
}

async function extractWithOpenAi(
  text: string,
  apiKey: string,
  model: string,
): Promise<ProviderExtraction> {
  const response = await fetchWithRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    },
  );

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned no content");

  const parsed = providerResponseSchema.safeParse(
    JSON.parse(stripCodeFence(content)),
  );
  if (!parsed.success) throw new Error("AI provider returned an invalid shape");

  return { model, lines: parsed.data.lines };
}

async function extractWithAnthropic(
  text: string,
  apiKey: string,
  model: string,
): Promise<ProviderExtraction> {
  const response = await fetchWithRetry(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
      }),
    },
  );

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const content = payload.content?.find((block) => block.type === "text")?.text;
  if (!content) throw new Error("AI provider returned no content");

  const parsed = providerResponseSchema.safeParse(
    JSON.parse(stripCodeFence(content)),
  );
  if (!parsed.success) throw new Error("AI provider returned an invalid shape");

  return { model, lines: parsed.data.lines };
}

/**
 * Sends only the order text to the provider. The caller records provenance on
 * the capture; a null result means the deterministic parser should be used.
 */
export async function extractWithAiProvider(
  text: string,
): Promise<ProviderExtraction | null> {
  const env = getEnv();
  if (env.AI_PROVIDER === "mock" || !env.AI_API_KEY) return null;

  const defaultModel =
    env.AI_PROVIDER === "openai" ? "gpt-4o-mini" : "claude-3-5-haiku-latest";
  const model = env.AI_MODEL?.trim() || defaultModel;

  try {
    if (env.AI_PROVIDER === "openai") {
      return await extractWithOpenAi(text, env.AI_API_KEY, model);
    }
    return await extractWithAnthropic(text, env.AI_API_KEY, model);
  } catch (error) {
    // The fallback is the product path, not an emergency. Never log the text.
    console.warn("AI provider unavailable; using deterministic capture", {
      provider: env.AI_PROVIDER,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}
