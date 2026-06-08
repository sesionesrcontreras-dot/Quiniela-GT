"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetResultForm({
  matchId,
  homeTeam,
  awayTeam,
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
}) {
  const router = useRouter();
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (home === "" || away === "") return setError("Marcador incompleto");
    setError("");
    setLoading(true);
    const res = await fetch(`/api/admin/matches/${matchId}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: Number(home), awayScore: Number(away) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) return setError(data.error || "Error");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-right text-sm">{homeTeam}</span>
      <input type="number" min={0} value={home} onChange={(e) => setHome(e.target.value)} className="w-12 rounded border border-gray-300 px-1 py-0.5 text-center" />
      <span className="text-gray-400">-</span>
      <input type="number" min={0} value={away} onChange={(e) => setAway(e.target.value)} className="w-12 rounded border border-gray-300 px-1 py-0.5 text-center" />
      <span className="flex-1 text-sm">{awayTeam}</span>
      <button onClick={save} disabled={loading} className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
        {loading ? "..." : "Guardar"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
