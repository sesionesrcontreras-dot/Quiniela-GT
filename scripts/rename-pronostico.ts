/**
 * Migracion de datos en produccion:
 *  1. Renombra los pools "Reto: ..." a "Pronóstico: ..."
 *  2. Agrega el bono de campeon (champion: 10) a las reglas de puntaje de
 *     las quinielas de torneo completo que no lo tengan.
 * IDEMPOTENTE. Ejecutar: npx tsx scripts/rename-pronostico.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const retos = await prisma.pool.findMany({ where: { name: { startsWith: "Reto: " } } });
  for (const p of retos) {
    await prisma.pool.update({
      where: { id: p.id },
      data: { name: p.name.replace(/^Reto: /, "Pronóstico: ") },
    });
  }
  console.log(`Renombrados: ${retos.length}`);

  const torneo = await prisma.pool.findMany({ where: { matchId: null, type: "PUBLIC" } });
  let updated = 0;
  for (const p of torneo) {
    const rules = JSON.parse(p.scoringRules);
    if (rules.champion == null) {
      rules.champion = 10;
      await prisma.pool.update({
        where: { id: p.id },
        data: { scoringRules: JSON.stringify(rules) },
      });
      updated++;
    }
  }
  console.log(`Reglas con bono de campeon agregado: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
