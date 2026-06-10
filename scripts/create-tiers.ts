/**
 * Crea los 4 niveles de entrada de la quiniela publica del Mundial:
 * Q50, Q100, Q150 y Q200. Es IDEMPOTENTE: si ya existe una quiniela
 * publica de paga abierta con esa cuota, no crea otra (seguro de
 * correr contra produccion las veces que sea).
 *
 * Ejecutar con: npm run db:tiers
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// [cuota en centavos, nombre]
const TIERS: [number, string][] = [
  [5000, "Quiniela Mundial 2026 — Entrada Q50"],
  [10000, "Quiniela Mundial 2026 — Entrada Q100"],
  [15000, "Quiniela Mundial 2026 — Entrada Q150"],
  [20000, "Quiniela Mundial 2026 — Entrada Q200"],
];

async function main() {
  const tournament = await prisma.tournament.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!tournament) throw new Error("No hay torneo activo. Corre el seed primero.");

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No hay usuario ADMIN.");

  for (const [feeCents, name] of TIERS) {
    const existing = await prisma.pool.findFirst({
      where: {
        tournamentId: tournament.id,
        type: "PUBLIC",
        entryFeeCents: feeCents,
        status: { in: ["OPEN", "CLOSED"] },
      },
    });
    if (existing) {
      if (existing.name !== name) {
        await prisma.pool.update({ where: { id: existing.id }, data: { name } });
        console.log(`~ Renombrado nivel Q${feeCents / 100}: "${existing.name}" -> "${name}"`);
      } else {
        console.log(`✓ Ya existe nivel Q${feeCents / 100}: "${existing.name}" (${existing.id})`);
      }
      continue;
    }
    const pool = await prisma.pool.create({
      data: {
        name,
        ownerId: admin.id,
        tournamentId: tournament.id,
        type: "PUBLIC",
        status: "OPEN",
        entryFeeCents: feeCents,
        rakePercent: 12,
        maxEntriesPerUser: 3,
        prizeSplit: JSON.stringify([60, 30, 10]),
        scoringRules: JSON.stringify({ exact: 3, outcome: 1 }),
      },
    });
    console.log(`+ Creado nivel Q${feeCents / 100}: "${pool.name}" (${pool.id})`);
  }

  console.log("Niveles listos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
