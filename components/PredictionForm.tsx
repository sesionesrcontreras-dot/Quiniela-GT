"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface MatchRow {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffLabel: string;
  stage: string;
  locked: boolean;
  result: string | null; // "2 - 1" si finalizó
  predHome: number | "";
  predAway: number | "";
  pointsAwarded?: number;
}

export default function PredictionForm({ entryId, matches }: { entryId: string; matches: MatchRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(matches);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function setVal(id: string, field: "predHome" | "predAway", v: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: v === "" ? "" : Math.max(0, Number(v)) } : r)));
  }

  async function save() {
    setError("");
    setMsg("");
    setLoading(true);
    const predictions = rows
      .filter((r) => !r.locked && r.predHome !== "" && r.predAway !== "")
      .map((r) => ({ matchId: r.id, predHome: Number(r.predHome), predAway: Number(r.predAway) }));

    if (predictions.length === 0) {
      setLoading(false);
      return setError("Completa al menos un marcador de un partido abierto.");
    }
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, predictions }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) return setError(data.error || "No se pudo guardar");
    setMsg(`Guardado: ${data.data.saved} predicción(es).`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {rows.map((m) => (
        <div
          key={m.id}
          className={"rounded-xl border border-white/10 p-3 " + (m.locked ? "bg-white/5 opacity-80" : "bg-night-800")}
        >
          <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
            <span>{m.stage}</span>
            <span>{m.kickoffLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-right font-semibold">{m.homeTeam}</span>
            <input
              type="number"
              min={0}
              max={30}
              disabled={m.locked}
              value={m.predHome}
              onChange={(e) => setVal(m.id, "predHome", e.target.value)}
              className="w-14 rounded-lg border border-white/15 bg-night-950 px-2 py-1 text-center text-cream disabled:opacity-50"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              min={0}
              max={30}
              disabled={m.locked}
              value={m.predAway}
              onChange={(e) => setVal(m.id, "predAway", e.target.value)}
              className="w-14 rounded-lg border border-white/15 bg-night-950 px-2 py-1 text-center text-cream disabled:opacity-50"
            />
            <span className="flex-1 font-semibold">{m.awayTeam}</span>
          </div>
          {m.locked && (
            <div className="mt-2 text-center text-xs">
              {m.result ? (
                <span className="font-semibold text-gold-300">
                  Resultado: {m.result}
                  {m.pointsAwarded != null && ` · +${m.pointsAwarded} pts`}
                </span>
              ) : (
                <span className="text-gray-500">Cerrado (ya inició)</span>
              )}
            </div>
          )}
        </div>
      ))}

      {error && <p className="pill-error">{error}</p>}
      {msg && <p className="pill-ok">{msg}</p>}
      <button disabled={loading} onClick={save} className="btn-primary w-full disabled:opacity-60">
        {loading ? "Guardando..." : "Guardar predicciones"}
      </button>
    </div>
  );
}
