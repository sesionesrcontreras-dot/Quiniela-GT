/**
 * Autenticacion. Para el MVP usamos sesiones propias con:
 *   - bcryptjs  -> hash de contraseñas (nunca se guardan en texto plano)
 *   - jose      -> JWT firmado guardado en cookie httpOnly + Secure
 *
 * En produccion puedes migrar a NextAuth.js / Auth.js si quieres OAuth
 * (Google) sin reescribir el resto: la idea de "sesion" es la misma.
 */

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { Role } from "./enums";

const COOKIE = "qgt_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-inseguro-solo-dev"
);

export interface SessionPayload {
  uid: string;
  role: string; // valores en enums.ts (Role): PLAYER | ADMIN | FINANCE
  email: string;
}

export async function hashPassword(plain: string): Promise<string> {
  // 12 rondas: balance seguridad/rendimiento recomendado.
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  cookies().set(COOKIE, token, {
    httpOnly: true, // JS del navegador NO puede leerla (anti-XSS robo de sesion)
    secure: process.env.NODE_ENV === "production", // solo https en prod
    sameSite: "lax", // mitiga CSRF
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Lanza error si no hay sesion. Uso en rutas protegidas. */
export async function requireUser(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new AuthError("No autenticado", 401);
  const user = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!user || user.isBlocked) throw new AuthError("Cuenta no valida", 403);
  return s;
}

/** Lanza error si no es ADMIN. */
export async function requireAdmin(): Promise<SessionPayload> {
  const s = await requireUser();
  if (s.role !== Role.ADMIN) throw new AuthError("Requiere rol ADMIN", 403);
  return s;
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
