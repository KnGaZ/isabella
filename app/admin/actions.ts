"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUserRow = {
  id: string;
  full_name: string;
  active: boolean;
  role: { code: string; name: string } | null;
  email?: string | null;
};
export type AdminAccountRow = { id: string; name: string; kind: string | null; active: boolean };

/** Verifica ADMIN activo y devuelve su id de perfil (para la bitácora). */
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión expirada." };
  const { data: profile } = await supabase
    .from("users").select("id, active, role:roles(code)").eq("auth_uid", user.id).maybeSingle();
  const roleCode = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || roleCode !== "ADMIN") {
    return { ok: false as const, error: "No autorizado. Solo un administrador puede hacer esto." };
  }
  return { ok: true as const, profileId: profile.id as string };
}

/** Registra una acción en la bitácora. */
async function logAudit(
  admin: ReturnType<typeof createAdminClient>,
  adminId: string, action: string, entityId: string, diff: unknown
) {
  await admin.from("audit_log").insert({ user_id: adminId, action, entity: "users", entity_id: entityId, diff });
}

/* ─────────────── CREAR USUARIO (con acceso) ─────────────── */
export type CrearUsuarioInput = { fullName: string; email: string; password: string; roleCode: string };

export async function crearUsuario(
  input: CrearUsuarioInput
): Promise<{ ok: true; usuario: AdminUserRow } | { ok: false; error: string }> {
  const g = await requireAdmin();
  if (!g.ok) return g;

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName) return { ok: false, error: "El nombre es obligatorio." };
  if (!email || !email.includes("@")) return { ok: false, error: "Correo no válido." };
  if (!input.password || input.password.length < 6) return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };

  const admin = createAdminClient();
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({ email, password: input.password, email_confirm: true });
  if (authErr || !authData?.user) return { ok: false, error: authErr?.message ?? "No se pudo crear el acceso." };

  const { data: role } = await admin.from("roles").select("id").eq("code", input.roleCode).maybeSingle();
  const { data: perfil, error } = await admin
    .from("users").insert({ auth_uid: authData.user.id, full_name: fullName, role_id: role?.id ?? null, active: true })
    .select("id, full_name, active, role:roles(code, name)").single();

  if (error || !perfil) { await admin.auth.admin.deleteUser(authData.user.id); return { ok: false, error: error?.message ?? "No se pudo crear el usuario." }; }
  await logAudit(admin, g.profileId, "CREATE_USER", (perfil as unknown as AdminUserRow).id, { name: fullName, role: input.roleCode });
  return { ok: true, usuario: perfil as unknown as AdminUserRow };
}

/* ─────────────── EDITAR (nombre / rol) ─────────────── */
export async function editarUsuario(
  id: string, cambios: { fullName?: string; roleCode?: string }
): Promise<{ ok: true; usuario: AdminUserRow } | { ok: false; error: string }> {
  const g = await requireAdmin();
  if (!g.ok) return g;
  const admin = createAdminClient();

  const { data: actual } = await admin.from("users").select("id, full_name, role:roles(code)").eq("id", id).maybeSingle();
  if (!actual) return { ok: false, error: "Usuario no encontrado." };

  const patch: Record<string, unknown> = {};
  if (cambios.fullName !== undefined) {
    if (!cambios.fullName.trim()) return { ok: false, error: "El nombre no puede quedar vacío." };
    patch.full_name = cambios.fullName.trim();
  }
  if (cambios.roleCode !== undefined) {
    if (id === g.profileId && cambios.roleCode !== "ADMIN")
      return { ok: false, error: "No puedes quitarte a ti mismo el rol de administrador." };
    const { data: role } = await admin.from("roles").select("id").eq("code", cambios.roleCode).maybeSingle();
    patch.role_id = role?.id ?? null;
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: "Nada que cambiar." };

  const { data: upd, error } = await admin.from("users").update(patch).eq("id", id)
    .select("id, full_name, active, role:roles(code, name)").single();
  if (error || !upd) return { ok: false, error: error?.message ?? "No se pudo editar." };

  await logAudit(admin, g.profileId, "EDIT_USER", id, {
    antes: { name: actual.full_name, role: (actual.role as { code?: string } | null)?.code }, cambios,
  });
  return { ok: true, usuario: upd as unknown as AdminUserRow };
}

