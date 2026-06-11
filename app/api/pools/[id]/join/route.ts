import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { chargeEntryFee, getUserWallet, getBalance } from "@/lib/ledger";
import { ok, fail, handleError, audit, getIp } from "@/lib/security";

// POST /api/pools/:id/join  -> inscribir un boleto en la quiniela
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser();
    const poolId = params.id;
    const body = await req.json().catch(() => ({}));

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });
    if (!pool) return fail("Quiniela no encontrada", 404);
    if (pool.status !== "OPEN") return fail("La quiniela no admite inscripciones", 409);
    if (pool.closesAt && pool.closesAt <= new Date()) {
      return fail("Las inscripciones ya cerraron (el partido esta por iniciar)", 409);
    }

    // Codigo de invitacion para privadas/corporativas.
    if (pool.type !== "PUBLIC" && pool.inviteCode !== body.inviteCode) {
      return fail("Codigo de invitacion invalido", 403);
    }

    // Limite de boletos por usuario.
    const myEntries = await prisma.entry.count({
      where: { poolId, userId: session.uid, status: { not: "REFUNDED" } },
    });
    if (myEntries >= pool.maxEntriesPerUser) {
      return fail("Alcanzaste el maximo de boletos para esta quiniela", 409);
    }

    // Chequeo amistoso de saldo ANTES de cobrar (evita un 500 genérico y
    // permite mostrar "saldo insuficiente" con enlace a recargar).
    if (pool.entryFeeCents > 0) {
      const wallet = await getUserWallet(prisma, session.uid);
      const available = -(await getBalance(prisma, wallet.id));
      if (available < pool.entryFeeCents) {
        return fail("Saldo insuficiente. Recarga en tu billetera para comprar este boleto.", 409);
      }
    }

    // Crea el boleto y, si tiene costo, cobra de la billetera (atomico).
    const entry = await prisma.$transaction(async (tx) => {
      const e = await tx.entry.create({
        data: {
          poolId,
          userId: session.uid,
          status: pool.entryFeeCents > 0 ? "PENDING_PAYMENT" : "ACTIVE",
        },
      });

      if (pool.entryFeeCents > 0) {
        // Mueve dinero: billetera -> pozo (neto) + ingreso plataforma (rake)
        await chargeEntryFee(tx, {
          userId: session.uid,
          poolId,
          grossCents: pool.entryFeeCents,
          rakePercent: pool.rakePercent,
          reference: e.id,
          createdById: session.uid,
        });
        await tx.entry.update({ where: { id: e.id }, data: { status: "ACTIVE" } });
      }
      return e;
    });

    await audit({
      actorId: session.uid,
      action: "POOL_JOIN",
      entity: "Entry",
      entityId: entry.id,
      metadata: { poolId },
      ip: getIp(req),
    });

    return ok({ entryId: entry.id }, 201);
  } catch (e) {
    return handleError(e);
  }
}
