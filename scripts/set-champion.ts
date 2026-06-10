/**
 * Registra el CAMPEON del torneo (al final del Mundial). Despues de esto,
 * liquida las quinielas desde el panel admin: el bono de campeon se suma
 * automaticamente al recalcular puntos.
 *
 * Ejecutar: npx tsx scripts/set-champion.ts "Argentina"
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const team = process.argv[2];
  if (!team) throw new Error('Uso: npx tsx scripts/set-champion.ts "NombreDelEquipo"');

  const tournament = await prisma.tournament.findFirst({ where: { isActive: true } });
  if (!tournament) throw new Error("No hay torneo activo");

  const exists = await prisma.match.findFirst({
    where: { tournamentId: tournament.id, OR: [{ homeTeam: team }, { awayTeam: team }] },
  });
  if (!exists) throw new Error(`"${team}" no aparece en el calendario del torneo`);

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { championTeam: team },
  });
  console.log(`Campeon registrado: ${team}. Ahora liquida las quinielas desde /admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