/* ─────────────── CAMBIAR CONTRASEÑA ─────────────── */
export async function cambiarPasswordUsuario(
  id: string, newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await requireAdmin();
  if (!g.ok) return g;
  if (!newPassword || newPassword.length < 6) return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };

  const admin = createAdminClient();
  const { data: actual } = await admin.from("users").select("full_name, auth_uid").eq("id", id).maybeSingle();
  if (!actual) return { ok: false, error: "Usuario no encontrado." };
  if (!actual.auth_uid) return { ok: false, error: "Este usuario no tiene acceso al sistema (no tiene correo/login)." };

  const { error } = await admin.auth.admin.updateUserById(actual.auth_uid, { password: newPassword });
  if (error) return { ok: false, error: error.message };

  await logAudit(admin, g.profileId, "CHANGE_PASSWORD", id, { name: actual.full_name });
  return { ok: true };
}

/* ─────────────── CAMBIAR CORREO (login) ─────────────── */
export async function cambiarEmailUsuario(
  id: string, newEmail: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await requireAdmin();
  if (!g.ok) return g;
  const email = newEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false, error: "Correo no válido." };

  const admin = createAdminClient();
  const { data: actual } = await admin.from("users").select("full_name, auth_uid").eq("id", id).maybeSingle();
  if (!actual) return { ok: false, error: "Usuario no encontrado." };
  if (!actual.auth_uid) return { ok: false, error: "Este usuario no tiene acceso al sistema (no tiene correo/login)." };

  const { error } = await admin.auth.admin.updateUserById(actual.auth_uid, { email, email_confirm: true });
  if (error) {
    const msg = /already|registered|exist|duplicate/i.test(error.message) ? "Ese correo ya está en uso por otro usuario." : error.message;
    return { ok: false, error: msg };
  }
  await logAudit(admin, g.profileId, "CHANGE_EMAIL", id, { name: actual.full_name, email });
  return { ok: true };
}

/* ─────────────── ACTIVAR / DESACTIVAR ─────────────── */
export async function cambiarActivoUsuario(
  id: string, active: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await requireAdmin();
  if (!g.ok) return g;
  if (id === g.profileId && !active) return { ok: false, error: "No puedes desactivar tu propio usuario." };
  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit(admin, g.profileId, active ? "ENABLE_USER" : "DISABLE_USER", id, {});
  return { ok: true };
}

/* ─────────────── REASIGNAR MOVIMIENTOS ─────────────── */
export async function reasignarMovimientos(
  fromId: string, toId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await requireAdmin();
  if (!g.ok) return g;
  if (fromId === toId) return { ok: false, error: "Elige un responsable distinto." };
  const admin = createAdminClient();
  const { error: e1 } = await admin.from("cash_movements").update({ user_id: toId }).eq("user_id", fromId);
  const { error: e2 } = await admin.from("purchases").update({ responsible_id: toId }).eq("responsible_id", fromId);
  if (e1 || e2) return { ok: false, error: (e1 || e2)!.message };
  await logAudit(admin, g.profileId, "REASSIGN_MOVES", fromId, { hacia: toId });
  return { ok: true };
}

/* ─────────────── BORRAR (solo sin movimientos) ─────────────── */
export async function borrarUsuario(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await requireAdmin();
  if (!g.ok) return g;
  if (id === g.profileId) return { ok: false, error: "No puedes eliminar tu propio usuario." };
  const admin = createAdminClient();

  const { count: cm } = await admin.from("cash_movements").select("id", { count: "exact", head: true }).eq("user_id", id);
  const { count: pu } = await admin.from("purchases").select("id", { count: "exact", head: true }).eq("responsible_id", id);
  const total = (cm ?? 0) + (pu ?? 0);
  if (total > 0) return { ok: false, error: `No se puede borrar: tiene ${total} movimiento(s). Reasígnalos primero.` };

  const { data: actual } = await admin.from("users").select("full_name, auth_uid").eq("id", id).maybeSingle();
  const { error } = await admin.from("users").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (actual?.auth_uid) await admin.auth.admin.deleteUser(actual.auth_uid);
  await logAudit(admin, g.profileId, "DELETE_USER", id, { name: actual?.full_name });
  return { ok: true };
}

/* ─────────────── CUENTAS ─────────────── */
export async function crearCuenta(input: {
  name: string; kind: string;
}): Promise<{ ok: true; cuenta: AdminAccountRow } | { ok: false; error: string }> {
  const g = await requireAdmin();
  if (!g.ok) return g;
  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre de la cuenta es obligatorio." };
  const admin = createAdminClient();
  const { data, error } = await admin.from("accounts").insert({ name, kind: input.kind.trim() || null, active: true })
    .select("id, name, kind, active").single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear la cuenta." };
  return { ok: true, cuenta: data as AdminAccountRow };
}

export async function cambiarActivoCuenta(
  id: string, active: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await requireAdmin();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const { error } = await admin.from("accounts").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}