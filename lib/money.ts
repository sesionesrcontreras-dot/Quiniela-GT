/**
 * Utilidades de dinero.
 *
 * REGLA DE ORO: en todo el sistema el dinero se maneja como CENTAVOS (enteros).
 * Nunca usamos `number` con decimales para calcular dinero (evita errores de
 * redondeo tipo 0.1 + 0.2 !== 0.3).
 */

/** Convierte quetzales (ej "50.00" o 50) a centavos enteros. */
export function toCents(quetzales: number | string): number {
  const n = typeof quetzales === "string" ? parseFloat(quetzales) : quetzales;
  if (!Number.isFinite(n)) throw new Error("Monto invalido");
  return Math.round(n * 100);
}

/** Convierte centavos a un numero en quetzales (solo para mostrar). */
export function toQuetzales(cents: number): number {
  return cents / 100;
}

/** Formatea centavos como "Q 1,234.50". */
export function formatGTQ(cents: number): string {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Reparte un total en centavos segun una lista de porcentajes,
 * garantizando que la suma de las partes == total (sin centavos perdidos).
 * El "residuo" por redondeo se asigna al primer puesto.
 *
 * Ej: splitByPercent(10000, [60,30,10]) => [6000, 3000, 1000]
 */
export function splitByPercent(totalCents: number, percents: number[]): number[] {
  const sumPct = percents.reduce((a, b) => a + b, 0);
  if (sumPct !== 100) throw new Error("Los porcentajes deben sumar 100");

  const parts = percents.map((p) => Math.floor((totalCents * p) / 100));
  const assigned = parts.reduce((a, b) => a + b, 0);
  const remainder = totalCents - assigned;
  if (parts.length > 0) parts[0] += remainder; // el residuo va al 1er lugar
  return parts;
}

/** Calcula la comision (rake) y el monto neto al pozo. Todo en centavos. */
export function applyRake(grossCents: number, rakePercent: number): {
  rakeCents: number;
  netCents: number;
} {
  if (rakePercent < 0 || rakePercent > 100) throw new Error("Rake invalido");
  const rakeCents = Math.floor((grossCents * rakePercent) / 100);
  return { rakeCents, netCents: grossCents - rakeCents };
}
