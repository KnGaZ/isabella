import { createClient } from "@/lib/supabase/server";
import CatalogosPanel from "@/components/CatalogosPanel";

export default async function CatalogosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Aviso mensaje="Inicia sesión para continuar." />;

  const { data: profile } = await supabase
    .from("users").select("id, active, role:roles(code)").eq("auth_uid", user.id).maybeSingle();
  const role = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || role !== "ADMIN") return <Aviso mensaje="Esta sección es solo para administradores." />;

  const [{ data: cajas }, { data: areas }, { data: channels }, { data: suppliers }, { data: partners }] =
    await Promise.all([
      supabase.from("cajas").select("id, name, emoji, active, code").order("name"),
      supabase.from("areas").select("id, name, active, code").order("name"),
      supabase.from("channels").select("id, name, active, code").order("name"),
      supabase.from("suppliers").select("id, name, notes, active").order("name"),
      supabase.from("partners").select("id, name, share_pct, active").order("name"),
    ]);

  return (
    <CatalogosPanel
      cajas={(cajas ?? []) as never}
      areas={(areas ?? []) as never}
      channels={(channels ?? []) as never}
      suppliers={(suppliers ?? []) as never}
      partners={(partners ?? []) as never}
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