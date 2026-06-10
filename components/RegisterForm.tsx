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
        <label className="label">Nombre completo</label>
        <input
          className="field mt-1"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="label">Correo</label>
        <input
          type="email"
          className="field mt-1"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="label">Contraseña</label>
        <input
          type="password"
          className="field mt-1"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <p className="mt-1 text-xs text-gray-400">Mínimo 8 caracteres, con letras y números.</p>
      </div>
      <label className="flex items-start gap-2 text-sm text-gray-300">
        <input type="checkbox" required className="mt-1 h-4 w-4 accent-brand-500" />
        <span>
          Soy mayor de 18 años y acepto los{" "}
          <Link href="/terminos" target="_blank" className="font-semibold text-gold-300 underline">
            Términos y Condiciones
          </Link>{" "}
          del servicio.
        </span>
      </label>
      {error && <p className="pill-error">{error}</p>}
      <button disabled={loading} className="btn-primary w-full disabled:opacity-60">
        {loading ? "Creando..." : "Crear cuenta"}
      </button>
      <p className="text-center text-sm text-gray-400">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-brand-400">Ingresar</Link>
      </p>
    </form>
  );
}
