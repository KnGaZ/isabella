import { createClient } from "@/lib/supabase/server";
import { sortCajas, sortAreas } from "@/lib/catalogOrder";
import type { Caja, Area } from "@/lib/types";
import MovimientosPanel from "@/components/MovimientosPanel";

export default async function MovimientosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Aviso mensaje="Inicia sesión para continuar." />;

  const { data: profile } = await supabase.from("users").select("id, active, role:roles(code)").eq("auth_uid", user.id).maybeSingle();
  const role = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || !["ADMIN", "GERENCIA", "RECEPCION"].includes(role ?? "")) {
    return <Aviso mensaje="Esta sección es para recepción y gerencia." />;
  }

  const [{ data: movs }, { data: cajasData }, { data: areasData }] = await Promise.all([
    supabase.from("cash_movements")
      .select("id, folio, date, type, caja_id, area_id, concept, amount, currency, tender")
      .order("date", { ascending: false }).order("folio", { ascending: false }).limit(1000),
    supabase.from("cajas").select("id, code, name, emoji").eq("active", true),
    supabase.from("areas").select("id, code, name").eq("active", true),
  ]);

  const cajas = sortCajas((cajasData ?? []) as Caja[]);
  const areas = sortAreas((areasData ?? []) as Area[]);

  return (
    <MovimientosPanel
      movimientos={(movs ?? []) as never}
      cajas={cajas.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji ?? null }))}
      areas={areas.map((a) => ({ id: a.id, name: a.name }))}
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