"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChampionPick from "./ChampionPick";
import PredictionForm, { MatchRow } from "./PredictionForm";
import { formatGTQ } from "@/lib/money";

export interface BoletoData {
  id: string;
  championPick: string | null;
  matches: MatchRow[];
}

/**
 * Panel de los boletos del jugador en una quiniela. Permite tener VARIOS
 * boletos (cada uno con su propio campeón y predicciones), cambiar entre
 * ellos por pestañas y comprar otro boleto sin salir de la página.
 */
export default function MyBoletos({
  boletos,
  teams,
  championEditable,
  bonusPoints,
  poolId,
  isPronostico,
  entryFeeCents,
  maxEntries,
}: {
  boletos: BoletoData[];
  teams: string[];
  championEditable: boolean;
  bonusPoints: number;
  poolId: string;
  isPronostico: boolean;
  entryFeeCents: number;
  maxEntries: number;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(boletos[0]?.id ?? "");
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");

  // Si el boleto activo ya no existe (tras refrescar), usa el primero.
  const active = boletos.find((b) => b.id === activeId) ?? boletos[0];

  async function buyAnother() {
    setError("");
    setBuying(true);
    const res = await fetch(`/api/pools/${poolId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json();
    setBuying(false);
    if (!data.ok) {
      if ((data.error || "").toLowerCase().includes("saldo")) {
        setError("Saldo insuficiente. Recarga en tu billetera para comprar otro boleto.");
      } else {
        setError(data.error || "No se pudo comprar otro boleto");
      }
      return;
    }
    if (data.data?.entryId) setActiveId(data.data.entryId);
    router.refresh();
  }

  if (!active) return null;
  const canBuyMore = boletos.length < maxEntries;
  const label = isPronostico ? "Pronóstico" : "Boleto";

  return (
    <div className="space-y-6">
      {/* Pestañas de boletos + comprar otro */}
      <div className="flex flex-wrap items-center gap-2">
        {boletos.map((b, i) => (
          <button
            key={b.id}
            onClick={() => setActiveId(b.id)}
            className={
              "rounded-lg px-4 py-2 text-sm font-bold transition " +
              (b.id === active.id
                ? "bg-brand-600 text-white"
                : "border border-white/15 text-gray-300 hover:border-brand-400")
            }
          >
            {label} {i + 1}
          </button>
        ))}
        {canBuyMore && (
          <button
            onClick={buyAnother}
            disabled={buying}
            className="rounded-lg border border-gold-600/60 px-4 py-2 text-sm font-bold text-gold-300 hover:bg-gold-400/10 disabled:opacity-60"
          >
            {buying ? "Comprando..." : `+ Comprar otro (${formatGTQ(entryFeeCents)})`}
          </button>
        )}
      </div>
      {error && <p className="pill-error">{error}</p>}

      {/* Campeón (solo quinielas de torneo) */}
      {!isPronostico && (
        <ChampionPick
          key={`champ-${active.id}`}
          entryId={active.id}
          teams={teams}
          current={active.championPick}
          locked={!championEditable}
          bonusPoints={bonusPoints}
        />
      )}

      {/* Predicciones del boleto activo */}
      <div>
        <h2 className="mb-3 text-lg font-bold">
          Tus predicciones {boletos.length > 1 ? `· ${label} ${boletos.findIndex((b) => b.id === active.id) + 1}` : ""}
        </h2>
        <PredictionForm key={`pred-${active.id}`} entryId={active.id} matches={active.matches} />
      </div>
    </div>
  );
}
