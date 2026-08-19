"use server";

import { createClient } from "@/lib/supabase/server";
import type { CashMovementRow, CurrencyCode, MovementType, TenderType } from "@/lib/types";

export type RegistrarMovimientoInput = {
  type: MovementType;
  cajaId: string;
  areaId: string;
  amount: number;
  currency: CurrencyCode;
  tender: TenderType;
  concept: string;
  exchangeRate: number | null;
  date: string; // YYYY-MM-DD
};

export type RegistrarMovimientoResult =
  | { ok: true; movimiento: CashMovementRow }
  | { ok: false; error: string };

export async function registrarMovimiento(
  input: RegistrarMovimientoInput
): Promise<RegistrarMovimientoResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, active")
    .eq("auth_uid", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      ok: false,
      error: "Tu usuario no está configurado en el sistema. Contacta al administrador.",
    };
  }
  if (!profile.active) {
    return { ok: false, error: "Tu usuario está inactivo. Contacta al administrador." };
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "El monto debe ser mayor a cero." };
  }
  if (!input.concept.trim()) {
    return { ok: false, error: "El concepto es obligatorio." };
  }
  if (!input.cajaId || !input.areaId) {
    return { ok: false, error: "Selecciona caja y área." };
  }
  if (input.currency === "USD" && (!input.exchangeRate || input.exchangeRate <= 0)) {
    return { ok: false, error: "Captura un tipo de cambio válido." };
  }

  const { data, error } = await supabase
    .from("cash_movements")
    .insert({
      date: input.date,
      user_id: profile.id,
      type: input.type,
      caja_id: input.cajaId,
      area_id: input.areaId,
      concept: input.concept.trim(),
      amount,
      currency: input.currency,
      tender: input.tender,
      exchange_rate: input.currency === "USD" ? input.exchangeRate : 1,
    })
    .select(
      "id, folio, date, type, caja_id, area_id, concept, amount, currency, tender, exchange_rate, amount_mxn, created_at"
    )
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo registrar el movimiento." };
  }

  return { ok: true, movimiento: data as CashMovementRow };
}
