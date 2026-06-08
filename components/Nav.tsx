import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { formatGTQ } from "@/lib/money";
import LogoutButton from "./LogoutButton";

/** Barra de navegación. Server component: lee la sesión por sí misma. */
export default async function Nav() {
  const viewer = await getViewer();
  const isAdmin = viewer?.session.role === "ADMIN";

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="container-app flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">⚽</span>
          Quiniela<span className="text-brand-600">GT</span>
        </Link>

        <nav className="hidden gap-6 text-sm font-medium text-gray-600 sm:flex">
          <Link href="/pools" className="hover:text-ink">Quinielas</Link>
          {viewer && <Link href="/inicio" className="hover:text-ink">Inicio</Link>}
          {viewer && <Link href="/billetera" className="hover:text-ink">Billetera</Link>}
          {isAdmin && <Link href="/admin" className="font-semibold text-brand-700 hover:text-brand-900">Admin</Link>}
        </nav>

        <div className="flex items-center gap-3">
          {viewer ? (
            <>
              <Link href="/billetera" className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
                {formatGTQ(viewer.balanceCents)}
              </Link>
              <span className="hidden text-sm text-gray-500 sm:inline">{viewer.user.name}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold">Ingresar</Link>
              <Link href="/registro" className="btn-primary text-sm">Crear cuenta</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
