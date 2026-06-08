import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { parse, registerSchema } from "@/lib/validation";
import { ok, fail, handleError, rateLimit, getIp, audit } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = getIp(req);
    if (!rateLimit(`register:${ip}`, 5, 60_000).ok)
      return fail("Demasiados intentos, espera un momento", 429);

    const body = await req.json();
    const data = parse(registerSchema, body);

    // Validacion +18 si se proporciona fecha de nacimiento.
    if (data.dateOfBirth) {
      const age =
        (Date.now() - data.dateOfBirth.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 18) return fail("Debes ser mayor de 18 años", 403);
    }

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return fail("El correo ya esta registrado", 409);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await hashPassword(data.password),
        dateOfBirth: data.dateOfBirth,
      },
    });

    await createSession({ uid: user.id, role: user.role, email: user.email });
    await audit({ actorId: user.id, action: "USER_REGISTER", entity: "User", entityId: user.id, ip });

    return ok({ id: user.id, name: user.name, email: user.email });
  } catch (e) {
    return handleError(e);
  }
}
