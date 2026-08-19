import { createClient } from "@/lib/supabase/server";
import { sortCajas } from "@/lib/catalogOrder";
import type { Caja } from "@/lib/types";
import ArqueoForm from "@/components/ArqueoForm";
import type { ArqueoRow } from "@/app/arqueo/actions";

export default async function ArqueoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <Aviso mensaje="No se pudo verificar tu sesión. Vuelve a iniciar sesión." />;

  const { data: profile } = await supabase
    .from("users")
    .select("id, active")
    .eq("auth_uid", user.id)
    .maybeSingle();
  if (!profile) return <Aviso mensaje="Tu usuario no está configurado en el sistema. Contacta al administrador." />;
  if (!profile.active) return <Aviso mensaje="Tu usuario está inactivo. Contacta al administrador." />;

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: cajasData }, { data: balances }, { data: recientes }] = await Promise.all([
    supabase.from("cajas").select("id, code, name, emoji").eq("active", true),
    supabase.from("v_cash_balance").select("caja_id, currency, balance"),
    supabase
      .from("cash_counts")
      .select("id, date, caja_id, currency, counted_amount, system_amount, difference, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const cajas = sortCajas((cajasData ?? []) as Caja[]);

  return (
    <ArqueoForm
      cajas={cajas.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji ?? null }))}
      balances={(balances ?? []) as { caja_id: string; currency: "MXN" | "USD"; balance: number }[]}
      arqueosRecientes={(recientes ?? []) as ArqueoRow[]}
      fechaHoy={today}
    />
  );
}

function Aviso({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="max-w-sm rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted shadow-[0_6px_22px_rgba(11,43,48,0.06)]">
        {mensaje}
      </div>
    </div>
  );
}