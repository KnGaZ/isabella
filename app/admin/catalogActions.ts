"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TABLAS = ["cajas", "areas", "channels", "suppliers", "partners"] as const;
export type Tabla = (typeof TABLAS)[number];

// Campos que se permiten escribir por catálogo (lista blanca)
const CAMPOS: Record<Tabla, string[]> = {
  cajas: ["name", "emoji"],
  areas: ["name"],
  channels: ["name"],
  suppliers: ["name", "notes"],
  partners: ["name", "share_pct"],
};

// Referencias que impiden el borrado (protege el historial)
const REFS: Record<Tabla, { t: string; c: string }[]> = {
  cajas: [{ t: "cash_movements", c: "caja_id" }, { t: "cash_counts", c: "caja_id" }],
  areas: [{ t: "cash_movements", c: "area_id" }, { t: "purchases", c: "area_id" }],
  channels: [{ t: "reservations", c: "channel_id" }],
  suppliers: [{ t: "purchases", c: "supplier_id" }],
  partners: [{ t: "partner_transactions", c: "partner_id" }, { t: "accounts", c: "partner_id" }],
};

const CON_CODE = ["cajas", "areas", "channels"];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión expirada." };
  const { data: profile } = await supabase.from("users").select("id, active, role:roles(code)").eq("auth_uid", user.id).maybeSingle();
  const role = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || role !== "ADMIN") return { ok: false as const, error: "No autorizado." };
  return { ok: true as const, profileId: profile.id as string };
}

async function logAudit(admin: ReturnType<typeof createAdminClient>, adminId: string, action: string, entity: string, entityId: string, diff: unknown) {
  await admin.from("audit_log").insert({ user_id: adminId, action, entity, entity_id: entityId, diff });
}

function slug(s: string) {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function limpiar(tabla: Tabla, payload: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of CAMPOS[tabla]) if (payload[k] !== undefined) out[k] = payload[k];
  if (out.name !== undefined) out.name = String(out.name).trim();
  if (tabla === "partners" && out.share_pct !== undefined) out.share_pct = Number(out.share_pct);
  if (typeof out.notes === "string") out.notes = (out.notes as string).trim() || null;
  return out;
}

export async function crearCatalogo(tabla: Tabla, payload: Record<string, unknown>) {
  if (!TABLAS.includes(tabla)) return { ok: false as const, error: "Catálogo no válido." };
  const g = await requireAdmin(); if (!g.ok) return g;
  const admin = createAdminClient();
  const data = limpiar(tabla, payload);
  if (!data.name) return { ok: false as const, error: "El nombre es obligatorio." };

  if (CON_CODE.includes(tabla)) {
    const base = slug(String(data.name)) || "ITEM";
    let code = base, i = 1;
    // asegurar code único
    while (true) {
      const { count } = await admin.from(tabla).select("id", { count: "exact", head: true }).eq("code", code);
      if (!count) break; code = base + "_" + (++i);
    }
    data.code = code;
  }
  if (tabla === "cajas" && !data.emoji) data.emoji = "🏷️";
  data.active = true;

  const { data: row, error } = await admin.from(tabla).insert(data).select("*").single();
  if (error || !row) return { ok: false as const, error: error?.message ?? "No se pudo crear." };
  await logAudit(admin, g.profileId, "CREATE", tabla, (row as { id: string }).id, data);
  return { ok: true as const, row };
}

export async function editarCatalogo(tabla: Tabla, id: string, payload: Record<string, unknown>) {
  if (!TABLAS.includes(tabla)) return { ok: false as const, error: "Catálogo no válido." };
  const g = await requireAdmin(); if (!g.ok) return g;
  const admin = createAdminClient();
  const data = limpiar(tabla, payload);
  if (data.name !== undefined && !data.name) return { ok: false as const, error: "El nombre no puede quedar vacío." };
  if (Object.keys(data).length === 0) return { ok: false as const, error: "Nada que cambiar." };

  const { data: row, error } = await admin.from(tabla).update(data).eq("id", id).select("*").single();
  if (error || !row) return { ok: false as const, error: error?.message ?? "No se pudo editar." };
  await logAudit(admin, g.profileId, "EDIT", tabla, id, data);
  return { ok: true as const, row };
}

export async function toggleCatalogo(tabla: Tabla, id: string, active: boolean) {
  if (!TABLAS.includes(tabla)) return { ok: false as const, error: "Catálogo no válido." };
  const g = await requireAdmin(); if (!g.ok) return g;
  const admin = createAdminClient();
  const { error } = await admin.from(tabla).update({ active }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  await logAudit(admin, g.profileId, active ? "ENABLE" : "DISABLE", tabla, id, {});
  return { ok: true as const };
}

export async function borrarCatalogo(tabla: Tabla, id: string) {
  if (!TABLAS.includes(tabla)) return { ok: false as const, error: "Catálogo no válido." };
  const g = await requireAdmin(); if (!g.ok) return g;
  const admin = createAdminClient();

  let total = 0;
  for (const r of REFS[tabla]) {
    const { count } = await admin.from(r.t).select("id", { count: "exact", head: true }).eq(r.c, id);
    total += count ?? 0;
  }
  if (total > 0) return { ok: false as const, error: `No se puede borrar: está en uso en ${total} registro(s). Desactívalo en su lugar.` };

  const { error } = await admin.from(tabla).delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  await logAudit(admin, g.profileId, "DELETE", tabla, id, {});
  return { ok: true as const };
}