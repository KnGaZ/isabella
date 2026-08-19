import { createClient } from "@/lib/supabase/server";
import AdminPanel from "@/components/AdminPanel";
import type { AdminAccountRow, AdminUserRow } from "@/app/admin/actions";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Aviso mensaje="Inicia sesión para continuar." />;

  const { data: profile } = await supabase
    .from("users").select("id, active, role:roles(code)").eq("auth_uid", user.id).maybeSingle();
  const roleCode = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || roleCode !== "ADMIN") return <Aviso mensaje="Esta sección es solo para administradores." />;

  const [{ data: usuarios }, { data: roles }, { data: cuentas }, { data: cmU }, { data: puU }] =
    await Promise.all([
      supabase.from("users").select("id, full_name, active, role:roles(code, name)").order("full_name"),
      supabase.from("roles").select("code, name").order("name"),
      supabase.from("accounts").select("id, name, kind, active").order("name"),
      supabase.from("cash_movements").select("user_id"),
      supabase.from("purchases").select("responsible_id"),
    ]);

  // Conteo de movimientos por usuario (para saber a quién se puede borrar)
  const counts: Record<string, number> = {};
  for (const r of (cmU ?? []) as { user_id: string | null }[]) if (r.user_id) counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
  for (const r of (puU ?? []) as { responsible_id: string | null }[]) if (r.responsible_id) counts[r.responsible_id] = (counts[r.responsible_id] ?? 0) + 1;

  return (
    <AdminPanel
      usuarios={(usuarios ?? []) as unknown as AdminUserRow[]}
      roles={(roles ?? []) as { code: string; name: string }[]}
      cuentas={(cuentas ?? []) as AdminAccountRow[]}
      movementCounts={counts}
      selfId={profile.id as string}
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