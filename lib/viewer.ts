/**
 * Helper para páginas (server components): obtiene el usuario actual + su saldo
 * disponible en billetera, leyendo el ledger. Devuelve null si no hay sesión.
 */
import { getSession } from "./auth";
import { prisma } from "./prisma";
import { getBalance } from "./ledger";

export async function getViewer() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.isBlocked) return null;

  // La billetera es un pasivo: saldo disponible = -(saldo contable).
  const wallet = await prisma.ledgerAccount.findUnique({ where: { userId: user.id } });
  const balanceCents = wallet ? -(await getBalance(prisma, wallet.id)) : 0;

  return { session, user, balanceCents };
}
