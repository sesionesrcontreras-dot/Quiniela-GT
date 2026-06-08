import { requireAdmin } from "@/lib/auth";
import { settlePool } from "@/lib/settlement";
import { ok, handleError, audit, getIp } from "@/lib/security";

/**
 * POST /api/admin/pools/:id/settle
 * ADMIN liquida la quiniela: reparte el pozo a los ganadores via ledger
 * y genera los Payout. Idempotente.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
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
