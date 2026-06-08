import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parse, createPaymentSchema } from "@/lib/validation";
import { toCents } from "@/lib/money";
import { ok, handleError, audit, getIp, rateLimit, fail } from "@/lib/security";

/**
 * POST /api/payments  -> crear una solicitud de recarga de saldo (deposito).
 *
 * El flujo segun metodo:
 *  - BANK_TRANSFER / CASH_AGENCY: queda PENDING. Un admin verifica el
 *    comprobante y lo confirma (ahi recien entra el dinero al ledger).
 *  - CARD_PAGGO: aqui se iniciaria el cobro con Paggo; al recibir el
 *    webhook firmado de Paggo se confirma automaticamente.
 *
 * Nunca se acredita saldo aqui: solo cuando el dinero esta verificado.
 */
export async function POST(req: Request) {
  try {
    const session = await requireUser();
    if (!rateLimit(`pay:${session.uid}`, 10, 60_000).ok)
      return fail("Demasiadas solicitudes", 429);

    const data = parse(createPaymentSchema, await req.json());

    const payment = await prisma.payment.create({
      data: {
        userId: session.uid,
        method: data.method,
        amountCents: toCents(data.amountQuetzales),
        reference: data.reference,
        proofUrl: data.proofUrl,
        status: "PENDING",
      },
    });

    await audit({
      actorId: session.uid,
      action: "PAYMENT_CREATE",
      entity: "Payment",
      entityId: payment.id,
      metadata: { method: data.method, amountCents: payment.amountCents },
      ip: getIp(req),
    });

    // Instrucciones segun metodo (lo que se muestra al usuario).
    const instructions: Record<string, string> = {
      BANK_TRANSFER:
        "Transfiere a la cuenta indicada y sube tu comprobante. Acreditamos al verificar.",
      CASH_AGENCY:
        "Paga en agencia con el codigo de tu solicitud. Acreditamos al confirmar el banco.",
      CARD_PAGGO: "Seras redirigido a Paggo para completar el pago con tarjeta.",
    };

    return ok({ paymentId: payment.id, status: payment.status, instructions: instructions[data.method] }, 201);
  } catch (e) {
    return handleError(e);
  }
}
