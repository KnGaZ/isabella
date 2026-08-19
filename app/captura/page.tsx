import { createClient } from "@/lib/supabase/server";
import { sortAreas, sortCajas } from "@/lib/catalogOrder";
import type { Area, Caja, CashMovementRow, UserProfile } from "@/lib/types";
import CapturaRapida from "@/components/CapturaRapida";

export default async function CapturaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <EstadoVacio mensaje="No se pudo verificar tu sesión. Vuelve a iniciar sesión." />
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, active")
    .eq("auth_uid", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <EstadoVacio mensaje="Tu usuario no está configurado en el sistema. Pide al administrador que te dé de alta en la tabla users con tu correo de acceso." />
    );
  }

  if (!profile.active) {
    return <EstadoVacio mensaje="Tu usuario está inactivo. Contacta al administrador." />;
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: cajasData }, { data: areasData }, { data: movsData }, exchangeRate] =
    await Promise.all([
      supabase.from("cajas").select("id, code, name, emoji").eq("active", true),
      supabase.from("areas").select("id, code, name").eq("active", true),
      supabase
        .from("cash_movements")
        .select(
          "id, folio, date, type, caja_id, area_id, concept, amount, currency, tender, exchange_rate, amount_mxn, created_at"
        )
        .eq("date", today)
        .order("created_at", { ascending: false })
        .limit(30),
      fetchTipoDeCambioHoy(supabase, today),
    ]);

  const cajas = sortCajas((cajasData ?? []) as Caja[]);
  const areas = sortAreas((areasData ?? []) as Area[]);
  const movimientosHoy = (movsData ?? []) as CashMovementRow[];

  return (
    <CapturaRapida
      responsable={profile as UserProfile}
      cajas={cajas}
      areas={areas}
      movimientosIniciales={movimientosHoy}
      tipoDeCambioHoy={exchangeRate}
      fechaHoy={today}
    />
  );
}

async function fetchTipoDeCambioHoy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  today: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate")
    .lte("date", today)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Si la migración de exchange_rates aún no se aplicó, seguimos sin
  // autollenado (el campo queda editable a mano) en vez de tronar la página.
  if (error || !data) return null;
  return Number(data.rate);
}

function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="max-w-sm rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted shadow-[0_6px_22px_rgba(11,43,48,0.06)]">
        {mensaje}
      </div>
    </div>
  );
}
