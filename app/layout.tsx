import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Voz de la marca: cartel deportivo / marcador de estadio. Archivo aguanta
// desde el peso 400 (cuerpo) hasta el 900 (titulares tipo afiche).
const archivo = Archivo({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Quiniela GT — Quinielas del Mundial",
  description:
    "Quinielas del Mundial 2026 en Guatemala. Predice marcadores, elige a tu campeón y llévate el pozo. Pagos por transferencia, tarjeta y efectivo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={archivo.className}>{children}</body>
    </html>
  );
}
