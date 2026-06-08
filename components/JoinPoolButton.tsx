"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinPoolButton({
  poolId,
  requiresCode,
  entryFeeCents,
}: {
  poolId: string;
  requiresCode: boolean;
  entryFeeCents: number;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [needFunds, setNeedFunds] = useState(false);
  const [loading, setLoading] = useState(false);

  async function join() {
    setError("");
    setNeedFunds(false);
    setLoading(true);
    const res = await fetch(`/api/pools/${poolId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: code || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      if ((data.error || "").toLowerCase().includes("saldo")) setNeedFunds(true);
      return setError(data.error || "No se pudo inscribir");
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {requiresCode && (
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="Código de invitación"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      )}
      <button disabled={loading} onClick={join} className="btn-primary w-full disabled:opacity-60">
        {loading ? "Procesando..." : entryFeeCents > 0 ? "Participar (se cobra de tu saldo)" : "Participar gratis"}
      </button>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {needFunds && (
        <Link href="/billetera" className="block text-center text-sm font-semibold text-brand-700">
          → Recargar saldo
        </Link>
      )}
    </div>
  );
}
