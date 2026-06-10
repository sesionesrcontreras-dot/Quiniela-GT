import Nav from "@/components/Nav";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/viewer";
import { getBalance } from "@/lib/ledger";
import { formatGTQ } from "@/lib/money";
import { parseRules } from "@/lib/scoring";
import JoinPoolButton from "@/components/JoinPoolButton";
import PredictionForm, { MatchRow } from "@/components/PredictionForm";
import ChampionPick from "@/components/ChampionPick";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("es-GT", {
  timeZone: "America/Guatemala",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function QuinielaPage({ params }: { params: { id: string } }) {
  const pool = await prisma.pool.findUnique({
    where: { id: params.id },
    include: { tournament: { include: { matches: { orderBy: { kickoff: "asc" } } } } },
  });
  if (!pool) notFound();

  const viewer = await getViewer();
  const escrow = await prisma.ledgerAccount.findUnique({ where: { poolId: pool.id } });
  const pot = escrow ? -(await getBalance(prisma, escrow.id)) : 0;
  const rules = parseRules(pool.scoringRules);
  const prizeSplit = JSON.parse(pool.prizeSplit) as number[];

  // Tabla de posiciones
  const standings = await prisma.entry.findMany({
    where: { poolId: pool.id, status: "ACTIVE" },
    orderBy: [{ points: "desc" }, { createdAt: "asc" }],
    include: { user: { select: { name: true } } },
  });

  // Boleto del usuario (si tiene)
  let myEntry = null as null | { id: string; championPick: string | null };
  let predMap = new Map<string, { predHome: number; predAway: number; pointsAwarded: number }>();
  if (viewer) {
    const entry = await prisma.entry.findFirst({
      where: { poolId: pool.id, userId: viewer.user.id, status: "ACTIVE" },
      include: { predictions: true },
    });
    if (entry) {
      myEntry = { id: entry.id, championPick: entry.championPick };
      predMap = new Map(entry.predictions.map((p) => [p.matchId, p]));
    }
  }

  // Equipos del torneo (para elegir campeon) y si la eleccion sigue abierta
  const teams = pool.matchId
    ? []
    : [...new Set(pool.tournament.matches.flatMap((m) => [m.homeTeam, m.awayTeam]))].sort((a, b) =>
        a.localeCompare(b, "es")
      );
  const championLocked = pool.tournament.startsAt <= new Date();

  const now = new Date();
  // Reto de un solo partido: solo se muestra y predice ese match.
  const poolMatches = pool.matchId
    ? pool.tournament.matches.filter((m) => m.id === pool.matchId)
    : pool.tournament.matches;
  const matchRows: MatchRow[] = poolMatches.map((m) => {
    const locked = m.status !== "SCHEDULED" || (m.lockedAt ?? m.kickoff) <= now;
    const pred = predMap.get(m.id);
    return {
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoffLabel: fmt.format(m.kickoff),
      stage: m.stage,
      locked,
      result: m.status === "FINISHED" && m.homeScore != null ? `${m.homeScore} - ${m.awayScore}` : null,
      predHome: pred ? pred.predHome : "",
      predAway: pred ? pred.predAway : "",
      pointsAwarded: pred?.pointsAwarded,
    };
  });

  return (
    <>
      <Nav />
      <main className="container-app grid gap-8 py-12 lg:grid-cols-3">
        {/* Columna principal: predicciones */}
        <div className="lg:col-span-2">
          <Link href="/pools" className="text-sm text-gray-400 hover:text-white">← Todas las quinielas</Link>
          <h1 className="mt-2 text-3xl font-black">{pool.name}</h1>
          <p className="text-gray-400">
            {pool.tournament.name} ·{" "}
            {pool.matchId
              ? "Pronóstico de un solo partido: acierta el marcador y llévate el pozo"
              : `Predice el marcador de los ${pool.tournament.matches.length} partidos y a tu campeón del Mundial`}
          </p>

          <div className="mt-6">
            {!viewer ? (
              <div className="card text-center">
                <p className="text-gray-300">Inicia sesión para participar y predecir.</p>
                <div className="mt-4 flex justify-center gap-3">
                  <Link href="/login" className="btn-ghost">Ingresar</Link>
                  <Link href="/registro" className="btn-primary">Crear cuenta</Link>
                </div>
              </div>
            ) : myEntry ? (
              <div className="space-y-6">
                {!pool.matchId && (
                  <ChampionPick
                    entryId={myEntry.id}
                    teams={teams}
                    current={myEntry.championPick}
                    locked={championLocked}
                    bonusPoints={rules.champion ?? 10}
                  />
                )}
                <div>
                  <h2 className="mb-3 text-lg font-bold">Tus predicciones</h2>
                  <PredictionForm entryId={myEntry.id} matches={matchRows} />
                </div>
              </div>
            ) : pool.status !== "OPEN" ? (
              <div className="card text-gray-300">Esta quiniela ya no admite inscripciones.</div>
            ) : (
              <div className="card">
                <h2 className="font-bold">Participa en esta quiniela</h2>
                <p className="mt-1 mb-4 text-sm text-gray-300">
                  {pool.entryFeeCents > 0
                    ? `Cuota: ${formatGTQ(pool.entryFeeCents)} (se cobra de tu saldo).`
                    : "Participación gratuita."}
                </p>
                <JoinPoolButton
                  poolId={pool.id}
                  requiresCode={pool.type !== "PUBLIC"}
                  entryFeeCents={pool.entryFeeCents}
                />
              </div>
            )}
          </div>
        </div>

        {/* Columna lateral: info + tabla */}
        <aside className="space-y-6">
          <div className="card">
            <div className="text-xs font-bold uppercase tracking-wide text-gold-500">Pozo actual</div>
            <div className="scoreboard-digits text-3xl font-black text-gold-300">{formatGTQ(pot)}</div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-400">Cuota</dt><dd className="font-semibold">{pool.entryFeeCents === 0 ? "Gratis" : formatGTQ(pool.entryFeeCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Comisión</dt><dd className="font-semibold">{pool.rakePercent}%</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Marcador exacto</dt><dd className="font-semibold">{rules.exact} pts</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Resultado</dt><dd className="font-semibold">{rules.outcome} pts</dd></div>
              {!pool.matchId && rules.champion ? (
                <div className="flex justify-between"><dt className="text-gray-400">Acertar campeón</dt><dd className="font-semibold text-gold-300">+{rules.champion} pts</dd></div>
              ) : null}
              <div className="flex justify-between"><dt className="text-gray-400">Reparto</dt><dd className="font-semibold">{prizeSplit.join("/")}%</dd></div>
            </dl>
          </div>

          <div className="card">
            <h3 className="font-bold">Tabla de posiciones</h3>
            {standings.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">Aún sin participantes.</p>
            ) : (
              <ol className="mt-3 space-y-1 text-sm">
                {standings.map((e, i) => (
                  <li key={e.id} className="flex items-center justify-between rounded-lg px-2 py-1 odd:bg-white/5">
                    <span><span className="mr-2 font-bold text-gold-400">{i + 1}</span>{e.user.name}</span>
                    <span className="font-bold">{e.points} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </main>
    </>
  );
}
