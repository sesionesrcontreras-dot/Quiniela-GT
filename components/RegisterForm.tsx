"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) return setError(data.error || "No se pudo crear la cuenta");
    router.push("/inicio");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="text-sm font-semibold">Nombre completo</label>
        <input
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-semibold">Correo</label>
        <input
          type="email"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-semibold">Contraseña</label>
        <input
          type="password"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <p className="mt-1 text-xs text-gray-500">Mínimo 8 caracteres, con letras y números.</p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="btn-primary w-full disabled:opacity-60">
        {loading ? "Creando..." : "Crear cuenta"}
      </button>
      <p className="text-center text-sm text-gray-500">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-brand-700">Ingresar</Link>
      </p>
    </form>
  );
}
