/**
 * Endurecimiento previo al lanzamiento:
 *  1. Bloquea los usuarios DEMO (ana/luis) cuya contraseña es publica
 *     (esta en el seed del repositorio). Bloquear > borrar: conserva la
 *     trazabilidad contable y de auditoria.
 *  2. Cambia la contraseña del admin por una aleatoria fuerte y la imprime
 *     UNA vez. Guardala en un gestor de contraseñas y cambiala al entrar.
 *
 * Ejecutar con: npx tsx scripts/harden-launch.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  // 1. bloquear cuentas demo
  const demos = await prisma.user.updateMany({
    where: { email: { in: ["ana@demo.gt", "luis@demo.gt"] }, isBlocked: false },
    data: { isBlocked: true },
  });
  console.log(`Usuarios demo bloqueados: ${demos.count}`);

  // 2. rotar contraseña del admin
  const admin = await prisma.user.findUnique({ where: { email: "admin@quiniela.gt" } });
  if (!admin) throw new Error("No existe admin@quiniela.gt");

  const stillDefault = await bcrypt.compare("Password123", admin.passwordHash);
  if (!stillDefault) {
    console.log("La contraseña del admin ya NO es la del seed. No se toca.");
    return;
  }

  // legible y fuerte: 4 bloques base64url de 5 chars (~120 bits)
  const newPass = randomBytes(16).toString("base64url").replace(/[-_]/g, "x").slice(0, 20);
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(newPass, 12) },
  });
  await prisma.auditLog.create({
    data: { action: "ADMIN_PASSWORD_ROTATED", entity: "User", entityId: admin.id },
  });

  console.log("════════════════════════════════════════════════");
  console.log("NUEVA contraseña de admin@quiniela.gt (se muestra UNA vez):");
  console.log(`    ${newPass}`);
  console.log("Guardala ahora en un lugar seguro.");
  console.log("════════════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
