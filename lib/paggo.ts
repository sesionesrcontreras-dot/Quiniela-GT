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

  // La API devuelve la URL del link; el id puede venir con distintos nombres
  // segun version. Si no viene, lo buscamos en el listado por URL.
  const url: string | undefined = body.link ?? body.url ?? body.paymentLink ?? body.data?.link;
  let linkId: string | undefined =
    body.linkId ?? body.id ?? body.data?.linkId ?? body.data?.id;

  if (!linkId && url) {
    const list = await paggoFetch("/center/transactions/links", { method: "GET" });
    const items: any[] = Array.isArray(list) ? list : list.links ?? list.data ?? [];
    const found = items.find((l) => (l.link ?? l.url) === url);
    if (found) linkId = found.id ?? found.linkId;
  }

  if (!url || linkId == null) {
    throw new Error("Paggo: respuesta de create-link sin url/id reconocibles");
  }
  return { linkId: String(linkId), url, expiresAt: body.expiration ?? body.expiresAt };
}

export type PaggoStatus = "PENDING" | "PAID" | "CANCELLED" | "UNKNOWN";

/** Consulta el estado de un link de pago. */
export async function paggoGetLinkStatus(linkId: string): Promise<PaggoStatus> {
  const body = await paggoFetch(`/center/transactions/links/${linkId}`, { method: "GET" });
  const raw = String(body.status ?? body.estado ?? body.data?.status ?? "").toLowerCase();
  if (raw.includes("paga")) return "PAID"; // "pagado"
  if (raw.includes("pend")) return "PENDING"; // "pendiente"
  if (raw.includes("cancel")) return "CANCELLED"; // "cancelado"
  return "UNKNOWN";
}
