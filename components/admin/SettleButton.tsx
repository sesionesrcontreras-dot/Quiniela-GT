"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettleButton({ poolId }: { poolId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function settle() {
    if (
      !confirm(
        "LIQUIDAR es IRREVERSIBLE: reparte el pozo a los ganadores y cierra la quiniela.\n\n" +
          "Hazlo SOLO cuando ya cargaste el resultado de TODOS los partidos.\n\n¿Continuar?"
      )
    )
      return;
    setLoading(true);
    const res = await fetch(`/api/admin/pools/${poolId}/settle`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    setMsg(data.ok ? "Liquidada ✓" : data.error || "Error");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={settle} disabled={loading} className="rounded-lg border border-gold-600/60 px-3 py-1 text-xs font-semibold text-gold-300 hover:bg-gold-400/10 disabled:opacity-60">
        {loading ? "..." : "Liquidar"}
      </button>
      {msg && <span className="text-xs text-gray-400">{msg}</span>}
    </div>
  );
}
