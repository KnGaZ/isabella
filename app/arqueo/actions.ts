"use server";

import { createClient } from "@/lib/supabase/server";

export type ArqueoRow = {
  id: string;
  date: string;
  caja_id: string;
  currency: "MXN" | "USD";
  counted_amount: number;
  system_amount: number | null;
  difference: number;
  notes: string | null;
  created_at: string;
};

export type RegistrarArqueoInput = {
  cajaId: string;
  currency: "MXN" | "USD";
  counted: number;
  date: string;
  notes: string;
};

export type RegistrarArqueoResult =
  | { ok: true; arqueo: ArqueoRow }
  | { ok: false; error: string };

export async function registrarArqueo(input: RegistrarArqueoInput): Promise<RegistrarArqueoResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };

  const { data: profile } = await supabase
    .from("users")
    .select("id, active")
    .eq("auth_uid", user.id)
    .maybeSingle();
  if (!profile) return { ok: false, error: "Tu usuario no está configurado en el sistema." };
  if (!profile.active) return { ok: false, error: "Tu usuario está inactivo." };

  if (!input.cajaId) return { ok: false, error: "Selecciona la caja." };
  const counted = Number(input.counted);
  if (!Number.isFinite(counted) || counted < 0) return { ok: false, error: "El monto contado no es válido." };

  // El saldo del sistema se calcula AQUÍ (no se confía en el cliente).
  const { data: balRow } = await supabase
    .from("v_cash_balance")
    .select("balance")
    .eq("caja_id", input.cajaId)
    .eq("currency", input.currency)
    .maybeSingle();
  const system = Number(balRow?.balance ?? 0);

  const { data, error } = await supabase
    .from("cash_counts")
    .insert({
      date: input.date,
      caja_id: input.cajaId,
      currency: input.currency,
      counted_amount: counted,
      system_amount: system,
      user_id: profile.id,
      notes: input.notes.trim() || null,
    })
    .select("id, date, caja_id, currency, counted_amount, system_amount, difference, notes, created_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo guardar el arqueo." };
  return { ok: true, arqueo: data as ArqueoRow };
}