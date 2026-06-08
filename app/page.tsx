import Link from "next/link";

export default function Home() {
  return (
    <main>
      {/* ───────────── Nav ───────────── */}
      <header className="border-b border-gray-100">
        <div className="container-app flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">⚽</span>
            Quiniela<span className="text-brand-600">GT</span>
          </div>
          <nav className="hidden gap-6 text-sm font-medium text-gray-600 sm:flex">
            <a href="#como" className="hover:text-ink">Como funciona</a>
            <a href="#privadas" className="hover:text-ink">Con amigos</a>
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
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="container-app grid gap-10 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
              Rumbo al Mundial 2026 🇬🇹
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Crea tu quiniela del <span className="text-brand-600">Mundial</span> y juega con tus amigos
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Predice los marcadores, suma puntos y gana el pozo. Quinielas
              públicas o privadas con tus amigos. Paga por transferencia, tarjeta
              o efectivo en agencias bancarias.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className="btn-primary">Empezar gratis</Link>
              <Link href="/pools" className="btn-ghost">Ver quinielas</Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              +18. Juega con responsabilidad. Plataforma con verificacion de identidad.
            </p>
          </div>
          <div className="card">
            <div className="text-sm font-semibold text-gray-500">Pozo actual</div>
            <div className="text-4xl font-extrabold text-brand-700">Q 12,400</div>
            <div className="mt-4 space-y-3">
              {[
                ["México", "Sudáfrica", "jue 11 jun"],
                ["Brasil", "Marruecos", "sáb 13 jun"],
                ["España", "Cabo Verde", "lun 15 jun"],
              ].map(([h, a, t]) => (
                <div key={h} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
                  <span className="font-semibold">{h} vs {a}</span>
                  <span className="text-gray-500">{t}</span>
                </div>
              ))}
            </div>
            <Link href="/pools" className="btn-primary mt-5 w-full">Participar (Q50)</Link>
          </div>
        </div>
      </section>

      {/* ───────────── Como funciona ───────────── */}
      <section id="como" className="container-app py-20">
        <h2 className="text-center text-3xl font-bold">Como funciona</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            ["1", "Crea o entra", "Crea tu quiniela o unete a una publica/privada."],
            ["2", "Recarga saldo", "Transferencia, tarjeta (Paggo) o efectivo en agencia."],
            ["3", "Predice", "Marca los resultados antes de cada partido."],
            ["4", "Gana el pozo", "El sistema calcula puntos y reparte premios solo."],
          ].map(([n, t, d]) => (
            <div key={n} className="card">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 font-bold text-white">{n}</div>
              <h3 className="mt-4 font-bold">{t}</h3>
              <p className="mt-1 text-sm text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── Quinielas privadas (con amigos) ───────────── */}
      <section id="privadas" className="bg-ink text-white">
        <div className="container-app grid gap-10 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">Crea tu quiniela privada con amigos</h2>
            <p className="mt-4 text-gray-300">
              Arma tu grupo, define la cuota y el premio, comparte un código de
              invitación y compite con tus amigos durante todo el Mundial.
            </p>
            <ul className="mt-6 space-y-3 text-gray-200">
              <li>✓ Grupo privado por código de invitación</li>
              <li>✓ Tú defines la cuota y el reparto del premio</li>
              <li>✓ Tabla de posiciones en vivo</li>
              <li>✓ Premios automáticos y transparentes</li>
            </ul>
            <Link href="/registro" className="btn-primary mt-8">Crear mi quiniela</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Comisión automática", "La plataforma retiene el rake del pozo en cada quiniela de paga."],
              ["Entradas múltiples", "Cada jugador puede comprar varios boletos."],
              ["Quinielas públicas", "Compite contra todo el país por el pozo."],
              ["Premios al instante", "El sistema calcula y reparte solo, sin discusiones."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="font-bold">{t}</h3>
                <p className="mt-1 text-sm text-gray-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Pagos ───────────── */}
      <section id="pagos" className="container-app py-20">
        <h2 className="text-center text-3xl font-bold">Metodos de pago</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            ["🏦", "Transferencia bancaria", "Sube tu comprobante. Acreditamos al verificar."],
            ["💳", "Tarjeta (Paggo)", "Pago seguro con tarjeta via procesador Paggo."],
            ["🏪", "Efectivo en agencia", "Paga en agencias bancarias con tu codigo."],
          ].map(([i, t, d]) => (
            <div key={t} className="card text-center">
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
