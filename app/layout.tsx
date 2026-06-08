import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quiniela GT — Quinielas del Mundial",
  description:
    "Crea y juega quinielas del Mundial de Futbol en Guatemala. Pagos por transferencia, tarjeta (Paggo) y efectivo en agencias.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
