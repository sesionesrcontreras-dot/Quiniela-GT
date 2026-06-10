"use client";

import { useEffect, useState } from "react";

function diff(targetMs: number) {
  const d = Math.max(0, targetMs - Date.now());
  return {
    dias: Math.floor(d / 86_400_000),
    horas: Math.floor((d % 86_400_000) / 3_600_000),
    min: Math.floor((d % 3_600_000) / 60_000),
    seg: Math.floor((d % 60_000) / 1000),
  };
}

/** Cuenta regresiva en vivo hacia una fecha (ISO). */
export default function Countdown({ targetIso }: { targetIso: string }) {
  const targetMs = new Date(targetIso).getTime();
  // null hasta montar en el cliente, para no desfasar el HTML del servidor
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    setT(diff(targetMs));
    const id = setInterval(() => setT(diff(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const cells: [string, number | string][] = [
    ["Días", t ? t.dias : "—"],
    ["Horas", t ? t.horas : "—"],
    ["Min", t ? t.min : "—"],
    ["Seg", t ? t.seg : "—"],
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {cells.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-ink px-2 py-3 text-center text-white">
          <div className="text-2xl font-extrabold tabular-nums">{value}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
        </div>
      ))}
    </div>
  );
}
