"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : signInError.message
      );
      setLoading(false);
      return;
    }

    const next = searchParams.get("next") || "/captura";
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-2xl font-extrabold tracking-tight text-ink">
            Isabella <span className="text-teal">·</span> Bacalar
          </div>
          <div className="mt-1 text-sm text-muted">Acceso al sistema de caja</div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-[20px] border border-line bg-card p-6 shadow-[0_6px_22px_rgba(11,43,48,0.06)]"
        >
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            Correo
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@isabellabacalar.com"
            className="mb-4 w-full rounded-xl border-[1.5px] border-line bg-card px-3.5 py-3 text-[15px] text-ink outline-none transition-colors focus:border-teal focus:ring-4 focus:ring-teal/15"
          />

          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            Contraseña
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mb-1 w-full rounded-xl border-[1.5px] border-line bg-card px-3.5 py-3 text-[15px] text-ink outline-none transition-colors focus:border-teal focus:ring-4 focus:ring-teal/15"
          />

          {error && (
            <div className="mt-3 rounded-xl bg-out-soft px-3.5 py-2.5 text-sm font-medium text-out">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-[15px] bg-teal py-3.5 text-[15px] font-bold text-white shadow-[0_8px_18px_rgba(14,140,140,0.28)] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
