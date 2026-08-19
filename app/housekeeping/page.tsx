import { createClient } from "@/lib/supabase/server";
import HousekeepingPanel from "@/components/HousekeepingPanel";
import type { HkRow } from "@/app/housekeeping/actions";

export default async function HousekeepingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Aviso mensaje="Inicia sesión para continuar." />;

  const { data: profile } = await supabase.from("users").select("id, active, role:roles(code)").eq("auth_uid", user.id).maybeSingle();
  const role = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || !["ADMIN", "GERENCIA", "RECEPCION", "CAMARISTA"].includes(role ?? "")) {
    return <Aviso mensaje="Esta sección es para el equipo de limpieza y recepción." />;
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: roomsData }, { data: camaristas }, { data: hk }, { data: reservas }] = await Promise.all([
    supabase.from("rooms").select("id, code, name").eq("active", true),
    supabase.from("users").select("id, full_name, role:roles(code)").eq("active", true),
    supabase.from("housekeeping").select("id, room_id, date, status, assigned_to, notes"),
    supabase.from("reservations").select("room_id, check_in, check_out, status, guest:guests(full_name), special_requests"),
  ]);

  const rooms = ((roomsData ?? []) as { id: string; code: string; name: string | null }[]).sort((a, b) => (parseInt(a.code.replace(/\D/g, ""), 10) || 0) - (parseInt(b.code.replace(/\D/g, ""), 10) || 0));
  const cams = ((camaristas ?? []) as { id: string; full_name: string; role: { code?: string } | null }[])
    .filter((u) => (u.role?.code ?? "") === "CAMARISTA")
    .map((u) => ({ id: u.id, full_name: u.full_name }));

  // fecha por defecto: hoy si tiene datos, si no la más reciente con limpieza
  const rowsHk = (hk ?? []) as HkRow[];
  const fechasHk = [...new Set(rowsHk.map((r) => r.date))].sort();
  const fecha = fechasHk.includes(today) || fechasHk.length === 0 ? today : fechasHk[fechasHk.length - 1];

  return (
    <HousekeepingPanel
      fecha={fecha}
      hoy={today}
      rooms={rooms}
      camaristas={cams}
      housekeeping={rowsHk}
      reservas={(reservas ?? []) as never}
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