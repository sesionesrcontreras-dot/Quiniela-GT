import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parse, confirmPaymentSchema } from "@/lib/validation";
import { recordDeposit } from "@/lib/ledger";
import { toCents } from "@/lib/money";
import { ok, fail, handleError, audit, getIp } from "@/lib/security";

/**
 * POST /api/admin/payments/confirm
 * Un ADMIN confirma (o rechaza) un pago manual (transferencia/efectivo).
 *
 * CONTROL CLAVE: solo aqui el dinero entra al ledger (recordDeposit), y queda
 * registrado QUE ADMIN lo confirmo (confirmedById) -> trazabilidad total.
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const data = parse(confirmPaymentSchema, await req.json());

    const payment = await prisma.payment.findUnique({ where: { id: data.paymentId } });
    if (!payment) return fail("Pago no encontrado", 404);
    if (payment.status !== "PENDING") return fail("El pago ya fue procesado", 409);

    if (data.decision === "REJECT") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "REJECTED", confirmedById: admin.uid, confirmedAt: new Date() },
      });
      await audit({
        actorId: admin.uid,
        action: "PAYMENT_REJECT",
        entity: "Payment",
        entityId: payment.id,
        ip: getIp(req),
      });
      return ok({ status: "REJECTED" });
    }

    // CONFIRM: acreditar saldo en el ledger de forma atomica.
    const feeCents = data.feeQuetzales ? toCents(data.feeQuetzales) : 0;
    await prisma.$transaction(async (tx) => {
      await recordDeposit(tx, {
        userId: payment.userId,
        method: payment.method,
        amountCents: payment.amountCents,
        feeCents,
        reference: payment.id,
        createdById: admin.uid,
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "CONFIRMED", confirmedById: admin.uid, confirmedAt: new Date() },
      });
    });

    await audit({
      actorId: admin.uid,
      action: "PAYMENT_CONFIRM",
      entity: "Payment",
      entityId: payment.id,
      metadata: { amountCents: payment.amountCents, feeCents },
      ip: getIp(req),
    });

    return ok({ status: "CONFIRMED" });
  } catch (e) {
    return handleError(e);
  }
}
