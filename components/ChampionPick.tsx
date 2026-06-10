"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChampionPick({
  entryId,
  teams,
  current,
  locked,
  bonusPoints,
}: {
  entryId: string;
  teams: string[];
  current: string | null;
  locked: boolean;
  bonusPoints: number;
}) {
  const router = useRouter();
  const [team, setTeam] = useState(current ?? "");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    setError("");
    setMsg("");
    if (!team) return setError("Elige un equipo");
    setLoading(true);
    const res = await fetch(`/api/entries/${entryId}/champion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) return setError(data.error || "No se pudo guardar");
    setMsg(`Tu campeón: ${data.data.championPick} 🏆`);
    router.refresh();
  }

  if (locked) {
    return (
      <div className="card border-gold-600/40">
        <h3 className="font-bold text-gold-300">🏆 Tu campeón del Mundial</h3>
        <p className="mt-2 text-sm text-gray-300">
          {current
            ? `Elegiste a ${current}. Si sale campeón, ganas +${bonusPoints} puntos.`
            : "El torneo ya arrancó: la elección de campeón está cerrada."}
        </p>
      </div>
    );
  }

  return (
    <div className="card border-gold-600/40">
      <h3 className="font-bold text-gold-300">🏆 ¿Quién será el campeón?</h3>
      <p className="mt-1 text-sm text-gray-300">
        Predicción general del boleto: si tu equipo levanta la copa, sumas{" "}
        <span className="font-bold text-gold-300">+{bonusPoints} puntos</span>.
        Puedes cambiarla hasta que arranque el Mundial.
      </p>
      <div className="mt-3 flex gap-2">
        <select
          className="field text-sm"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        >
          <option value="">— Elige tu campeón —</option>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button onClick={save} disabled={loading} className="btn-gold text-sm disabled:opacity-60">
          {loading ? "..." : "Guardar"}
        </button>
      </div>
      {error && <p className="pill-error mt-2">{error}</p>}
      {msg && <p className="pill-ok mt-2">{msg}</p>}
    </div>
  );
}
