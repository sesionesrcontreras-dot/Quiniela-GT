"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettleButton({ poolId }: { poolId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function settle() {
    if (!confirm("¿Liquidar esta quiniela y repartir el pozo a los ganadores?")) return;
    setLoading(true);
    const res = await fetch(`/api/admin/pools/${poolId}/settle`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    setMsg(data.ok ? "Liquidada ✓" : data.error || "Error");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={settle} disabled={loading} className="rounded-lg border border-brand-600 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60">
        {loading ? "..." : "Liquidar"}
      </button>
      {msg && <span className="text-xs text-gray-500">{msg}</span>}
    </div>
  );
}
