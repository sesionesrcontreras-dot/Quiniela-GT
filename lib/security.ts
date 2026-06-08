/**
 * Utilidades de seguridad.
 *
 *  - Rate limiting en memoria (suficiente para 1 instancia / desarrollo).
 *    En produccion con varias instancias, usar Upstash Redis o similar.
 *  - Helpers para respuestas JSON y manejo uniforme de errores.
 *  - Registro de auditoria.
 */

import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { AuthError } from "./auth";
import { ValidationError } from "./validation";

// ───────────── Rate limiting (ventana fija, en memoria) ─────────────
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  b.count += 1;
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count) };
}

/** Obtiene IP del request (detras de proxy usa x-forwarded-for). */
export function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "0.0.0.0";
}

// ───────────── Respuestas / manejo de errores ─────────────
export function ok(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Convierte excepciones conocidas en respuestas HTTP limpias. */
export function handleError(e: unknown) {
  if (e instanceof AuthError) return fail(e.message, e.status);
  if (e instanceof ValidationError) return fail(e.message, 422);
  if (e instanceof Error) {
    // No filtrar detalles internos en produccion.
    const msg =
      process.env.NODE_ENV === "production" ? "Error interno" : e.message;
    return fail(msg, 500);
  }
  return fail("Error desconocido", 500);
}

// ───────────── Auditoria ─────────────
export async function audit(params: {
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      ip: params.ip,
    },
  });
}
