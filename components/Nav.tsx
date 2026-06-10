import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { formatGTQ } from "@/lib/money";
import LogoutButton from "./LogoutButton";

/** Barra de navegación. Server component: lee la sesión por sí misma. */
export default async function Nav() {
  const viewer = await getViewer();
  const isAdmin = viewer?.session.role === "ADMIN";
  const home = viewer ? "/inicio" : "/";

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-night-950/90 backdrop-blur">
      <div className="container-app flex h-16 items-center justify-between">
        <Link href={home} className="flex items-center gap-2 text-lg font-black">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">⚽</span>
          Quiniela<span className="text-brand-400">GT</span>
        </Link>

        <nav className="hidden gap-6 text-sm font-medium text-gray-300 sm:flex">
          <Link href="/pools" className="hover:text-gold-300">Quinielas</Link>
          <Link href="/partidos" className="hover:text-gold-300">Pronósticos por partido</Link>
          {viewer && <Link href="/inicio" className="hover:text-gold-300">Inicio</Link>}
          {viewer && <Link href="/billetera" className="hover:text-gold-300">Billetera</Link>}
          {isAdmin && <Link href="/admin" className="font-semibold text-gold-400 hover:text-gold-300">Admin</Link>}
        </nav>

        <div className="flex items-center gap-3">
          {viewer ? (
            <>
              <Link href="/billetera" className="scoreboard-digits rounded-full bg-gold-400/15 px-3 py-1 text-sm font-bold text-gold-300">
                {formatGTQ(viewer.balanceCents)}
              </Link>
              <span className="hidden text-sm text-gray-400 sm:inline">{viewer.user.name.split(" ")[0]}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-gray-200 hover:text-white">Ingresar</Link>
              <Link href="/registro" className="btn-gold px-4 py-2 text-sm">Crear cuenta</Link>
            </>
          )}
        </div>
      </div>

      {/* Fila de navegacion solo para moviles (en sm+ se usa la de arriba) */}
      <nav className="container-app flex gap-5 overflow-x-auto pb-3 text-sm font-semibold text-gray-300 sm:hidden">
        <Link href="/pools" className="whitespace-nowrap hover:text-gold-300">Quinielas</Link>
        <Link href="/partidos" className="whitespace-nowrap hover:text-gold-300">Pronósticos</Link>
        {viewer && <Link href="/inicio" className="whitespace-nowrap hover:text-gold-300">Inicio</Link>}
        {viewer && <Link href="/billetera" className="whitespace-nowrap hover:text-gold-300">Billetera</Link>}
        {isAdmin && <Link href="/admin" className="whitespace-nowrap font-bold text-gold-400">Admin</Link>}
      </nav>
    </header>
  );
}
