"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(decision: "CONFIRM" | "REJECT") {
    setLoading(true);
    await fetch("/api/admin/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, decision }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={loading}
        onClick={() => act("CONFIRM")}
        className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        Confirmar
      </button>
      <button
        disabled={loading}
        onClick={() => act("REJECT")}
        className="rounded-lg border border-white/20 px-3 py-1 text-xs font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-60"
      >
        Rechazar
      </button>
    </div>
  );
}
