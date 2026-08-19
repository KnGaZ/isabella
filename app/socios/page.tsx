import { createClient } from "@/lib/supabase/server";
import SociosPanel from "@/components/SociosPanel";

export default async function SociosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Aviso mensaje="Inicia sesión para continuar." />;

  const { data: profile } = await supabase
    .from("users").select("id, active, role:roles(code)").eq("auth_uid", user.id).maybeSingle();
  const role = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || !(role === "ADMIN" || role === "GERENCIA" || role === "SOCIO")) {
    return <Aviso mensaje="Esta sección es solo para socios y gerencia." />;
  }
  const canEdit = role === "ADMIN" || role === "GERENCIA";

  const [{ data: partners }, { data: pts }, { data: dt }, { data: purch }] = await Promise.all([
    supabase.from("partners").select("id, name, share_pct").eq("active", true).order("name"),
    supabase.from("partner_transactions").select("id, partner_id, type, amount, date, notes"),
    supabase.from("v_daily_totals").select("ingresos, egresos"),
    supabase.from("purchases").select("amount, cash_movement_id"),
  ]);

  const ingresos = (dt ?? []).reduce((s: number, r: { ingresos: number }) => s + Number(r.ingresos), 0);
  const egresosCaja = (dt ?? []).reduce((s: number, r: { egresos: number }) => s + Number(r.egresos), 0);
  const compras = (purch ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
  const comprasLinked = (purch ?? []).reduce(
    (s: number, r: { amount: number; cash_movement_id: string | null }) => s + (r.cash_movement_id ? Number(r.amount) : 0), 0);
  const otrosEgresos = egresosCaja - comprasLinked;
  const utilidad = ingresos - compras - otrosEgresos;

  return (
    <SociosPanel
      partners={(partners ?? []) as { id: string; name: string; share_pct: number }[]}
      transacciones={(pts ?? []) as { id: string; partner_id: string; type: string; amount: number; date: string; notes: string | null }[]}
      pnl={{ ingresos, compras, otrosEgresos, utilidad }}
      canEdit={canEdit}
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