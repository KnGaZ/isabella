import { createClient } from "@/lib/supabase/server";
import { sortAreas, sortCajas } from "@/lib/catalogOrder";
import type { Area, Caja } from "@/lib/types";
import GastosForm from "@/components/GastosForm";
import type { PurchaseRow } from "@/app/gastos/actions";

export default async function GastosPage() {
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

  const [{ data: areasData }, { data: cajasData }, { data: accountsData }, { data: suppliersData }, { data: comprasData }] =
    await Promise.all([
      supabase.from("areas").select("id, code, name").eq("active", true),
      supabase.from("cajas").select("id, code, name, emoji").eq("active", true),
      supabase.from("accounts").select("id, name").eq("active", true).order("name"),
      supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
      supabase
        .from("purchases")
        .select("id, date, concept, amount, area_id, supplier_id, account_id, payment_method, status, invoice_folio, cash_movement_id, created_at")
        .eq("date", today)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const areas = sortAreas((areasData ?? []) as Area[]);
  const cajas = sortCajas((cajasData ?? []) as Caja[]);

  return (
    <GastosForm
      areas={areas.map((a) => ({ id: a.id, name: a.name }))}
      cajas={cajas.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji ?? null }))}
      accounts={(accountsData ?? []) as { id: string; name: string }[]}
      suppliers={(suppliersData ?? []) as { id: string; name: string }[]}
      comprasIniciales={(comprasData ?? []) as PurchaseRow[]}
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