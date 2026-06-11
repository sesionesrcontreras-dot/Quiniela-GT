import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatGTQ } from "@/lib/money";
import { getPoolPots } from "@/lib/ledger";
import { getViewer } from "@/lib/viewer";
import Countdown from "@/components/Countdown";
import PotTicker from "@/components/PotTicker";

// Dinamica: el encabezado refleja si el visitante ya inicio sesion (asi el
// logo no "parece" desloguear). Las consultas son ligeras (~150ms).
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("es-GT", {
  timeZone: "America/Guatemala",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function Home() {
  // Datos REALES: partidos proximos (con su pronostico), pozo acumulado
  // de todas las quinielas abiertas y boletos vendidos.
  const [upcoming, openPools, boletos] = await Promise.all([
    prisma.match.findMany({
      where: { status: "SCHEDULED", kickoff: { gt: new Date() } },
      orderBy: { kickoff: "asc" },
      take: 4,
      include: {
        pools: {
          where: { status: "OPEN" },
          select: { id: true, matchId: true, entryFeeCents: true },
          take: 1,
        },
      },
    }),
    prisma.pool.findMany({ where: { status: "OPEN" }, select: { id: true } }),
    prisma.entry.count({ where: { status: "ACTIVE" } }),
  ]);
  const retoByMatch = new Map(upcoming.flatMap((m) => m.pools).map((r) => [r.matchId!, r]));
  const pots = await getPoolPots(prisma, openPools.map((p) => p.id));
  const pozoTotal = [...pots.values()].reduce((a, b) => a + b, 0);
  const firstKickoff = upcoming[0]?.kickoff ?? null;
  const viewer = await getViewer();

  return (
    <main className="bg-night-950 text-cream">
      {/* ───────────── Nav ───────────── */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-night-950/90 backdrop-blur">
        <div className="container-app flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-black">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">⚽</span>
            Quiniela<span className="text-brand-400">GT</span>
          </Link>
          <nav className="hidden gap-6 text-sm font-medium text-gray-300 sm:flex">
            <a href="#pozo" className="hover:text-gold-300">El pozo</a>
            <a href="#niveles" className="hover:text-gold-300">Niveles</a>
            <a href="#pronosticos" className="hover:text-gold-300">Pronósticos</a>
            <a href="#como" className="hover:text-gold-300">Cómo funciona</a>
            <a href="#seguridad" className="hover:text-gold-300">Seguridad</a>
          </nav>
          <div className="flex items-center gap-4">
            {viewer ? (
              <>
                <Link href="/billetera" className="scoreboard-digits rounded-full bg-gold-400/15 px-3 py-1 text-sm font-bold text-gold-300">
                  {formatGTQ(viewer.balanceCents)}
                </Link>
                <Link href="/inicio" className="btn-gold whitespace-nowrap px-4 py-2 text-sm">Mi cuenta</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden text-sm font-semibold text-gray-200 hover:text-white sm:block">Ingresar</Link>
                <Link href="/registro" className="btn-gold whitespace-nowrap px-4 py-2 text-sm">Crear cuenta</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ───────────── Hero: el marcador manda ───────────── */}
      <section id="pozo" className="stadium-night">
        <div className="container-app grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="animate-fade-up">
            <span className="inline-block rounded-full border border-gold-600/50 bg-gold-400/10 px-3 py-1 text-xs font-bold text-gold-300">
              Mundial 2026 · Guatemala 🇬🇹
            </span>
            <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
              El que le atina,<br />
              <span className="text-brand-400">se lleva el pozo.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-gray-300">
              Predice los marcadores del Mundial, elige a tu campeón y compite
              contra todo el país. Entradas desde Q50. Premios directos a tu
              billetera.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className="btn-gold text-base">Jugar mi quiniela</Link>
              <Link href="/partidos" className="btn-night">Pronosticar un partido</Link>
            </div>
            <p className="mt-5 text-xs text-gray-500">
              +18 · Juega con responsabilidad · Pagos verificados y contabilidad auditable
            </p>
          </div>

          {/* Marcador estilo tablero de estadio */}
          <div className="animate-fade-up anim-delay-2">
            <div className="rounded-2xl border border-gold-600/40 bg-night-900 p-6 sm:p-8">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold-500">Pozo acumulado</span>
                <span className="text-xs text-gray-400">{boletos} {boletos === 1 ? "boleto" : "boletos"} en juego</span>
              </div>
              <div className="mt-2 text-5xl font-black text-gold-300 sm:text-6xl">
                <PotTicker cents={pozoTotal} />
              </div>
              <div className="mt-1 text-xs text-gray-500">crece con cada boleto vendido</div>

              {firstKickoff && (
                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                    El Mundial arranca en
                  </div>
                  <Countdown targetIso={firstKickoff.toISOString()} />
                </div>
              )}

              <div className="mt-6 space-y-2">
                {upcoming.slice(0, 3).map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-gray-100">{m.homeTeam} vs {m.awayTeam}</span>
                    <span className="text-xs text-gray-400">{fmt.format(m.kickoff)}</span>
                  </div>
                ))}
              </div>
              <Link href="/pools" className="btn-gold mt-6 w-full">Entrar desde Q50</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Niveles de entrada ───────────── */}
      <section id="niveles" className="pitch-lines border-t border-white/5">
        <div className="container-app py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black sm:text-4xl">Elige tu nivel de entrada</h2>
            <p className="mt-3 text-gray-400">
              Seis quinielas, el mismo juego: predices el marcador de los 27
              partidos y a tu campeón del Mundial. A mayor entrada, mayor pozo.
              Un boleto por persona en cada quiniela.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Q50", "Para empezar", false],
              ["Q100", "La más jugada", true],
              ["Q150", "Pozo grande", false],
              ["Q200", "Pozo mayor", false],
              ["Q350", "Liga fuerte", false],
              ["Q500", "Mesa VIP", false],
            ].map(([precio, tag, destacada]) => (
              <Link
                key={precio as string}
                href="/pools"
                className={`group flex items-center justify-between rounded-2xl border p-5 transition hover:-translate-y-0.5 ${
                  destacada
                    ? "border-gold-400 bg-gold-400/10"
                    : "border-white/10 bg-white/5 hover:border-brand-400/60"
                }`}
              >
                <div>
                  <div className={`text-3xl font-black ${destacada ? "text-gold-300" : "text-cream"}`}>
                    {precio}
                  </div>
                  <div className={`text-xs ${destacada ? "font-bold text-gold-400" : "text-gray-400"}`}>{tag}</div>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <div>premios 60/30/10</div>
                  <div className={`mt-1 font-bold ${destacada ? "text-gold-300" : "text-brand-400"} group-hover:underline`}>
                    Entrar →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Pronósticos por partido ───────────── */}
      <section id="pronosticos" className="border-t border-white/5 bg-night-950">
        <div className="container-app grid gap-10 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="rounded-full bg-brand-400/10 px-3 py-1 text-xs font-bold text-brand-300">
              Pago único de Q50
            </span>
            <h2 className="mt-4 text-3xl font-black sm:text-4xl">¿Solo te interesa un partido? Pronostícalo.</h2>
            <p className="mt-4 leading-relaxed text-gray-400">
              Elige el partido, paga tu boleto de Q50 y predice el marcador.
              El que más acierta se lleva el pozo completo; si hay empate, se
              divide. Las inscripciones cierran al pitazo inicial.
            </p>
            <Link href="/partidos" className="btn-gold mt-8 inline-flex">Ver todos los pronósticos</Link>
          </div>
          <div className="space-y-2">
            {upcoming.map((m) => {
              const reto = retoByMatch.get(m.id);
              return (
                <Link
                  key={m.id}
                  href={reto ? `/quiniela/${reto.id}` : "/partidos"}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 transition hover:border-gold-400/70 hover:bg-white/10"
                >
                  <div>
                    <div className="font-bold text-gray-100">{m.homeTeam} vs {m.awayTeam}</div>
                    <div className="text-xs text-gray-500">{fmt.format(m.kickoff)} hora GT</div>
                  </div>
                  <span className="rounded-full bg-gold-400 px-3 py-1 text-xs font-black text-night-950">
                    {reto ? `Pronosticar · ${formatGTQ(reto.entryFeeCents)}` : "Ver"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────── Cómo funciona + confianza (zona clara) ───────────── */}
      <section id="como" className="bg-cream text-ink">
        <div className="container-app py-20">
          <h2 className="text-3xl font-black sm:text-4xl">Cómo funciona</h2>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Crea tu cuenta", "Un minuto, con tu correo. +18 y términos claros."],
              ["Recarga saldo", "Tarjeta (se acredita sola), transferencia o efectivo en agencia."],
              ["Predice", "Marcadores de los partidos y tu campeón del Mundial."],
              ["Cobra", "Los premios caen a tu billetera y los retiras a tu banco."],
            ].map(([t, d], i) => (
              <div key={t} className="border-t-2 border-ink pt-4">
                <div className="text-sm font-black text-brand-600">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="mt-1 text-lg font-black">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{d}</p>
              </div>
            ))}
          </div>

          <div id="seguridad" className="mt-16 grid gap-8 rounded-2xl bg-white p-8 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h3 className="text-xl font-black">Una casa que sí paga</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
                Cada centavo queda registrado en un libro contable de partida
                doble que nadie puede editar a mano. Premios calculados y
                repartidos por el sistema, sin discusiones. Contraseñas
                cifradas, pagos verificados y auditoría de cada acción.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-bold">
              {["📒 Contabilidad auditable", "🔐 Datos cifrados", "✅ +18 / KYC"].map((b) => (
                <span key={b} className="rounded-full bg-cream px-4 py-2">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-night-950">
        <div className="container-app flex flex-col items-center justify-between gap-4 py-8 text-sm text-gray-500 sm:flex-row">
          <span>© {new Date().getFullYear()} QuinielaGT · Juega con responsabilidad · +18</span>
          <Link href="/terminos" className="font-semibold text-gray-400 hover:text-gold-300">Términos y Condiciones</Link>
          <span>Hecho en Guatemala 🇬🇹</span>
        </div>
      </footer>
    </main>
  );
}
