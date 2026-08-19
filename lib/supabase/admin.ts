import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con permisos de administrador (service_role).
 * ⚠️ SOLO se importa desde código de servidor (server actions).
 * NUNCA en un componente cliente: la llave es secreta y omite el RLS.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}