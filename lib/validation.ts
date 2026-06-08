/**
 * Validacion de TODA entrada del usuario con Zod.
 * Nunca confiamos en datos del cliente: se validan antes de tocar la DB.
 * Esto bloquea inyecciones, datos basura y montos negativos.
 */

import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  password: z
    .string()
    .min(8, "Minimo 8 caracteres")
    .max(72) // limite de bcrypt
    .regex(/[0-9]/, "Debe incluir un numero")
    .regex(/[a-zA-Z]/, "Debe incluir una letra"),
  dateOfBirth: z.coerce.date().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createPoolSchema = z.object({
  name: z.string().min(3).max(80),
  tournamentId: z.string().min(1),
  type: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  entryFeeQuetzales: z.number().min(0).max(100000),
  rakePercent: z.number().int().min(0).max(30),
  maxEntriesPerUser: z.number().int().min(1).max(20).default(1),
  prizeSplit: z.array(z.number().int().min(0).max(100)).default([60, 30, 10]),
  scoring: z
    .object({
      exact: z.number().int().min(0).max(20),
      outcome: z.number().int().min(0).max(20),
      goalDiff: z.number().int().min(0).max(20).optional(),
    })
    .default({ exact: 3, outcome: 1 }),
});

export const joinPoolSchema = z.object({
  poolId: z.string().min(1),
  inviteCode: z.string().optional(),
});

export const predictionSchema = z.object({
  entryId: z.string().min(1),
  predictions: z
    .array(
      z.object({
        matchId: z.string().min(1),
        predHome: z.number().int().min(0).max(30),
        predAway: z.number().int().min(0).max(30),
      })
    )
    .min(1)
    .max(64),
});

export const createPaymentSchema = z.object({
  amountQuetzales: z.number().positive().max(100000),
  method: z.enum(["BANK_TRANSFER", "CARD_PAGGO", "CASH_AGENCY"]),
  reference: z.string().max(120).optional(),
  proofUrl: z.string().url().optional(),
});

export const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1),
  decision: z.enum(["CONFIRM", "REJECT"]),
  feeQuetzales: z.number().min(0).max(100000).optional(),
});

export const setResultSchema = z.object({
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30),
});

/** Helper: valida y devuelve datos o lanza error legible. */
export function parse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new ValidationError(msg);
  }
  return r.data;
}

export class ValidationError extends Error {}
