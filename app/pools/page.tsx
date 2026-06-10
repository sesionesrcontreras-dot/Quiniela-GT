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
        <h1 className="text-3xl font-black sm:text-4xl">Quinielas disponibles</h1>
        <p className="mt-2 max-w-2xl text-gray-400">
          En cada quiniela predices el marcador de los 27 partidos de la primera
          ronda y a tu campeón del Mundial (+10 pts si la pegas). Los 3 mejores
          puntajes se reparten el pozo: 60% / 30% / 10%.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {withPot.map((p) => (
            <div key={p.id} className="card flex flex-col hover:-translate-y-0.5 hover:border-brand-400/50">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gray-300">
                  {typeLabel[p.type] ?? p.type}
                </span>
                <span className="text-xs text-gray-400">{p._count.entries} participantes</span>
              </div>
              <h3 className="mt-3 text-lg font-bold">{p.name}</h3>
              <p className="text-sm text-gray-400">27 partidos + tu campeón del Mundial</p>

              <div className="money-panel mt-4 flex items-end justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-gold-500">Pozo actual</div>
                  <div className="scoreboard-digits text-2xl font-black text-gold-300">{formatGTQ(p.pot)}</div>
                </div>
                <div className="text-right text-xs text-gray-400">
                  entrada<div className="text-sm font-bold text-gray-200">{p.entryFeeCents === 0 ? "Gratis" : formatGTQ(p.entryFeeCents)}</div>
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
