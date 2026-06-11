/**
 * DEJA LA BASE 100% LIMPIA para lanzamiento (el usuario confirmo que todas
 * las cuentas existentes son de prueba). Conserva: admin, torneo y partidos.
 * Borra: usuarios (menos admin), boletos, pagos, payouts, TODO el ledger y
 * todas las quinielas. Luego se recrean pools limpios con create-tiers + db:retos.
 *
 * Ejecutar: npx tsx scripts/clean-slate.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ══════════════════════════════════════════════════════════════════
  //  CANDADO DE SEGURIDAD: si ya entró dinero real (algún pago CONFIRMADO),
  //  este script se NIEGA a borrar para proteger a los clientes que pagaron.
  //  Solo se puede forzar a propósito con ALLOW_WIPE=yes (no usar en serio).
  // ══════════════════════════════════════════════════════════════════
  const dineroReal = await prisma.payment.count({ where: { status: "CONFIRMED" } });
  if (dineroReal > 0 && process.env.ALLOW_WIPE !== "yes") {
    console.error(
      `\n⛔ ABORTADO. Hay ${dineroReal} pago(s) CONFIRMADO(S) (dinero real de clientes).\n` +
        `   Este script NO borrará cuentas ni saldos de clientes.\n` +
        `   La base está protegida.\n`
    );
    process.exit(1);
  }

  const r1 = await prisma.prediction.deleteMany({});
  const r2 = await prisma.ledgerEntry.deleteMany({});
  const r3 = await prisma.ledgerTransaction.deleteMany({});
  const r4 = await prisma.payout.deleteMany({});
  const r5 = await prisma.entry.deleteMany({});
  const r6 = await prisma.payment.deleteMany({});
  const r7 = await prisma.ledgerAccount.deleteMany({});
  const r8 = await prisma.pool.deleteMany({});
  const r9 = await prisma.auditLog.deleteMany({});
  const r10 = await prisma.user.deleteMany({ where: { role: { not: "ADMIN" } } });
  await prisma.tournament.updateMany({ data: { championTeam: null } });

  console.log("Limpieza completa:");
  console.log(`  predicciones=${r1.count} asientos=${r2.count} transacciones=${r3.count}`);
  console.log(`  payouts=${r4.count} boletos=${r5.count} pagos=${r6.count}`);
  console.log(`  cuentas_ledger=${r7.count} quinielas=${r8.count} auditoria=${r9.count}`);
  console.log(`  usuarios_borrados=${r10.count} (admin conservado)`);

  const admin = await prisma.user.count({ where: { role: "ADMIN" } });
  const matches = await prisma.match.count();
  console.log(`Quedan: admin=${admin}, partidos=${matches}, pools=0`);
  console.log("Ahora corre: npm run db:tiers && npm run db:retos");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
