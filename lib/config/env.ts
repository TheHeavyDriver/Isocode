import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .startsWith("postgres", "DATABASE_URL must be a PostgreSQL URL"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  OTP_PEPPER: z.string().min(16, "OTP_PEPPER must be at least 16 characters"),
  EXPORT_SIGNING_SECRET: z
    .string()
    .min(16, "EXPORT_SIGNING_SECRET must be at least 16 characters"),
  DEMO_OTP: z
    .string()
    .regex(/^\d{6}$/, "DEMO_OTP must be six digits")
    .optional(),
  SMS_PROVIDER: z.enum(["mock", "none"]).default("mock"),
  SMS_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(["mock", "openai", "anthropic"]).default("mock"),
  AI_MODEL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration. Copy .env.example to .env.local and fill the values.\n${details}`,
    );
  }

  cached = parsed.data;
  return cached;
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}
