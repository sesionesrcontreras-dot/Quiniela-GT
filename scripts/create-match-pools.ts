/**
 * Crea un "RETO POR PARTIDO" por cada partido programado que aun no tenga uno:
 * el jugador paga Q50, predice el marcador de ESE partido y el pozo se
 * reparte entre quienes mas puntos hagan en ese partido (empate = se divide).
 *
 * Inscripciones cierran al kickoff (closesAt). IDEMPOTENTE.
 *
 * Ejecutar con: npm run db:retos
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ENTRY_FEE_CENTS = 5000; // Q50 por reto
const RAKE_PERCENT = 17; // cubre 5% del procesador y deja margen neto

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No hay usuario ADMIN.");

  const matches = await prisma.match.findMany({
    where: { status: "SCHEDULED", kickoff: { gt: new Date() } },
    orderBy: { kickoff: "asc" },
  });

  let created = 0;
  for (const m of matches) {
    const existing = await prisma.pool.findFirst({
      where: { matchId: m.id, status: { in: ["OPEN", "CLOSED"] } },
    });
    if (existing) continue;

    await prisma.pool.create({
      data: {
        name: `Reto: ${m.homeTeam} vs ${m.awayTeam}`,
        ownerId: admin.id,
        tournamentId: m.tournamentId,
        matchId: m.id,
        type: "PUBLIC",
        status: "OPEN",
        entryFeeCents: ENTRY_FEE_CENTS,
        rakePercent: RAKE_PERCENT,
        maxEntriesPerUser: 3, // hasta 3 marcadores distintos por jugador
        prizeSplit: JSON.stringify([100]), // el pozo completo al mejor puntaje
        scoringRules: JSON.stringify({ exact: 3, outcome: 1 }),
        closesAt: m.kickoff,
      },
    });
    created++;
    console.log(`+ Reto creado: ${m.homeTeam} vs ${m.awayTeam} (${m.kickoff.toISOString()})`);
  }

  console.log(`Listo. Retos nuevos: ${created} / partidos futuros: ${matches.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
