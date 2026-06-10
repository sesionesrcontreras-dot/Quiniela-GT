"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const METHODS = [
  { value: "BANK_TRANSFER", label: "🏦 Transferencia bancaria" },
  { value: "CARD_PAGGO", label: "💳 Tarjeta (Paggo)" },
  { value: "CASH_AGENCY", label: "🏪 Efectivo en agencia" },
];

export default function RechargeForm() {
  const router = useRouter();
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Pago con tarjeta pendiente de verificar contra Paggo
  const [pendingCard, setPendingCard] = useState<{ paymentId: string; payUrl: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mientras hay un pago con tarjeta pendiente, verificamos solos cada 6s
  // (hasta 10 min): el cliente paga en Paggo y al volver ya tiene su saldo.
  useEffect(() => {
    if (!pendingCard) return;
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > 10 * 60_000) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      try {
        const res = await fetch(`/api/payments/${pendingCard.paymentId}/verify`, { method: "POST" });
        const data = await res.json();
        if (data.ok && data.data.status === "CONFIRMED") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPendingCard(null);
          setMsg("✅ Pago confirmado. Tu saldo ya fue acreditado.");
          router.refresh();
        } else if (data.ok && data.data.status === "REJECTED") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPendingCard(null);
          setError("El link de pago fue cancelado. Crea una nueva recarga.");
        }
      } catch {
        // red intermitente: el siguiente intento lo cubre
      }
    }, 6000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pendingCard, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountQuetzales: Number(amount), method, reference: reference || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) return setError(data.error || "No se pudo crear la solicitud");

    if (data.data.payUrl) {
      // Tarjeta via Paggo: abrir el link de pago y esperar verificacion.
      setPendingCard({ paymentId: data.data.paymentId, payUrl: data.data.payUrl });
      window.open(data.data.payUrl, "_blank", "noopener");
      setMsg(data.data.instructions);
    } else {
      setMsg(data.data.instructions + " (Tu saldo se acreditará cuando el admin confirme el pago.)");
    }
    setReference("");
    router.refresh();
  }

  async function verifyCard() {
    if (!pendingCard) return;
    setError("");
    setVerifying(true);
    const res = await fetch(`/api/payments/${pendingCard.paymentId}/verify`, { method: "POST" });
    const data = await res.json();
    setVerifying(false);
    if (!data.ok) return setError(data.error || "No se pudo verificar");
    if (data.data.status === "CONFIRMED") {
      setPendingCard(null);
      setMsg("✅ Pago confirmado. Tu saldo ya fue acreditado.");
      router.refresh();
    } else if (data.data.status === "REJECTED") {
      setPendingCard(null);
      setError("El link de pago fue cancelado. Crea una nueva recarga.");
    } else {
      setMsg("Paggo aún no reporta tu pago. Si ya pagaste, espera unos segundos y vuelve a verificar.");
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h3 className="font-bold">Recargar saldo</h3>
      <div>
        <label className="label">Monto (Q)</label>
        <input
          type="number"
          min={1}
          className="field mt-1"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          required
        />
      </div>
      <div>
        <label className="label">Método de pago</label>
        <select
          className="field mt-1"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      {method !== "CARD_PAGGO" && (
        <div>
          <label className="label">Referencia / No. de boleta (opcional)</label>
          <input
            className="field mt-1"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ej. No. de transferencia"
          />
        </div>
      )}
      {error && <p className="pill-error">{error}</p>}
      {msg && <p className="pill-ok">{msg}</p>}

      {pendingCard ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={verifyCard}
            disabled={verifying}
            className="btn-primary w-full disabled:opacity-60"
          >
            {verifying ? "Verificando con Paggo..." : "Ya pagué — verificar ahora"}
          </button>
          <a
            href={pendingCard.payUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost w-full"
          >
            Reabrir página de pago
          </a>
        </div>
      ) : (
        <button disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? "Enviando..." : "Solicitar recarga"}
        </button>
      )}
    </form>
  );
}
