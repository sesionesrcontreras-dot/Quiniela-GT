import Nav from "@/components/Nav";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/ledger";
import { formatGTQ } from "@/lib/money";
import { AccountType } from "@/lib/enums";
import ConfirmPaymentButton from "@/components/admin/ConfirmPaymentButton";
import SetResultForm from "@/components/admin/SetResultForm";
import SettleButton from "@/components/admin/SettleButton";

export const dynamic = "force-dynamic";

async function finance() {
  const grouped = await prisma.ledgerEntry.groupBy({
    by: ["accountId"],
    _sum: { debitCents: true, creditCents: true },
  });
  const accounts = await prisma.ledgerAccount.findMany({ select: { id: true, type: true } });
  const typeById = new Map(accounts.map((a) => [a.id, a.type]));
  const t: Record<string, number> = {};
  for (const g of grouped) {
    const ty = typeById.get(g.accountId)!;
    t[ty] = (t[ty] ?? 0) + (g._sum.debitCents ?? 0) - (g._sum.creditCents ?? 0);
  }
  const assets = (t[AccountType.CASH_BANK] ?? 0) + (t[AccountType.BANK_ACCOUNT] ?? 0) + (t[AccountType.PAGGO_GATEWAY] ?? 0);
  const liabilities = -((t[AccountType.USER_WALLET] ?? 0) + (t[AccountType.POOL_ESCROW] ?? 0));
  const revenue = -(t[AccountType.PLATFORM_REVENUE] ?? 0);
  const expenses = (t[AccountType.PAYMENT_FEES] ?? 0) + (t[AccountType.PROMO_BONUS] ?? 0);
  const equity = revenue - expenses;
  return {
    assets,
    liabilities,
    revenue,
    expenses,
    playerBalances: -(t[AccountType.USER_WALLET] ?? 0),
    pots: -(t[AccountType.POOL_ESCROW] ?? 0),
    diff: assets - (liabilities + equity),
  };
}

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.session.role !== "ADMIN") redirect("/inicio");

  const f = await finance();

  const pendingPayments = await prisma.payment.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  const matches = await prisma.match.findMany({
    where: { status: "SCHEDULED" },
    orderBy: { kickoff: "asc" },
    take: 12,
  });

  const pools = await prisma.pool.findMany({ orderBy: { createdAt: "asc" } });
  const poolsWithPot = await Promise.all(
    pools.map(async (p) => {
      const escrow = await prisma.ledgerAccount.findUnique({ where: { poolId: p.id } });
      return { ...p, pot: escrow ? -(await getBalance(prisma, escrow.id)) : 0 };
    })
  );

  const audit = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 });

  return (
    <>
      <Nav />
      <main className="container-app space-y-10 py-12">
        <h1 className="text-3xl font-extrabold">Panel de administración</h1>

        {/* Finanzas */}
        <section>
          <h2 className="mb-4 text-xl font-bold">Finanzas (en vivo, desde el ledger)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Activos (dinero real)" value={formatGTQ(f.assets)} />
            <Stat label="Saldos de jugadores" value={formatGTQ(f.playerBalances)} />
            <Stat label="Pozos en juego" value={formatGTQ(f.pots)} />
            <Stat label="Ganancia (comisión)" value={formatGTQ(f.revenue)} highlight />
          </div>
          <div className={"mt-4 rounded-xl px-4 py-3 text-sm font-semibold " + (f.diff === 0 ? "bg-brand-500/15 text-brand-300" : "bg-red-500/15 text-red-300")}>
            Cuadre contable (Activos = Pasivos + Patrimonio): diferencia {formatGTQ(f.diff)} {f.diff === 0 ? "✓ cuadra" : "✗ REVISAR"}
          </div>
        </section>

        {/* Pagos pendientes */}
        <section>
          <h2 className="mb-4 text-xl font-bold">Pagos pendientes de confirmar ({pendingPayments.length})</h2>
          {pendingPayments.length === 0 ? (
            <p className="text-sm text-gray-400">No hay pagos pendientes.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-gray-400">
                  <tr><th className="px-4 py-2">Jugador</th><th className="px-4 py-2">Monto</th><th className="px-4 py-2">Método</th><th className="px-4 py-2">Ref.</th><th className="px-4 py-2"></th></tr>
                </thead>
                <tbody>
                  {pendingPayments.map((p) => (
                    <tr key={p.id} className="border-t border-white/10">
                      <td className="px-4 py-2">{p.user.name}</td>
                      <td className="px-4 py-2 font-semibold">{formatGTQ(p.amountCents)}</td>
                      <td className="px-4 py-2">{p.method}</td>
                      <td className="px-4 py-2 text-gray-500">{p.reference ?? "—"}</td>
                      <td className="px-4 py-2"><ConfirmPaymentButton paymentId={p.id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Cargar resultados */}
        <section>
          <h2 className="mb-4 text-xl font-bold">Cargar resultados (próximos partidos)</h2>
          <div className="space-y-2 rounded-2xl border border-white/10 p-4">
            {matches.map((m) => (
              <SetResultForm key={m.id} matchId={m.id} homeTeam={m.homeTeam} awayTeam={m.awayTeam} />
            ))}
          </div>
        </section>

        {/* Liquidar quinielas */}
        <section>
          <h2 className="mb-4 text-xl font-bold">Quinielas</h2>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-gray-400">
                <tr><th className="px-4 py-2">Nombre</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Estado</th><th className="px-4 py-2">Pozo</th><th className="px-4 py-2"></th></tr>
              </thead>
              <tbody>
                {poolsWithPot.map((p) => (
                  <tr key={p.id} className="border-t border-white/10">
                    <td className="px-4 py-2 font-semibold">{p.name}</td>
                    <td className="px-4 py-2">{p.type}</td>
                    <td className="px-4 py-2">{p.status}</td>
                    <td className="px-4 py-2 font-semibold">{formatGTQ(p.pot)}</td>
                    <td className="px-4 py-2">{(p.status === "OPEN" || p.status === "CLOSED") && <SettleButton poolId={p.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Auditoría */}
        <section>
          <h2 className="mb-4 text-xl font-bold">Auditoría reciente</h2>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-gray-400">
                <tr><th className="px-4 py-2">Acción</th><th className="px-4 py-2">Entidad</th><th className="px-4 py-2">Fecha</th></tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-t border-white/10">
                    <td className="px-4 py-2 font-medium">{a.action}</td>
                    <td className="px-4 py-2 text-gray-500">{a.entity}</td>
                    <td className="px-4 py-2 text-gray-500">{a.createdAt.toLocaleString("es-GT")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"card " + (highlight ? "border-gold-600/40 bg-gold-400/10" : "")}>
      <div className={"text-xs font-bold uppercase tracking-wide " + (highlight ? "text-gold-500" : "text-gray-400")}>{label}</div>
      <div className={"scoreboard-digits mt-1 text-2xl font-black " + (highlight ? "text-gold-300" : "")}>{value}</div>
    </div>
  );
}
