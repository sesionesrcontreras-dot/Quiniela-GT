import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parse, createPaymentSchema } from "@/lib/validation";
import { toCents } from "@/lib/money";
import { ok, handleError, audit, getIp, rateLimit, fail } from "@/lib/security";
import { isPaggoConfigured, paggoCreateLink } from "@/lib/paggo";

/**
 * POST /api/payments  -> crear una solicitud de recarga de saldo (deposito).
 *
 * El flujo segun metodo:
 *  - BANK_TRANSFER / CASH_AGENCY: queda PENDING. Un admin verifica el
 *    comprobante y lo confirma (ahi recien entra el dinero al ledger).
 *  - CARD_PAGGO: se crea un LINK de pago en Paggo y se devuelve `payUrl`.
 *    El cliente paga ahi y luego verifica con POST /api/payments/:id/verify
 *    (la API de Paggo no tiene webhooks; se consulta el estado del link).
 *    Si Paggo no esta configurado (sin API key), cae al flujo manual.
 *
 * Nunca se acredita saldo aqui: solo cuando el dinero esta verificado.
 */
export async function POST(req: Request) {
  try {
    const session = await requireUser();
    if (!rateLimit(`pay:${session.uid}`, 10, 60_000).ok)
      return fail("Demasiadas solicitudes", 429);

    const data = parse(createPaymentSchema, await req.json());
    const amountCents = toCents(data.amountQuetzales);

    // Si es tarjeta y Paggo esta activo, creamos el link ANTES de guardar el
    // pago, para almacenar el id del link como referencia de verificacion.
    let payUrl: string | undefined;
    let reference = data.reference;
    let proofUrl = data.proofUrl;
    if (data.method === "CARD_PAGGO" && isPaggoConfigured()) {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: session.uid } });
      const link = await paggoCreateLink({
        concept: `Recarga QuinielaGT Q${(amountCents / 100).toFixed(2)}`,
        amountQuetzales: amountCents / 100,
        customerName: user.name,
        email: user.email,
      });
      payUrl = link.url;
      reference = link.linkId; // id del link: con esto se verifica el pago
      proofUrl = link.url;
    }

    const payment = await prisma.payment.create({
      data: {
        userId: session.uid,
        method: data.method,
        amountCents,
        reference,
        proofUrl,
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
      CARD_PAGGO: payUrl
        ? "Paga con tarjeta en la ventana de Paggo. Al completar el pago, tu saldo se acredita automaticamente."
        : "Seras redirigido a Paggo para completar el pago con tarjeta.",
    };

    return ok(
      {
        paymentId: payment.id,
        status: payment.status,
        instructions: instructions[data.method],
        payUrl,
      },
      201
    );
  } catch (e) {
    return handleError(e);
  }
}
