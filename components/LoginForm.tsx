"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) return setError(data.error || "No se pudo iniciar sesión");
    router.push(data.data.role === "ADMIN" ? "/admin" : "/inicio");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
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
      </div>
      {error && <p className="pill-error">{error}</p>}
      <button disabled={loading} className="btn-primary w-full disabled:opacity-60">
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
      <p className="text-center text-sm text-gray-400">
        ¿No tienes cuenta? <Link href="/registro" className="font-semibold text-brand-400">Crear cuenta</Link>
      </p>
    </form>
  );
}
