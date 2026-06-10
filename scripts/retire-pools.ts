/**
 * Retira de la oferta la quiniela GRATIS y la privada de Q25.
 * Solo cancela quinielas SIN boletos activos (si alguien ya pagó, no toca
 * nada y avisa, para hacer reembolso manual primero).
 *
 * Ejecutar con: npx tsx scripts/retire-pools.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const targets = await prisma.pool.findMany({
    where: {
      status: { in: ["OPEN", "CLOSED"] },
      OR: [{ entryFeeCents: 0 }, { entryFeeCents: 2500, type: "PRIVATE" }],
    },
    include: { _count: { select: { entries: { where: { status: "ACTIVE" } } } } },
  });

  if (targets.length === 0) {
    console.log("Nada que retirar.");
    return;
  }

  for (const p of targets) {
    if (p._count.entries > 0) {
      console.log(`! "${p.name}" tiene ${p._count.entries} boletos activos. NO se cancela — reembolsa primero.`);
      continue;
    }
    await prisma.pool.update({ where: { id: p.id }, data: { status: "CANCELLED" } });
    console.log(`- Cancelada: "${p.name}" (${p.id})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
