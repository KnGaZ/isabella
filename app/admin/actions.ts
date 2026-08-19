"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUserRow = {
  id: string;
  full_name: string;
  active: boolean;
  role: { code: string; name: string } | null;
};
export type AdminAccountRow = { id: string; name: string; kind: string | null; active: boolean };

/** Verifica que quien llama sea ADMIN activo. */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión expirada." };

  const { data: profile } = await supabase
    .from("users")
    .select("id, active, role:roles(code)")
    .eq("auth_uid", user.id)
    .maybeSingle();

  const roleCode = (profile?.role as { code?: string } | null)?.code;
  if (!profile?.active || roleCode !== "ADMIN") {
    return { ok: false as const, error: "No autorizado. Solo un administrador puede hacer esto." };
  }
  return { ok: true as const };
}

/* ─────────────────────────── USUARIOS ─────────────────────────── */

export type CrearUsuarioInput = { fullName: string; email: string; password: string; roleCode: string };

export async function crearUsuario(
  input: CrearUsuarioInput
): Promise<{ ok: true; usuario: AdminUserRow } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName) return { ok: false, error: "El nombre es obligatorio." };
  if (!email || !email.includes("@")) return { ok: false, error: "Correo no válido." };
  if (!input.password || input.password.length < 6) return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };

  const admin = createAdminClient();

  // 1) Crear el acceso (Auth), ya confirmado para que pueda entrar de inmediato.
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });
  if (authErr || !authData?.user) {
    return { ok: false, error: authErr?.message ?? "No se pudo crear el acceso." };
  }

  // 2) Rol
  const { data: role } = await admin.from("roles").select("id").eq("code", input.roleCode).maybeSingle();

  // 3) Fila en users
  const { data: perfil, error } = await admin
    .from("users")
    .insert({ auth_uid: authData.user.id, full_name: fullName, role_id: role?.id ?? null, active: true })
    .select("id, full_name, active, role:roles(code, name)")
    .single();

  if (error || !perfil) {
    // Rollback del acceso para no dejar huérfanos.
    await admin.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: error?.message ?? "No se pudo crear el usuario." };
  }

  return { ok: true, usuario: perfil as unknown as AdminUserRow };
}

export async function cambiarActivoUsuario(
  id: string,
  active: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/* ─────────────────────────── CUENTAS ─────────────────────────── */

export async function crearCuenta(input: {
  name: string;
  kind: string;
}): Promise<{ ok: true; cuenta: AdminAccountRow } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre de la cuenta es obligatorio." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("accounts")
    .insert({ name, kind: input.kind.trim() || null, active: true })
    .select("id, name, kind, active")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear la cuenta." };
  return { ok: true, cuenta: data as AdminAccountRow };
}

export async function cambiarActivoCuenta(
  id: string,
  active: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { error } = await admin.from("accounts").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}