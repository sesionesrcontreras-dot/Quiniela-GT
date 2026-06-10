import Nav from "@/components/Nav";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { prisma } from "@/lib/prisma";
import { formatGTQ } from "@/lib/money";
import RechargeForm from "@/components/RechargeForm";
import WithdrawForm from "@/components/WithdrawForm";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  REJECTED: "Rechazado",
  REFUNDED: "Devuelto",
};
const methodLabel: Record<string, string> = {
  BANK_TRANSFER: "Transferencia",
  CARD_PAGGO: "Tarjeta (Paggo)",
  CASH_AGENCY: "Efectivo",
  WITHDRAWAL: "Retiro",
};

export default async function BilleteraPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const payments = await prisma.payment.findMany({
    where: { userId: viewer.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <>
      <Nav />
      <main className="container-app grid gap-8 py-12 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-black">Mi billetera</h1>
          <div className="card mt-6">
            <div className="text-xs font-bold uppercase tracking-wide text-gold-500">Saldo disponible</div>
            <div className="scoreboard-digits mt-1 text-4xl font-black text-gold-300">{formatGTQ(viewer.balanceCents)}</div>
          </div>

          <h2 className="mt-8 text-lg font-bold">Historial de movimientos</h2>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">Aún no tienes movimientos.</p>
          ) : (
            <div className="table-wrap mt-3">
              <table className="table-app">
                <thead>
                  <tr>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-semibold">{formatGTQ(p.amountCents)}</td>
                      <td className="text-gray-300">{methodLabel[p.method] ?? p.method}</td>
                      <td>
                        <span
                          className={
                            "rounded-full px-2 py-1 text-xs font-semibold " +
                            (p.status === "CONFIRMED"
                              ? "bg-brand-500/15 text-brand-300"
                              : p.status === "PENDING"
                              ? "bg-gold-400/15 text-gold-300"
                              : "bg-white/10 text-gray-400")
                          }
                        >
                          {statusLabel[p.status] ?? p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <RechargeForm />
          <WithdrawForm maxQuetzales={viewer.balanceCents / 100} />
          <div className="card text-sm text-gray-300">
            <p className="font-semibold text-cream">¿Cómo funciona?</p>
            <p className="mt-2">
              Con tarjeta el saldo se acredita automáticamente. Las recargas por
              transferencia o efectivo se acreditan cuando verificamos tu
              comprobante. Los premios caen a esta billetera y los retiras por
              transferencia a tu cuenta bancaria.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
