import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parse, withdrawalSchema } from "@/lib/validation";
import { toCents } from "@/lib/money";
import { getUserWallet, getBalance } from "@/lib/ledger";
import { ok, fail, handleError, audit, getIp, rateLimit } from "@/lib/security";

/**
 * POST /api/withdrawals -> el jugador solicita retirar saldo (premios) a su
 * cuenta bancaria. Queda PENDING; el dinero NO se mueve hasta que el admin
 * hace la transferencia real y confirma (ahi se asienta en el ledger).
 */
export async function POST(req: Request) {
  try {
    const session = await requireUser();
    if (!rateLimit(`wd:${session.uid}`, 5, 60_000).ok)
      return fail("Demasiadas solicitudes", 429);

    const data = parse(withdrawalSchema, await req.json());
    const amountCents = toCents(data.amountQuetzales);

    // saldo disponible (informativo: se revalida al confirmar)
    const wallet = await getUserWallet(prisma, session.uid);
    const available = -(await getBalance(prisma, wallet.id));
    if (available < amountCents) {
      return fail("Saldo insuficiente para ese retiro", 409);
    }

    // monto pendiente en otros retiros sin procesar (no permitir doble gasto)
    const pending = await prisma.payment.aggregate({
      where: { userId: session.uid, method: "WITHDRAWAL", status: "PENDING" },
      _sum: { amountCents: true },
    });
    if (available - (pending._sum.amountCents ?? 0) < amountCents) {
      return fail("Tienes retiros pendientes que comprometen ese saldo", 409);
    }

    const wd = await prisma.payment.create({
      data: {
        userId: session.uid,
        method: "WITHDRAWAL",
        amountCents,
        reference: data.bankInfo,
        status: "PENDING",
      },
    });

    await audit({
      actorId: session.uid,
      action: "WITHDRAWAL_REQUEST",
      entity: "Payment",
      entityId: wd.id,
      metadata: { amountCents },
      ip: getIp(req),
    });

    return ok(
      {
        withdrawalId: wd.id,
        status: wd.status,
        instructions:
          "Solicitud recibida. Te transferimos a tu cuenta en horario bancario y veras el estado aqui.",
      },
      201
    );
  } catch (e) {
    return handleError(e);
  }
}
