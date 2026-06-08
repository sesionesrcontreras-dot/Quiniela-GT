import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { parse, loginSchema } from "@/lib/validation";
import { ok, fail, handleError, rateLimit, getIp, audit } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = getIp(req);
    // Limite estricto contra fuerza bruta de contraseñas.
    if (!rateLimit(`login:${ip}`, 10, 60_000).ok)
      return fail("Demasiados intentos, espera un momento", 429);

    const data = parse(loginSchema, await req.json());
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    // Mensaje generico para no revelar si el correo existe (anti enumeracion).
    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      return fail("Credenciales invalidas", 401);
    }
    if (user.isBlocked) return fail("Cuenta bloqueada", 403);

    await createSession({ uid: user.id, role: user.role, email: user.email });
    await audit({ actorId: user.id, action: "USER_LOGIN", entity: "User", entityId: user.id, ip });

    return ok({ id: user.id, name: user.name, role: user.role });
  } catch (e) {
    return handleError(e);
  }
}
