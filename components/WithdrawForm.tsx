"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawForm({ maxQuetzales }: { maxQuetzales: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(Math.min(100, Math.floor(maxQuetzales)));
  const [bankInfo, setBankInfo] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountQuetzales: Number(amount), bankInfo }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) return setError(data.error || "No se pudo crear la solicitud");
    setMsg(data.data.instructions);
    setBankInfo("");
    router.refresh();
  }

  if (maxQuetzales < 1) {
    return (
      <div className="card text-sm text-gray-300">
        <h3 className="font-bold text-cream">Retirar dinero</h3>
        <p className="mt-2">Cuando tengas saldo o premios, aquí podrás retirarlos a tu cuenta bancaria.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h3 className="font-bold">Retirar dinero</h3>
      <div>
        <label className="label">Monto (Q) — disponible: Q{maxQuetzales.toFixed(2)}</label>
        <input
          type="number"
          min={1}
          max={Math.floor(maxQuetzales)}
          className="field mt-1"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          required
        />
      </div>
      <div>
        <label className="label">Banco, número de cuenta y nombre del titular</label>
        <textarea
          className="field mt-1"
          rows={2}
          value={bankInfo}
          onChange={(e) => setBankInfo(e.target.value)}
          placeholder="Ej. Banrural, ahorro 1234567890, Juan Pérez"
          required
        />
      </div>
      {error && <p className="pill-error">{error}</p>}
      {msg && <p className="pill-ok">{msg}</p>}
      <button disabled={loading} className="btn-night w-full disabled:opacity-60">
        {loading ? "Enviando..." : "Solicitar retiro"}
      </button>
      <p className="text-xs text-gray-400">
        La cuenta debe estar a tu nombre. Procesamos retiros en horario bancario.
      </p>
    </form>
  );
}
