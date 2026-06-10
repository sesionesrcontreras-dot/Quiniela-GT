/**
 * Cliente de la API de Paggo (procesador de pagos con tarjeta, Guatemala).
 * Docs: https://www.paggo.com/gt/paggo-api
 *
 * Flujo: la API NO tiene webhooks. Se crea un LINK de pago (vigencia 3 dias),
 * el cliente paga en la pagina de Paggo, y nosotros CONSULTAMOS el estado del
 * link (pendiente | pagado | cancelado) para acreditar el saldo.
 *
 * Autenticacion: header X-API-KEY (se genera en la seccion de credenciales
 * de la cuenta Paggo). Si PAGGO_API_KEY esta vacio, la integracion queda
 * desactivada y el pago con tarjeta cae al flujo manual (admin confirma).
 */

const BASE_URL = "https://api.paggoapp.com/api";

export function isPaggoConfigured(): boolean {
  return !!process.env.PAGGO_API_KEY;
}

/** % que Paggo retiene por transaccion (se registra como gasto en el ledger). */
export function paggoFeePercent(): number {
  const n = Number(process.env.PAGGO_FEE_PERCENT ?? "5");
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 5;
}

async function paggoFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": process.env.PAGGO_API_KEY!,
      ...(init?.headers ?? {}),
    },
    // los estados de pago no se deben cachear
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Paggo ${path} -> ${res.status}: ${body?.error ?? JSON.stringify(body)}`);
  }
  return body;
}

export interface PaggoLink {
  linkId: string;
  url: string;
  expiresAt?: string;
}

/**
 * Crea un link de pago. `amountQuetzales` en quetzales (ej 100.00).
 * Devuelve el id del link (para consultar su estado) y la URL de pago.
 */
export async function paggoCreateLink(params: {
  concept: string;
  amountQuetzales: number;
  customerName: string;
  email: string;
}): Promise<PaggoLink> {
  const body = await paggoFetch("/center/transactions/create-link", {
    method: "POST",
    body: JSON.stringify({
      concept: params.concept,
      amount: params.amountQuetzales,
      customerName: params.customerName,
      email: params.email,
    }),
  });

  // Estructura real (verificada 2026-06-09):
  // { transactionId, message, result: { id, link, expirationDate } }
  const r = body.result ?? body.resul ?? body;
  const url: string | undefined = r?.link;
  const linkId = r?.id;

  if (!url || linkId == null) {
    throw new Error("Paggo: respuesta de create-link sin url/id reconocibles");
  }
  return { linkId: String(linkId), url, expiresAt: r.expirationDate };
}

export type PaggoStatus = "PENDING" | "PAID" | "CANCELLED" | "UNKNOWN";

/** Consulta el estado de un link de pago. */
export async function paggoGetLinkStatus(linkId: string): Promise<PaggoStatus> {
  const body = await paggoFetch(`/center/transactions/links/${linkId}`, { method: "GET" });
  // La API envuelve la respuesta en "result" (a veces "resul"); el item puede
  // venir como objeto o como arreglo de un elemento.
  let r = body.result ?? body.resul ?? body;
  if (Array.isArray(r)) r = r[0] ?? {};
  const raw = String(r?.status ?? r?.estado ?? "").toLowerCase();
  if (raw.includes("paga")) return "PAID"; // "pagado"
  if (raw.includes("pend")) return "PENDING"; // "pendiente"
  if (raw.includes("cancel")) return "CANCELLED"; // "cancelado"
  return "UNKNOWN";
}
