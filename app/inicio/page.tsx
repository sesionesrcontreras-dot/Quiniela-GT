import Nav from "@/components/Nav";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { prisma } from "@/lib/prisma";
import { formatGTQ } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const entries = await prisma.entry.findMany({
    where: { userId: viewer.user.id },
    orderBy: { createdAt: "desc" },
    include: { pool: true },
  });

  const payouts = await prisma.payout.findMany({
    where: { userId: viewer.user.id },
    include: { pool: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Nav />
      <main className="container-app py-12">
        <h1 className="text-3xl font-extrabold">Hola, {viewer.user.name.split(" ")[0]} 👋</h1>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="card">
            <div className="text-sm text-gray-500">Saldo en billetera</div>
            <div className="mt-1 text-3xl font-extrabold text-brand-700">{formatGTQ(viewer.balanceCents)}</div>
            <Link href="/billetera" className="btn-primary mt-4 w-full text-sm">Recargar saldo</Link>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">Mis quinielas</div>
            <div className="mt-1 text-3xl font-extrabold">{entries.length}</div>
            <Link href="/pools" className="btn-ghost mt-4 w-full text-sm">Buscar más quinielas</Link>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">Premios ganados</div>
            <div className="mt-1 text-3xl font-extrabold text-brand-700">
              {formatGTQ(payouts.reduce((a, p) => a + p.amountCents, 0))}
            </div>
            <div className="mt-4 text-xs text-gray-400">{payouts.length} premio(s)</div>
          </div>
        </div>

        <h2 className="mt-12 text-xl font-bold">Mis boletos</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-gray-500">
            Aún no participas en ninguna quiniela.{" "}
            <Link href="/pools" className="font-semibold text-brand-700">Ver quinielas</Link>
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3">Quiniela</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Puntos</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold">{e.pool.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{e.status}</span>
                    </td>
                    <td className="px-4 py-3 font-bold">{e.points}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/quiniela/${e.poolId}`} className="font-semibold text-brand-700">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
