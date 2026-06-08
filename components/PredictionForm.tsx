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
          className={"rounded-xl border p-3 " + (m.locked ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white")}
        >
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
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
              className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-center disabled:bg-gray-100"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              min={0}
              max={30}
              disabled={m.locked}
              value={m.predAway}
              onChange={(e) => setVal(m.id, "predAway", e.target.value)}
              className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-center disabled:bg-gray-100"
            />
            <span className="flex-1 font-semibold">{m.awayTeam}</span>
          </div>
          {m.locked && (
            <div className="mt-2 text-center text-xs">
              {m.result ? (
                <span className="font-semibold text-ink">
                  Resultado: {m.result}
                  {m.pointsAwarded != null && ` · +${m.pointsAwarded} pts`}
                </span>
              ) : (
                <span className="text-gray-400">Cerrado (ya inició)</span>
              )}
            </div>
          )}
        </div>
      ))}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {msg && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{msg}</p>}
      <button disabled={loading} onClick={save} className="btn-primary w-full disabled:opacity-60">
        {loading ? "Guardando..." : "Guardar predicciones"}
      </button>
    </div>
  );
}
