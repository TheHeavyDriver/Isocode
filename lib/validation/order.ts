import { z } from "zod";
import { normalizePhone } from "@/lib/auth/phone";

export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Enter your mobile number")
  .max(20, "Enter a valid mobile number")
  .refine((value) => normalizePhone(value) !== null, {
    message: "Enter a valid 10-digit Indian mobile number",
  })
  .transform((value) => normalizePhone(value)!);

export const requestOtpSchema = z.object({ phone: phoneSchema }).strict();

export const verifyOtpSchema = z
  .object({
    phone: phoneSchema,
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code"),
  })
  .strict();

export const cartLineSchema = z
  .object({
    productId: z.uuid("Unknown product"),
    qtyCases: z.number().int().min(1).max(999),
  })
  .strict();

export const cartSchema = z
  .object({
    lines: z.array(cartLineSchema).min(1, "Your cart is empty").max(100),
  })
  .strict();

export const placeOrderSchema = z
  .object({
    lines: z.array(cartLineSchema).min(1, "Your cart is empty").max(100),
    idempotencyKey: z.string().trim().min(12).max(100),
    notes: z.string().trim().max(500).optional().default(""),
    source: z.enum(["manual", "ai", "repeat"]).default("manual"),
    aiCaptureId: z.uuid().optional(),
  })
  .strict();

export type CartInput = z.infer<typeof cartSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const deskActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("hold"),
      reason: z.string().trim().min(3, "Add a reason for the hold").max(300),
    })
    .strict(),
  z
    .object({
      action: z.literal("approve_credit"),
      reason: z.string().trim().max(300).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("reject_credit"),
      reason: z.string().trim().max(300).optional(),
    })
    .strict(),
  z.object({ action: z.literal("confirm") }).strict(),
  z
    .object({
      action: z.literal("cancel"),
      reason: z.string().trim().max(300).optional(),
    })
    .strict(),
]);

export type DeskActionInput = z.infer<typeof deskActionSchema>;

export const aiCaptureSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(3, "Paste the order message first")
      .max(2000, "Keep the message under 2,000 characters"),
  })
  .strict();

export const aiConfirmLineSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("accept"),
      lineId: z.uuid(),
      productId: z.uuid(),
      qty: z.number().int().min(1).max(999),
      unit: z.enum(["case", "piece"]),
      aliasTerm: z.string().trim().max(120).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("remove"),
      lineId: z.uuid(),
    })
    .strict(),
]);

export const aiConfirmSchema = z
  .object({
    lines: z.array(aiConfirmLineSchema).min(1).max(50),
  })
  .strict();

export type AiConfirmInput = z.infer<typeof aiConfirmSchema>;

export const exportSchema = z
  .object({
    orderIds: z.array(z.uuid()).min(1).max(50),
    format: z.enum(["tally_xml", "csv"]),
  })
  .strict();

export type ExportInput = z.infer<typeof exportSchema>;

export const languageSchema = z
  .object({ language: z.enum(["hi", "en"]) })
  .strict();
