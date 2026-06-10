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
      <div className="card text-sm text-gray-600">
        <h3 className="font-bold text-ink">Retirar dinero</h3>
        <p className="mt-2">Cuando tengas saldo o premios, aquí podrás retirarlos a tu cuenta bancaria.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h3 className="font-bold">Retirar dinero</h3>
      <div>
        <label className="text-sm font-semibold">Monto (Q) — disponible: Q{maxQuetzales.toFixed(2)}</label>
        <input
          type="number"
          min={1}
          max={Math.floor(maxQuetzales)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          required
        />
      </div>
      <div>
        <label className="text-sm font-semibold">Banco, número de cuenta y nombre del titular</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          rows={2}
          value={bankInfo}
          onChange={(e) => setBankInfo(e.target.value)}
          placeholder="Ej. Banrural, ahorro 1234567890, Juan Pérez"
          required
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {msg && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{msg}</p>}
      <button disabled={loading} className="btn-ghost w-full disabled:opacity-60">
        {loading ? "Enviando..." : "Solicitar retiro"}
      </button>
      <p className="text-xs text-gray-500">
        La cuenta debe estar a tu nombre. Procesamos retiros en horario bancario.
      </p>
    </form>
  );
}
