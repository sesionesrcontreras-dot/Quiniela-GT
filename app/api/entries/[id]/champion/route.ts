import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parse, championSchema } from "@/lib/validation";
import { ok, fail, handleError, audit, getIp } from "@/lib/security";

/**
 * POST /api/entries/:id/champion -> guardar la prediccion general de
 * CAMPEON del torneo para un boleto. Solo antes de que arranque el torneo
 * y solo en quinielas de torneo completo (no en pronosticos de un partido).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser();
    const data = parse(championSchema, await req.json());

    const entry = await prisma.entry.findUnique({
      where: { id: params.id },
      include: { pool: { include: { tournament: true } } },
    });
    if (!entry) return fail("Boleto no encontrado", 404);
    if (entry.userId !== session.uid) return fail("Este boleto no es tuyo", 403);
    if (entry.status !== "ACTIVE") return fail("El boleto no esta activo", 409);
    if (entry.pool.matchId) return fail("Los pronosticos de un partido no llevan campeon", 400);
    if (entry.pool.tournament.startsAt <= new Date()) {
      return fail("El torneo ya arranco: la eleccion de campeon esta cerrada", 409);
    }

    // El equipo debe existir en el calendario del torneo (anti datos basura)
    const teamExists = await prisma.match.findFirst({
      where: {
        tournamentId: entry.pool.tournamentId,
        OR: [{ homeTeam: data.team }, { awayTeam: data.team }],
      },
      select: { id: true },
    });
    if (!teamExists) return fail("Ese equipo no esta en el torneo", 422);

    await prisma.entry.update({
      where: { id: entry.id },
      data: { championPick: data.team },
    });

    await audit({
      actorId: session.uid,
      action: "CHAMPION_PICK",
      entity: "Entry",
      entityId: entry.id,
      metadata: { team: data.team },
      ip: getIp(req),
    });

    return ok({ championPick: data.team });
  } catch (e) {
    return handleError(e);
  }
}
