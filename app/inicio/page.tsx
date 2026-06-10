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
        <h1 className="text-3xl font-black">Hola, {viewer.user.name.split(" ")[0]} 👋</h1>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="card">
            <div className="text-xs font-bold uppercase tracking-wide text-gold-500">Saldo en billetera</div>
            <div className="scoreboard-digits mt-1 text-3xl font-black text-gold-300">{formatGTQ(viewer.balanceCents)}</div>
            <Link href="/billetera" className="btn-gold mt-4 w-full text-sm">Recargar saldo</Link>
          </div>
          <div className="card">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Mis quinielas</div>
            <div className="mt-1 text-3xl font-black">{entries.length}</div>
            <Link href="/pools" className="btn-ghost mt-4 w-full text-sm">Buscar más quinielas</Link>
          </div>
          <div className="card">
            <div className="text-xs font-bold uppercase tracking-wide text-gold-500">Premios ganados</div>
            <div className="scoreboard-digits mt-1 text-3xl font-black text-gold-300">
              {formatGTQ(payouts.reduce((a, p) => a + p.amountCents, 0))}
            </div>
            <div className="mt-4 text-xs text-gray-400">{payouts.length} premio(s)</div>
          </div>
        </div>

        <h2 className="mt-12 text-xl font-bold">Mis boletos</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-gray-400">
            Aún no participas en ninguna quiniela.{" "}
            <Link href="/pools" className="font-semibold text-gold-300">Ver quinielas</Link>
          </p>
        ) : (
          <div className="table-wrap mt-4">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Quiniela</th>
                  <th>Estado</th>
                  <th>Puntos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="font-semibold">{e.pool.name}</td>
                    <td>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-gray-300">{e.status}</span>
                    </td>
                    <td className="font-bold">{e.points}</td>
                    <td className="text-right">
                      <Link href={`/quiniela/${e.poolId}`} className="font-semibold text-gold-300">
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
