import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatGTQ } from "@/lib/money";
import Countdown from "@/components/Countdown";

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
  // Datos REALES para que la pagina se sienta viva (nada inventado).
  const upcoming = await prisma.match.findMany({
    where: { status: "SCHEDULED", kickoff: { gt: new Date() } },
    orderBy: { kickoff: "asc" },
    take: 4,
  });
  const retos = await prisma.pool.findMany({
    where: { matchId: { in: upcoming.map((m) => m.id) }, status: "OPEN" },
    select: { id: true, matchId: true, entryFeeCents: true },
  });
  const retoByMatch = new Map(retos.map((r) => [r.matchId!, r]));
  const firstKickoff = upcoming[0]?.kickoff ?? null;

  return (
    <main>
      {/* ───────────── Nav ───────────── */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="container-app flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">⚽</span>
            Quiniela<span className="text-brand-600">GT</span>
          </div>
          <nav className="hidden gap-6 text-sm font-medium text-gray-600 sm:flex">
            <a href="#como" className="hover:text-ink">Como funciona</a>
            <a href="#niveles" className="hover:text-ink">Niveles</a>
            <a href="#retos" className="hover:text-ink">Retos por partido</a>
            <a href="#pagos" className="hover:text-ink">Pagos</a>
            <a href="#seguridad" className="hover:text-ink">Seguridad</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold">Ingresar</Link>
            <Link href="/registro" className="btn-primary text-sm">Crear cuenta</Link>
          </div>
        </div>
      </header>

      {/* ───────────── Hero ───────────── */}
      <section className="hero-gradient">
        <div className="container-app grid gap-10 py-20 lg:grid-cols-2 lg:items-center">
          <div className="animate-fade-up">
            <span className="inline-block animate-float rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
              Rumbo al Mundial 2026 🇬🇹
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Predice el <span className="text-brand-600">Mundial</span> y llévate el pozo
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Quinielas desde Q50 y retos de un solo partido. Predice los
              marcadores, suma puntos y gana. Paga por transferencia, tarjeta o
              efectivo en agencias bancarias.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className="btn-primary">Crear cuenta y jugar</Link>
              <Link href="/partidos" className="btn-ghost">Retar un partido</Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              +18. Juega con responsabilidad. Plataforma con verificacion de identidad.
            </p>
          </div>
          <div className="card animate-fade-up anim-delay-2">
            {firstKickoff ? (
              <>
                <div className="text-sm font-semibold text-gray-500">El Mundial arranca en</div>
                <div className="mt-3">
                  <Countdown targetIso={firstKickoff.toISOString()} />
                </div>
              </>
            ) : null}
            <div className="mt-5 space-y-3">
              {upcoming.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm transition hover:bg-brand-50">
                  <span className="font-semibold">{m.homeTeam} vs {m.awayTeam}</span>
                  <span className="text-gray-500">{fmt.format(m.kickoff)}</span>
                </div>
              ))}
            </div>
            <Link href="/pools" className="btn-primary mt-5 w-full">Participar desde Q50</Link>
          </div>
        </div>
      </section>

      {/* ───────────── Como funciona ───────────── */}
      <section id="como" className="container-app py-20">
        <h2 className="text-center text-3xl font-bold">Como funciona</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            ["1", "Crea tu cuenta", "Registro en un minuto con tu correo."],
            ["2", "Recarga saldo", "Transferencia, tarjeta o efectivo en agencia."],
            ["3", "Predice", "Marca los resultados antes de cada partido."],
            ["4", "Gana el pozo", "El sistema calcula puntos y reparte premios solo."],
          ].map(([n, t, d], i) => (
            <div key={n} className={`card animate-fade-up anim-delay-${i + 1}`}>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 font-bold text-white">{n}</div>
              <h3 className="mt-4 font-bold">{t}</h3>
              <p className="mt-1 text-sm text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── Niveles de entrada ───────────── */}
      <section id="niveles" className="bg-gray-50">
        <div className="container-app py-20">
          <h2 className="text-center text-3xl font-bold">Elige tu nivel de entrada</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">
            Cuatro quinielas públicas con el mismo calendario del Mundial.
            A mayor entrada, mayor pozo. Puedes jugar hasta 3 boletos por quiniela.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Q50", "Para empezar", false],
              ["Q100", "La más jugada", true],
              ["Q150", "Pozo grande", false],
              ["Q200", "Máximo premio", false],
            ].map(([precio, tag, destacada], i) => (
              <div
                key={precio as string}
                className={`card animate-fade-up anim-delay-${i + 1} flex flex-col items-center text-center ${
                  destacada ? "border-2 border-brand-600" : ""
                }`}
              >
                {destacada ? (
                  <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                    Popular
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
                    {tag}
                  </span>
                )}
                <div className="mt-4 text-4xl font-extrabold text-brand-700">{precio}</div>
                <div className="text-sm text-gray-500">por boleto</div>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li>✓ Premios a los 3 primeros</li>
                  <li>✓ 60% / 30% / 10% del pozo</li>
                  <li>✓ Hasta 3 boletos</li>
                </ul>
                <Link href="/pools" className="btn-primary mt-6 w-full">Entrar</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Retos por partido ───────────── */}
      <section id="retos" className="bg-ink text-white">
        <div className="container-app py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-brand-100">
                Nuevo · Pago único de Q50
              </span>
              <h2 className="mt-4 text-3xl font-bold">¿Solo te interesa UN partido? Rétalo.</h2>
              <p className="mt-4 text-gray-300">
                Elige el partido, paga tu boleto de Q50, predice el marcador y
                llévate el pozo completo si eres quien más acierta. Marcador
                exacto manda; si hay empate, el pozo se divide entre los ganadores.
              </p>
              <Link href="/partidos" className="btn-primary mt-8 inline-flex">Ver retos disponibles</Link>
            </div>
            <div className="space-y-3">
              {upcoming.map((m) => {
                const reto = retoByMatch.get(m.id);
                return (
                  <Link
                    key={m.id}
                    href={reto ? `/quiniela/${reto.id}` : "/partidos"}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:border-brand-500 hover:bg-white/10"
                  >
                    <div>
                      <div className="font-bold">{m.homeTeam} vs {m.awayTeam}</div>
                      <div className="text-xs text-gray-400">{fmt.format(m.kickoff)} (hora GT)</div>
                    </div>
                    <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-bold">
                      {reto ? `Retar · ${formatGTQ(reto.entryFeeCents)}` : "Ver"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Pagos ───────────── */}
      <section id="pagos" className="container-app py-20">
        <h2 className="text-center text-3xl font-bold">Metodos de pago</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            ["🏦", "Transferencia bancaria", "Sube tu comprobante. Acreditamos al verificar."],
            ["💳", "Tarjeta", "Pago seguro con tarjeta via procesador local."],
            ["🏪", "Efectivo en agencia", "Paga en agencias bancarias con tu codigo."],
          ].map(([i, t, d], idx) => (
            <div key={t} className={`card animate-fade-up anim-delay-${idx + 1} text-center`}>
              <div className="text-4xl">{i}</div>
              <h3 className="mt-3 font-bold">{t}</h3>
              <p className="mt-1 text-sm text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── Seguridad ───────────── */}
      <section id="seguridad" className="bg-brand-50">
        <div className="container-app py-20 text-center">
          <h2 className="text-3xl font-bold">Seguridad y transparencia</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Cada centavo se registra en un libro contable de partida doble.
            Contraseñas cifradas, sesiones protegidas y auditoria de cada accion.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm font-semibold">
            {["🔐 Contraseñas cifradas", "📒 Contabilidad auditable", "🛡️ Anti-fraude", "✅ Verificacion +18 / KYC"].map((b) => (
              <span key={b} className="rounded-full bg-white px-4 py-2 shadow-sm">{b}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100">
        <div className="container-app flex flex-col items-center justify-between gap-4 py-8 text-sm text-gray-500 sm:flex-row">
          <span>© {new Date().getFullYear()} QuinielaGT. Juega con responsabilidad. +18.</span>
          <span>Hecho en Guatemala 🇬🇹</span>
        </div>
      </footer>
    </main>
  );
}
