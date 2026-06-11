/**
 * Sube el límite de boletos por usuario a 50 en TODAS las quinielas y
 * pronósticos abiertos (permite varios boletos por persona, cada uno con su
 * propio campeón). Idempotente.
 *
 * Ejecutar: npx tsx scripts/update-max-entries.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const r = await prisma.pool.updateMany({
    where: { status: { in: ["OPEN", "CLOSED"] }, maxEntriesPerUser: { lt: 50 } },
    data: { maxEntriesPerUser: 50 },
  });
  console.log(`Quinielas actualizadas a 50 boletos/persona: ${r.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
