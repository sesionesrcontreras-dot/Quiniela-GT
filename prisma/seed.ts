/**
 * Datos de prueba con PARTIDOS REALES del Mundial 2026.
 * Ejecutar con: npm run db:seed
 *
 * Fixture: primera ronda de la fase de grupos (11-18 junio 2026), los 12 grupos.
 * Fuentes: FIFA / Sky Sports (calendario oficial 2026). Las HORAS son
 * aproximadas (UTC) y el admin puede ajustarlas desde el panel.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// [local, visitante, grupo, kickoff UTC, sede]
const FIXTURES: [string, string, string, string, string][] = [
  ["México", "Sudáfrica", "Grupo A", "2026-06-11T19:00:00Z", "Ciudad de México (Estadio Azteca)"],
  ["Corea del Sur", "Chequia", "Grupo A", "2026-06-12T19:00:00Z", "Zapopan"],
  ["Canadá", "Bosnia y Herzegovina", "Grupo B", "2026-06-12T22:00:00Z", "Toronto"],
  ["Estados Unidos", "Paraguay", "Grupo D", "2026-06-13T19:00:00Z", "Los Ángeles"],
  ["Catar", "Suiza", "Grupo B", "2026-06-13T22:00:00Z", "Santa Clara"],
  ["Brasil", "Marruecos", "Grupo C", "2026-06-13T23:30:00Z", "Nueva Jersey"],
  ["Haití", "Escocia", "Grupo C", "2026-06-14T18:00:00Z", "Foxborough"],
  ["Australia", "Turquía", "Grupo D", "2026-06-14T20:00:00Z", "Vancouver"],
  ["Alemania", "Curazao", "Grupo E", "2026-06-14T22:00:00Z", "Houston"],
  ["Países Bajos", "Japón", "Grupo F", "2026-06-15T00:00:00Z", "Arlington"],
  ["Costa de Marfil", "Ecuador", "Grupo E", "2026-06-15T18:00:00Z", "Filadelfia"],
  ["Suecia", "Túnez", "Grupo F", "2026-06-15T19:30:00Z", "Guadalupe"],
  ["España", "Cabo Verde", "Grupo H", "2026-06-15T21:00:00Z", "Atlanta"],
  ["Bélgica", "Egipto", "Grupo G", "2026-06-15T22:30:00Z", "Seattle"],
  ["Arabia Saudita", "Uruguay", "Grupo H", "2026-06-16T00:00:00Z", "Miami"],
  ["Irán", "Nueva Zelanda", "Grupo G", "2026-06-16T19:00:00Z", "Los Ángeles"],
  ["Francia", "Senegal", "Grupo I", "2026-06-16T22:00:00Z", "Nueva Jersey"],
  ["Irak", "Noruega", "Grupo I", "2026-06-16T23:30:00Z", "Foxborough"],
  ["Argentina", "Argelia", "Grupo J", "2026-06-17T19:00:00Z", "Kansas City"],
  ["Austria", "Jordania", "Grupo J", "2026-06-17T20:30:00Z", "Santa Clara"],
  ["Portugal", "Congo RD", "Grupo K", "2026-06-17T22:00:00Z", "Houston"],
  ["Inglaterra", "Croacia", "Grupo L", "2026-06-17T23:30:00Z", "Arlington"],
  ["Ghana", "Panamá", "Grupo L", "2026-06-18T19:00:00Z", "Toronto"],
  ["Uzbekistán", "Colombia", "Grupo K", "2026-06-18T20:30:00Z", "Ciudad de México"],
  ["Chequia", "Sudáfrica", "Grupo A", "2026-06-18T21:30:00Z", "Atlanta"],
  ["Suiza", "Bosnia y Herzegovina", "Grupo B", "2026-06-18T22:30:00Z", "Los Ángeles"],
  ["Canadá", "Catar", "Grupo B", "2026-06-19T00:00:00Z", "Vancouver"],
];

async function main() {
  console.log("Sembrando datos (partidos reales Mundial 2026)...");

  const pass = await bcrypt.hash("Password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@quiniela.gt" },
    update: {},
    create: { email: "admin@quiniela.gt", name: "Administrador", passwordHash: pass, role: "ADMIN", kycStatus: "VERIFIED" },
  });
  await prisma.user.upsert({
    where: { email: "ana@demo.gt" },
    update: {},
    create: { email: "ana@demo.gt", name: "Ana López", passwordHash: pass },
  });
  await prisma.user.upsert({
    where: { email: "luis@demo.gt" },
    update: {},
    create: { email: "luis@demo.gt", name: "Luis García", passwordHash: pass },
  });

  const tournament = await prisma.tournament.create({
    data: {
      name: "Mundial 2026",
      startsAt: new Date("2026-06-11T00:00:00Z"),
      endsAt: new Date("2026-07-19T23:59:59Z"),
      matches: {
        create: FIXTURES.map(([home, away, stage, kickoff, venue]) => ({
          homeTeam: home,
          awayTeam: away,
          stage: `Fase de grupos · ${stage} · ${venue}`,
          kickoff: new Date(kickoff),
        })),
      },
    },
    include: { matches: true },
  });

  // Quiniela GRATIS (captacion de usuarios)
  await prisma.pool.create({
    data: {
      name: "Quiniela Mundial 2026 — Gratis",
      ownerId: admin.id,
      tournamentId: tournament.id,
      type: "PUBLIC",
      status: "OPEN",
      entryFeeCents: 0,
      rakePercent: 0,
      maxEntriesPerUser: 1,
      prizeSplit: JSON.stringify([100]),
      scoringRules: JSON.stringify({ exact: 3, outcome: 1 }),
    },
  });

  // Quiniela de PAGA (el motor de ingresos)
  await prisma.pool.create({
    data: {
      name: "Quiniela Mundial 2026 — Pozo Q50",
      ownerId: admin.id,
      tournamentId: tournament.id,
      type: "PUBLIC",
      status: "OPEN",
      entryFeeCents: 5000,
      rakePercent: 12,
      maxEntriesPerUser: 3,
      prizeSplit: JSON.stringify([60, 30, 10]),
      scoringRules: JSON.stringify({ exact: 3, outcome: 1 }),
    },
  });

  // Quiniela PRIVADA (grupo de amigos, por codigo de invitacion)
  await prisma.pool.create({
    data: {
      name: "Quiniela entre amigos",
      ownerId: admin.id,
      tournamentId: tournament.id,
      type: "PRIVATE",
      status: "OPEN",
      entryFeeCents: 2500,
      rakePercent: 10,
      maxEntriesPerUser: 1,
      prizeSplit: JSON.stringify([70, 30]),
      scoringRules: JSON.stringify({ exact: 3, outcome: 1, goalDiff: 1 }),
      inviteCode: "AMIGOS2026",
    },
  });

  console.log("Listo.");
  console.log(`  Partidos reales cargados: ${tournament.matches.length}`);
  console.log("  Admin:    admin@quiniela.gt / Password123");
  console.log("  Jugador:  ana@demo.gt       / Password123");
  console.log("  Jugador:  luis@demo.gt      / Password123");
  console.log("  Quinielas: Gratis | Pozo Q50 | Privada amigos (código AMIGOS2026)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
