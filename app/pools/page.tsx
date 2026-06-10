import Nav from "@/components/Nav";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPoolPots } from "@/lib/ledger";
import { formatGTQ } from "@/lib/money";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  PUBLIC: "Pública",
  PRIVATE: "Privada",
};

export default async function PoolsPage() {
  // Solo quinielas de torneo completo; los retos de un partido van en /partidos
  const pools = await prisma.pool.findMany({
    where: { status: { in: ["OPEN", "CLOSED"] }, matchId: null },
    orderBy: [{ entryFeeCents: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { entries: true } }, tournament: true },
  });

  const pots = await getPoolPots(prisma, pools.map((p) => p.id));
  const withPot = pools.map((p) => ({ ...p, pot: pots.get(p.id) ?? 0 }));

  return (
    <>
      <Nav />
      <main className="container-app py-12">
        <h1 className="text-3xl font-extrabold">Quinielas disponibles</h1>
        <p className="mt-2 text-gray-600">Elige una quiniela, predice los marcadores y gana el pozo.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {withPot.map((p) => (
            <div key={p.id} className="card flex flex-col">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                  {typeLabel[p.type] ?? p.type}
                </span>
                <span className="text-xs text-gray-400">{p._count.entries} participantes</span>
              </div>
              <h3 className="mt-3 text-lg font-bold">{p.name}</h3>
              <p className="text-sm text-gray-500">{p.tournament.name}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-gray-500">Cuota</div>
                  <div className="font-bold">{p.entryFeeCents === 0 ? "Gratis" : formatGTQ(p.entryFeeCents)}</div>
                </div>
                <div className="rounded-lg bg-brand-50 p-3">
                  <div className="text-brand-700">Pozo actual</div>
                  <div className="font-bold text-brand-700">{formatGTQ(p.pot)}</div>
                </div>
              </div>

              <Link href={`/quiniela/${p.id}`} className="btn-primary mt-5 w-full">
                Ver y participar
              </Link>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
