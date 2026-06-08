/**
 * Prueba de extremo a extremo del flujo de dinero + contabilidad.
 * Ejecutar:  npx tsx scripts/demo.ts
 *
 * Demuestra que el LEDGER de partida doble cuadra SIEMPRE (diferencia = 0).
 */
import { prisma } from "../lib/prisma";
import { recordDeposit, chargeEntryFee, getBalance, getUserWallet, getSystemAccount } from "../lib/ledger";
import { settlePool, getStandings } from "../lib/settlement";
import { formatGTQ } from "../lib/money";
import { AccountType } from "../lib/enums";

async function financeSnapshot() {
  const grouped = await prisma.ledgerEntry.groupBy({
    by: ["accountId"],
    _sum: { debitCents: true, creditCents: true },
  });
  const accounts = await prisma.ledgerAccount.findMany({ select: { id: true, type: true } });
  const typeById = new Map(accounts.map((a) => [a.id, a.type]));
  const byType: Record<string, number> = {};
  for (const g of grouped) {
    const t = typeById.get(g.accountId)!;
    byType[t] = (byType[t] ?? 0) + (g._sum.debitCents ?? 0) - (g._sum.creditCents ?? 0);
  }
  const assets =
    (byType[AccountType.CASH_BANK] ?? 0) + (byType[AccountType.BANK_ACCOUNT] ?? 0) + (byType[AccountType.PAGGO_GATEWAY] ?? 0);
  const liabilities = -((byType[AccountType.USER_WALLET] ?? 0) + (byType[AccountType.POOL_ESCROW] ?? 0));
  const revenue = -(byType[AccountType.PLATFORM_REVENUE] ?? 0);
  const expenses = (byType[AccountType.PAYMENT_FEES] ?? 0) + (byType[AccountType.PROMO_BONUS] ?? 0);
  const equity = revenue - expenses;
  const diff = assets - (liabilities + equity);
  return { assets, liabilities, revenue, expenses, equity, diff };
}

function print(label: string, s: Awaited<ReturnType<typeof financeSnapshot>>) {
  console.log(`\n── ${label} ──`);
  console.log(`  Activos (dinero real):   ${formatGTQ(s.assets)}`);
  console.log(`  Pasivos (lo que debemos):${formatGTQ(s.liabilities)}`);
  console.log(`  Ingreso comision (rake): ${formatGTQ(s.revenue)}   <-- ganancia`);
  console.log(`  Gastos:                  ${formatGTQ(s.expenses)}`);
  console.log(`  CUADRE (debe ser Q0.00): ${formatGTQ(s.diff)}  ${s.diff === 0 ? "OK ✓" : "ERROR ✗"}`);
}

async function main() {
  const pool = await prisma.pool.findFirstOrThrow({ where: { type: "PUBLIC" } });
  const ana = await prisma.user.findUniqueOrThrow({ where: { email: "ana@demo.gt" } });
  const luis = await prisma.user.findUniqueOrThrow({ where: { email: "luis@demo.gt" } });
  const matches = await prisma.match.findMany({ where: { tournamentId: pool.tournamentId }, orderBy: { kickoff: "asc" } });

  console.log("════ FLUJO DEMO: 2 jugadores, cuota Q50, rake 12% ════");

  // 1) Depositos (pago confirmado) Q100 c/u por transferencia
  await prisma.$transaction(async (tx) => {
    await recordDeposit(tx, { userId: ana.id, method: "BANK_TRANSFER", amountCents: 10000 });
    await recordDeposit(tx, { userId: luis.id, method: "BANK_TRANSFER", amountCents: 10000 });
  });
  print("Tras depositos (Q100 + Q100)", await financeSnapshot());

  // 2) Ambos se inscriben (boleto Q50). Cobro: billetera -> pozo + rake
  const entryAna = await prisma.entry.create({ data: { poolId: pool.id, userId: ana.id, status: "ACTIVE" } });
  const entryLuis = await prisma.entry.create({ data: { poolId: pool.id, userId: luis.id, status: "ACTIVE" } });
  await prisma.$transaction(async (tx) => {
    await chargeEntryFee(tx, { userId: ana.id, poolId: pool.id, grossCents: 5000, rakePercent: 12, reference: entryAna.id });
    await chargeEntryFee(tx, { userId: luis.id, poolId: pool.id, grossCents: 5000, rakePercent: 12, reference: entryLuis.id });
  });
  print("Tras inscripciones (2 x Q50)", await financeSnapshot());

  // 3) Predicciones: Ana acierta exacto el partido 1; Luis solo el resultado
  await prisma.prediction.create({ data: { entryId: entryAna.id, matchId: matches[0].id, predHome: 2, predAway: 1 } });
  await prisma.prediction.create({ data: { entryId: entryLuis.id, matchId: matches[0].id, predHome: 3, predAway: 0 } });

  // 4) Resultado real del partido 1: 2-1 (gana local)
  await prisma.match.update({ where: { id: matches[0].id }, data: { homeScore: 2, awayScore: 1, status: "FINISHED" } });

  // 5) Liquidar la quiniela (reparte el pozo a ganadores)
  const result = await settlePool(pool.id);
  console.log(`\nLiquidacion: pozo ${formatGTQ(result.potCents ?? 0)} repartido a ${result.payouts?.length ?? 0} ganador(es)`);

  const standings = await getStandings(pool.id);
  console.log("\nTabla final:");
  for (const e of standings) console.log(`  ${e.user.name.padEnd(12)} ${e.points} pts`);

  const anaBal = -(await getBalance(prisma, (await getUserWallet(prisma, ana.id)).id));
  const luisBal = -(await getBalance(prisma, (await getUserWallet(prisma, luis.id)).id));
  console.log(`\nSaldos finales en billetera:`);
  console.log(`  Ana:  ${formatGTQ(anaBal)}`);
  console.log(`  Luis: ${formatGTQ(luisBal)}`);

  const revAcc = await getSystemAccount(prisma, AccountType.PLATFORM_REVENUE);
  console.log(`\nGanancia de la plataforma (rake acumulado): ${formatGTQ(-(await getBalance(prisma, revAcc.id)))}`);

  print("ESTADO FINAL (post-liquidacion)", await financeSnapshot());
  console.log("\nConclusion: el dinero entra, circula y se reparte SIN descuadrar nunca.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
