"use server";

import { createClient } from "@/lib/supabase/server";

export type ReservationInput = {
  roomId: string;
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  pax: number | null;
  channelId: string | null;
  ratePerNight: number | null;
  breakfast: boolean;
  specialRequests: string;
  notes: string;
  status: string;
};

export type ReservationRow = {
  id: string; room_id: string; guest_id: string | null; channel_id: string | null;
  check_in: string; check_out: string; pax: number | null; status: string;
  breakfast_included: boolean; special_requests: string | null; notes: string | null;
  rate_per_night: number | null;
  guest: { full_name: string; phone: string | null } | null;
};

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión expirada." };
  const { data: profile } = await supabase.from("users").select("id, active, role:roles(code)").eq("auth_uid", user.id).maybeSingle();
  const role = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || !["ADMIN", "GERENCIA", "RECEPCION"].includes(role ?? "")) {
    return { ok: false as const, error: "No tienes permiso para gestionar reservas." };
  }
  return { ok: true as const, supabase };
}

function validar(input: ReservationInput): string | null {
  if (!input.roomId) return "Selecciona la habitación.";
  if (!input.guestName.trim()) return "El nombre del huésped es obligatorio.";
  if (!input.checkIn || !input.checkOut) return "Faltan las fechas.";
  if (input.checkOut <= input.checkIn) return "La salida debe ser después de la llegada.";
  return null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function resolverHuesped(supabase: any, name: string, phone: string): Promise<string | null> {
  const nombre = name.trim();
  const tel = phone.trim();
  if (tel) {
    const { data: ex } = await supabase.from("guests").select("id").eq("phone", tel).limit(1).maybeSingle();
    if (ex) { await supabase.from("guests").update({ full_name: nombre }).eq("id", ex.id); return ex.id as string; }
  }
  const { data: cr } = await supabase.from("guests").insert({ full_name: nombre, phone: tel || null }).select("id").single();
  return (cr?.id as string) ?? null;
}

export async function crearReserva(input: ReservationInput): Promise<{ ok: true; reserva: ReservationRow } | { ok: false; error: string }> {
  const g = await requireStaff(); if (!g.ok) return g;
  const err = validar(input); if (err) return { ok: false, error: err };

  const guestId = await resolverHuesped(g.supabase, input.guestName, input.guestPhone);

  const { data, error } = await g.supabase.from("reservations").insert({
    room_id: input.roomId, guest_id: guestId, channel_id: input.channelId,
    check_in: input.checkIn, check_out: input.checkOut, pax: input.pax,
    status: input.status, breakfast_included: input.breakfast,
    special_requests: input.specialRequests.trim() || null, notes: input.notes.trim() || null,
    rate_per_night: input.ratePerNight, source: "MANUAL",
  }).select("*, guest:guests(full_name, phone)").single();

  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear la reserva." };
  return { ok: true, reserva: data as ReservationRow };
}

export async function editarReserva(id: string, input: ReservationInput): Promise<{ ok: true; reserva: ReservationRow } | { ok: false; error: string }> {
  const g = await requireStaff(); if (!g.ok) return g;
  const err = validar(input); if (err) return { ok: false, error: err };

  const guestId = await resolverHuesped(g.supabase, input.guestName, input.guestPhone);

  const { data, error } = await g.supabase.from("reservations").update({
    room_id: input.roomId, guest_id: guestId, channel_id: input.channelId,
    check_in: input.checkIn, check_out: input.checkOut, pax: input.pax,
    status: input.status, breakfast_included: input.breakfast,
    special_requests: input.specialRequests.trim() || null, notes: input.notes.trim() || null,
    rate_per_night: input.ratePerNight,
  }).eq("id", id).select("*, guest:guests(full_name, phone)").single();

  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo editar la reserva." };
  return { ok: true, reserva: data as ReservationRow };
}

export async function cambiarEstatusReserva(id: string, status: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await requireStaff(); if (!g.ok) return g;
  const { error } = await g.supabase.from("reservations").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}