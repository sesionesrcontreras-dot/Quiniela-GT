"use client";

import { useEffect, useState } from "react";

const fmt = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  minimumFractionDigits: 2,
});

/** Marcador del pozo: cuenta desde 0 hasta el total, estilo tablero. */
export default function PotTicker({ cents }: { cents: number }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(cents);
      return;
    }
    const dur = 1600;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(cents * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cents]);

  return <span className="scoreboard-digits">{fmt.format(val / 100)}</span>;
}
