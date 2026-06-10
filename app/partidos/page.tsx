import Nav from "@/components/Nav";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPoolPots } from "@/lib/ledger";
import { formatGTQ } from "@/lib/money";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("es-GT", {
  timeZone: "America/Guatemala",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function PartidosPage() {
  const pools = await prisma.pool.findMany({
    where: {
      status: "OPEN",
      matchId: { not: null },
      match: { status: "SCHEDULED", kickoff: { gt: new Date() } },
    },
    orderBy: { match: { kickoff: "asc" } },
    include: { match: true, _count: { select: { entries: true } } },
  });

  const pots = await getPoolPots(prisma, pools.map((p) => p.id));
  const withPot = pools.map((p) => ({ ...p, pot: pots.get(p.id) ?? 0 }));

  return (
    <>
      <Nav />
      <main className="container-app py-12">
        <h1 className="text-3xl font-extrabold">Retos por partido</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Elige UN partido, paga tu boleto de {formatGTQ(5000)}, predice el
          marcador y llévate el pozo si eres quien más acierta. Marcador exacto
          gana sobre acertar solo el resultado; si hay empate, el pozo se divide.
        </p>

        {withPot.length === 0 ? (
          <div className="card mt-8 text-gray-600">
            Por ahora no hay retos abiertos. Vuelve pronto.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {withPot.map((p) => (
              <div key={p.id} className="card flex flex-col">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="rounded-full bg-brand-50 px-3 py-1 font-bold text-brand-700">
                    Reto por partido
                  </span>
                  <span>{p._count.entries} boletos</span>
                </div>
                <h3 className="mt-3 text-lg font-bold">
                  {p.match!.homeTeam} <span className="text-gray-400">vs</span> {p.match!.awayTeam}
                </h3>
                <p className="text-sm text-gray-500">{fmt.format(p.match!.kickoff)} (hora GT)</p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-gray-500">Boleto</div>
                    <div className="font-bold">{formatGTQ(p.entryFeeCents)}</div>
                  </div>
                  <div className="rounded-lg bg-brand-50 p-3">
                    <div className="text-brand-700">Pozo actual</div>
                    <div className="font-bold text-brand-700">{formatGTQ(p.pot)}</div>
                  </div>
                </div>

                <Link href={`/quiniela/${p.id}`} className="btn-primary mt-5 w-full">
                  Predecir este partido
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
