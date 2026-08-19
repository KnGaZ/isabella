import { createClient } from "@/lib/supabase/server";
import ReservasPanel from "@/components/ReservasPanel";
import type { ReservationRow } from "@/app/reservas/actions";

export default async function ReservasPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Aviso mensaje="Inicia sesión para continuar." />;

  const { data: profile } = await supabase.from("users").select("id, active, role:roles(code)").eq("auth_uid", user.id).maybeSingle();
  const role = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || !["ADMIN", "GERENCIA", "RECEPCION"].includes(role ?? "")) {
    return <Aviso mensaje="Esta sección es para recepción y gerencia." />;
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: roomsData }, { data: channels }, { data: reservas }] = await Promise.all([
    supabase.from("rooms").select("id, code, name").eq("active", true),
    supabase.from("channels").select("id, code, name").eq("active", true).order("name"),
    supabase.from("reservations").select("*, guest:guests(full_name, phone)").order("check_in", { ascending: true }),
  ]);

  // Orden natural de habitaciones (i 1, i 2, ... i 20)
  const rooms = ((roomsData ?? []) as { id: string; code: string; name: string | null }[]).sort((a, b) => {
    const na = parseInt(a.code.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.code.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });

  return (
    <ReservasPanel
      fecha={today}
      rooms={rooms}
      channels={(channels ?? []) as { id: string; code: string; name: string }[]}
      reservasIniciales={(reservas ?? []) as ReservationRow[]}
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