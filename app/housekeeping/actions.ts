"use server";

import { createClient } from "@/lib/supabase/server";

export type HkRow = { id: string; room_id: string; date: string; status: string; assigned_to: string | null; notes: string | null };

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión expirada." };
  const { data: profile } = await supabase.from("users").select("id, active, role:roles(code)").eq("auth_uid", user.id).maybeSingle();
  const role = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || !["ADMIN", "GERENCIA", "RECEPCION", "CAMARISTA"].includes(role ?? "")) {
    return { ok: false as const, error: "No tienes permiso para gestionar limpieza." };
  }
  return { ok: true as const, supabase };
}

export async function guardarLimpieza(input: {
  roomId: string; date: string; status: string; assignedTo: string | null; notes: string;
}): Promise<{ ok: true; row: HkRow } | { ok: false; error: string }> {
  const g = await requireStaff(); if (!g.ok) return g;
  if (!input.roomId || !input.date) return { ok: false, error: "Faltan datos." };

  const { data, error } = await g.supabase
    .from("housekeeping")
    .upsert(
      { room_id: input.roomId, date: input.date, status: input.status, assigned_to: input.assignedTo, notes: input.notes.trim() || null },
      { onConflict: "room_id,date" }
    )
    .select("id, room_id, date, status, assigned_to, notes")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo guardar." };
  return { ok: true, row: data as HkRow };
}