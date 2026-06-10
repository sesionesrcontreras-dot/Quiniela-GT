import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { recordDeposit } from "@/lib/ledger";
import { ok, fail, handleError, audit, getIp, rateLimit } from "@/lib/security";
import { isPaggoConfigured, paggoGetLinkStatus, paggoFeePercent } from "@/lib/paggo";

/**
 * POST /api/payments/:id/verify
 * Verifica contra la API de Paggo si un pago con tarjeta ya fue pagado y,
 * de ser asi, acredita el saldo en el ledger (registrando la comision del
 * procesador como gasto). Idempotente: si ya esta CONFIRMED, no duplica.
 *
 * Lo puede llamar el dueño del pago (boton "Ya pagué") o un admin.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser();
    if (!rateLimit(`payverify:${session.uid}`, 10, 60_000).ok)
      return fail("Demasiadas verificaciones, espera un momento", 429);

    if (!isPaggoConfigured()) return fail("Pagos con tarjeta no disponibles", 503);

    const payment = await prisma.payment.findUnique({ where: { id: params.id } });
    if (!payment) return fail("Pago no encontrado", 404);
    if (payment.userId !== session.uid && session.role !== "ADMIN") {
      return fail("Este pago no es tuyo", 403);
    }
    if (payment.method !== "CARD_PAGGO") return fail("Este pago no es con tarjeta", 400);
    if (payment.status === "CONFIRMED") return ok({ status: "CONFIRMED" });
    if (payment.status !== "PENDING") return fail("El pago ya fue procesado", 409);
    if (!payment.reference) return fail("Pago sin link de Paggo asociado", 409);

    const status = await paggoGetLinkStatus(payment.reference);

    if (status === "CANCELLED") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "REJECTED", confirmedAt: new Date() },
      });
      return ok({ status: "REJECTED" });
    }
    if (status !== "PAID") {
      return ok({ status: "PENDING", detail: "Paggo aun no reporta el pago" });
    }

    // PAGADO: acreditar de forma atomica. Doble chequeo del estado dentro de
    // la transaccion para que dos verificaciones simultaneas no dupliquen.
    const feeCents = Math.floor((payment.amountCents * paggoFeePercent()) / 100);
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      if (fresh.status !== "PENDING") return;
      await recordDeposit(tx, {
        userId: payment.userId,
        method: payment.method,
        amountCents: payment.amountCents,
        feeCents,
        reference: payment.id,
        createdById: session.uid,
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
    });

    await audit({
      actorId: session.uid,
      action: "PAYMENT_CONFIRM_PAGGO",
      entity: "Payment",
      entityId: payment.id,
      metadata: { amountCents: payment.amountCents, feeCents, linkId: payment.reference },
      ip: getIp(req),
    });

    return ok({ status: "CONFIRMED" });
  } catch (e) {
    return handleError(e);
  }
}
