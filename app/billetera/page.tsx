import Nav from "@/components/Nav";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { prisma } from "@/lib/prisma";
import { formatGTQ } from "@/lib/money";
import RechargeForm from "@/components/RechargeForm";

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
          <h1 className="text-3xl font-extrabold">Mi billetera</h1>
          <div className="card mt-6">
            <div className="text-sm text-gray-500">Saldo disponible</div>
            <div className="mt-1 text-4xl font-extrabold text-brand-700">{formatGTQ(viewer.balanceCents)}</div>
          </div>

          <h2 className="mt-8 text-lg font-bold">Historial de recargas</h2>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Aún no tienes recargas.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Monto</th>
                    <th className="px-4 py-2">Método</th>
                    <th className="px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-semibold">{formatGTQ(p.amountCents)}</td>
                      <td className="px-4 py-2">{methodLabel[p.method] ?? p.method}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            "rounded-full px-2 py-1 text-xs " +
                            (p.status === "CONFIRMED"
                              ? "bg-brand-50 text-brand-700"
                              : p.status === "PENDING"
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-gray-100 text-gray-600")
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

        <div>
          <RechargeForm />
          <div className="card mt-6 bg-gray-50 text-sm text-gray-600">
            <p className="font-semibold text-ink">¿Cómo funciona?</p>
            <p className="mt-2">
              Por seguridad, las recargas por transferencia o efectivo se acreditan
              cuando un administrador verifica el comprobante. Con tarjeta (Paggo)
              será automático al integrar el procesador.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
