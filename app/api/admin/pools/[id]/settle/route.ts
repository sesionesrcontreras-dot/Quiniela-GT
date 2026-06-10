import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settlePool } from "@/lib/settlement";
import { ok, fail, handleError, audit, getIp } from "@/lib/security";

/**
 * POST /api/admin/pools/:id/settle
 * ADMIN liquida la quiniela: reparte el pozo a los ganadores via ledger
 * y genera los Payout. Idempotente.
 *
 * CANDADO: no se puede liquidar si quedan partidos sin resultado final,
 * para no repartir el pozo antes de tiempo (error costoso e irreversible).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();

    const pool = await prisma.pool.findUnique({ where: { id: params.id } });
    if (!pool) return fail("Quiniela no encontrada", 404);
    if (pool.status === "CANCELLED") return fail("La quiniela está cancelada", 409);

    // Partidos que cuentan para esta quiniela: el suyo (pronóstico) o todos
    // los del torneo (quiniela completa). Deben estar TODOS finalizados.
    const pendientes = await prisma.match.count({
      where: pool.matchId
        ? { id: pool.matchId, status: { not: "FINISHED" } }
        : { tournamentId: pool.tournamentId, status: { not: "FINISHED" } },
    });
    if (pendientes > 0) {
      return fail(
        `No se puede liquidar: faltan ${pendientes} partido(s) por finalizar. Carga todos los resultados primero.`,
        409
      );
    }

    const result = await settlePool(params.id, admin.uid);

    await audit({
      actorId: admin.uid,
      action: "POOL_SETTLE",
      entity: "Pool",
      entityId: params.id,
      metadata: result as Record<string, unknown>,
      ip: getIp(req),
    });

    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
