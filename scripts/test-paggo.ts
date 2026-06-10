/**
 * Prueba de conexion con la API de Paggo usando la PAGGO_API_KEY del .env:
 *  1. welcome  -> valida credenciales
 *  2. create-link -> crea un link de prueba de Q10
 *  3. consulta el estado del link recien creado
 *  4. cancela el link (para no dejar basura cobrable)
 *
 * Ejecutar con: npx tsx --env-file=.env scripts/test-paggo.ts
 */
const BASE = "https://api.paggoapp.com/api";
const KEY = process.env.PAGGO_API_KEY;

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-API-KEY": KEY!, ...(init?.headers ?? {}) },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => null);
  }
  console.log(`\n=== ${init?.method ?? "GET"} ${path} -> ${res.status}`);
  console.dir(body, { depth: 6 });
  return { status: res.status, body: body as any };
}

async function main() {
  if (!KEY) throw new Error("PAGGO_API_KEY vacia en .env");

  // 1. credenciales
  await call("/center/transactions/welcome", { method: "POST" });

  // 2. link de prueba Q10
  const created = await call("/center/transactions/create-link", {
    method: "POST",
    body: JSON.stringify({
      concept: "Prueba integracion QuinielaGT",
      amount: 10,
      customerName: "Prueba Interna",
      email: "sesiones.rcontreras@icloud.com",
    }),
  });

  // 3. listar links para ver estructura e id
  const list = await call("/center/transactions/links");

  // 4. cancelar el link de prueba (estructura real: result.id / result.link)
  const r = created.body?.result ?? created.body?.resul ?? created.body;
  const linkId = r?.id;
  console.log(`\nlink URL: ${r?.link}\nlink ID detectado: ${linkId}`);

  if (linkId != null) {
    await call(`/center/transactions/links/${linkId}`);
    await call(`/center/transactions/links/${linkId}/cancel`, { method: "POST" });
  }

  // 5. limpieza: cancelar cualquier otro link de prueba de Q10 que quedara
  const items: any[] = list.body?.resul ?? list.body?.result ?? [];
  for (const l of items) {
    if (l.id !== linkId && l.status === "pendiente" && l.monto === "10.00") {
      await call(`/center/transactions/links/${l.id}/cancel`, { method: "POST" });
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
