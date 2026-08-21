import { createClient } from "@/lib/supabase/server";
import { sortCajas } from "@/lib/catalogOrder";
import type { Caja } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
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
  const windowStart = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

  const [{ data: cajasData }, { data: bal }, { data: dt }, { data: dbc }, { data: counts }, { data: dba }, { data: pur }, { data: areasData }] =
    await Promise.all([
      supabase.from("cajas").select("id, code, name, emoji").eq("active", true),
      supabase.from("v_cash_balance").select("caja_id, currency, balance"),
      supabase.from("v_daily_totals").select("date, ingresos, egresos").gte("date", windowStart).order("date"),
      supabase.from("v_daily_by_caja").select("date, caja_id, ingresos, egresos").gte("date", windowStart),
      supabase.from("cash_counts").select("difference").eq("date", today),
      supabase.from("v_daily_by_area").select("date, area_id, ingresos, egresos").gte("date", windowStart),
      supabase.from("purchases").select("date, area_id, amount, cash_movement_id").gte("date", windowStart),
      supabase.from("areas").select("id, name").eq("active", true),
    ]);

  const cajas = sortCajas((cajasData ?? []) as Caja[]);
  const descuadre =
    counts && counts.length > 0
      ? counts.reduce((s: number, r: { difference: number | null }) => s + Number(r.difference ?? 0), 0)
      : null;

  return (
    <Dashboard
      fecha={today}
      cajas={cajas.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji ?? null }))}
      balances={(bal ?? []) as { caja_id: string; currency: "MXN" | "USD"; balance: number }[]}
      dailyTotals={(dt ?? []) as { date: string; ingresos: number; egresos: number }[]}
      dailyByCaja={(dbc ?? []) as { date: string; caja_id: string; ingresos: number; egresos: number }[]}
      dailyByArea={(dba ?? []) as { date: string; area_id: string; ingresos: number; egresos: number }[]}
      purchases={(pur ?? []) as { date: string; area_id: string | null; amount: number; cash_movement_id: string | null }[]}
      areas={(areasData ?? []) as { id: string; name: string }[]}
      descuadre={descuadre}
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