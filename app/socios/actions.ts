"use server";

import { createClient } from "@/lib/supabase/server";

export type PartnerTxType = "APORTACION" | "RETIRO" | "DISTRIBUCION";
export type PartnerTxRow = { id: string; partner_id: string; type: string; amount: number; date: string; notes: string | null };

async function requireMgmt() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión expirada." };
  const { data: profile } = await supabase
    .from("users").select("id, active, role:roles(code)").eq("auth_uid", user.id).maybeSingle();
  const role = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || !(role === "ADMIN" || role === "GERENCIA")) {
    return { ok: false as const, error: "Solo Admin o Gerencia pueden registrar movimientos de socios." };
  }
  return { ok: true as const, supabase };
}

export async function registrarMovimientoSocio(input: {
  partnerId: string; type: PartnerTxType; amount: number; date: string; notes: string;
}): Promise<{ ok: true; tx: PartnerTxRow } | { ok: false; error: string }> {
  const guard = await requireMgmt();
  if (!guard.ok) return guard;

  const amount = Number(input.amount);
  if (!input.partnerId) return { ok: false, error: "Selecciona el socio." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "El monto debe ser mayor a cero." };

  const { data, error } = await guard.supabase
    .from("partner_transactions")
    .insert({ partner_id: input.partnerId, type: input.type, amount, date: input.date, notes: input.notes.trim() || null })
    .select("id, partner_id, type, amount, date, notes")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo registrar." };
  return { ok: true, tx: data as PartnerTxRow };
}