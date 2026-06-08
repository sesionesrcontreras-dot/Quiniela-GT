import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, handleError } from "@/lib/security";
import { AccountType } from "@/lib/enums";

/**
 * GET /api/admin/finance
 * Estado financiero interno consolidado a partir del LEDGER.
 *
 * Devuelve:
 *  - Activos:   dinero real que tenemos (banco, efectivo, Paggo)
 *  - Pasivos:   lo que debemos (saldos de jugadores + pozos en juego)
 *  - Ingresos:  comision de la plataforma (TU GANANCIA)
 *  - Gastos:    comisiones del procesador + promos
 *  - CHEQUEO de cuadre contable (Activos == Pasivos + Patrimonio)
 *
 * El "patrimonio" (equity) = Ingresos - Gastos (utilidad retenida).
 * Si la ecuacion no cuadra, hay un problema: se debe investigar.
 */
export async function GET() {
  try {
    await requireAdmin();

    // Sumar debe/haber por tipo de cuenta de una sola vez.
    const grouped = await prisma.ledgerEntry.groupBy({
      by: ["accountId"],
      _sum: { debitCents: true, creditCents: true },
    });
    const accounts = await prisma.ledgerAccount.findMany({
      select: { id: true, type: true },
    });
    const typeById = new Map(accounts.map((a) => [a.id, a.type]));

    const byType: Record<string, number> = {};
    for (const g of grouped) {
      const t = typeById.get(g.accountId);
      if (!t) continue;
      const net = (g._sum.debitCents ?? 0) - (g._sum.creditCents ?? 0);
      byType[t] = (byType[t] ?? 0) + net;
    }

    // Activos: saldo normal por DEBE (positivo)
    const assets =
      (byType[AccountType.CASH_BANK] ?? 0) +
      (byType[AccountType.BANK_ACCOUNT] ?? 0) +
      (byType[AccountType.PAGGO_GATEWAY] ?? 0);

    // Pasivos: saldo normal por HABER -> invertimos el signo
    const liabilities =
      -((byType[AccountType.USER_WALLET] ?? 0) + (byType[AccountType.POOL_ESCROW] ?? 0));

    // Ingresos (haber): la comision -> tu ganancia bruta
    const revenue = -(byType[AccountType.PLATFORM_REVENUE] ?? 0);

    // Gastos (debe): comisiones de procesador + promos
    const expenses =
      (byType[AccountType.PAYMENT_FEES] ?? 0) + (byType[AccountType.PROMO_BONUS] ?? 0);

    const equity = revenue - expenses; // utilidad retenida
    const balanceCheck = assets - (liabilities + equity); // debe ser 0

    // Desglose util de negocio
    const playerBalances = -(byType[AccountType.USER_WALLET] ?? 0);
    const activePots = -(byType[AccountType.POOL_ESCROW] ?? 0);

    return ok({
      moneda: "GTQ (en centavos)",
      activos: {
        total: assets,
        efectivoAgencias: byType[AccountType.CASH_BANK] ?? 0,
        transferencias: byType[AccountType.BANK_ACCOUNT] ?? 0,
        paggo: byType[AccountType.PAGGO_GATEWAY] ?? 0,
      },
      pasivos: {
        total: liabilities,
        saldosDeJugadores: playerBalances,
        pozosEnJuego: activePots,
      },
      resultados: {
        ingresosComision: revenue, // <-- tu ganancia bruta
        gastosProcesador: expenses,
        utilidadNeta: equity,
      },
      cuadre: {
        formula: "Activos == Pasivos + Patrimonio",
        diferencia: balanceCheck,
        cuadra: balanceCheck === 0,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
