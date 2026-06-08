import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parse, setResultSchema } from "@/lib/validation";
import { recalcPoolPoints } from "@/lib/settlement";
import { ok, fail, handleError, audit, getIp } from "@/lib/security";

/**
 * POST /api/admin/matches/:id/result
 * ADMIN carga el resultado final de un partido. Marca FINISHED y recalcula
 * los puntos de todas las quinielas del torneo (solo recalculo; el reparto
 * del pozo es una accion aparte y explicita: /api/admin/pools/:id/settle).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const data = parse(setResultSchema, await req.json());

    const match = await prisma.match.findUnique({ where: { id: params.id } });
    if (!match) return fail("Partido no encontrado", 404);
    if (match.status === "FINISHED")
      return fail("El partido ya tiene resultado (usa correccion)", 409);

    await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        status: "FINISHED",
      },
    });

    // Recalcular puntos de las quinielas afectadas.
    const pools = await prisma.pool.findMany({
      where: { tournamentId: match.tournamentId, status: { in: ["OPEN", "CLOSED"] } },
      select: { id: true },
    });
    for (const p of pools) await recalcPoolPoints(p.id);

    await audit({
      actorId: admin.uid,
      action: "RESULT_SET",
      entity: "Match",
      entityId: match.id,
      metadata: { home: data.homeScore, away: data.awayScore },
      ip: getIp(req),
    });

    return ok({ matchId: match.id, recalculatedPools: pools.length });
  } catch (e) {
    return handleError(e);
  }
}
