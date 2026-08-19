"use server";

import { createClient } from "@/lib/supabase/server";

export type PaymentMethod = "DEBITO" | "TRANSFERENCIA" | "EFECTIVO" | "CREDITO";
export type PurchaseStatus = "PAGADO" | "PENDIENTE" | "POR_REEMBOLSAR";

export type PurchaseRow = {
  id: string;
  date: string;
  concept: string;
  amount: number;
  area_id: string | null;
  supplier_id: string | null;
  account_id: string | null;
  payment_method: PaymentMethod;
  status: PurchaseStatus;
  invoice_folio: string | null;
  cash_movement_id: string | null;
  created_at: string;
};

export type RegistrarCompraInput = {
  date: string;
  concept: string;
  amount: number;
  areaId: string;
  proveedor: string; // texto libre; se busca o se crea
  accountId: string | null; // cuenta (no efectivo)
  cajaId: string | null; // caja de origen (solo efectivo)
  payment: PaymentMethod;
  status: PurchaseStatus;
  invoice: string;
};

export type RegistrarCompraResult =
  | { ok: true; compra: PurchaseRow; supplierName: string | null }
  | { ok: false; error: string };

export async function registrarCompra(input: RegistrarCompraInput): Promise<RegistrarCompraResult> {
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

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "El monto debe ser mayor a cero." };
  if (!input.concept.trim()) return { ok: false, error: "El concepto es obligatorio." };
  if (!input.areaId) return { ok: false, error: "Selecciona el área." };
  if (input.payment === "EFECTIVO" && !input.cajaId) {
    return { ok: false, error: "Indica de qué caja sale el efectivo." };
  }

  // Proveedor: buscar o crear (construye el catálogo con el uso real).
  let supplierId: string | null = null;
  let supplierName: string | null = null;
  const nombreProv = input.proveedor.trim();
  if (nombreProv) {
    const { data: existente } = await supabase
      .from("suppliers")
      .select("id, name")
      .ilike("name", nombreProv)
      .limit(1)
      .maybeSingle();
    if (existente) {
      supplierId = existente.id;
      supplierName = existente.name;
    } else {
      const { data: creado } = await supabase
        .from("suppliers")
        .insert({ name: nombreProv })
        .select("id, name")
        .single();
      supplierId = creado?.id ?? null;
      supplierName = creado?.name ?? nombreProv;
    }
  }

  const { data, error } = await supabase.rpc("registrar_compra", {
    p_user_id: profile.id,
    p_date: input.date,
    p_concept: input.concept.trim(),
    p_amount: amount,
    p_area_id: input.areaId,
    p_supplier_id: supplierId,
    p_account_id: input.payment === "EFECTIVO" ? null : input.accountId,
    p_payment: input.payment,
    p_status: input.status,
    p_invoice: input.invoice ?? "",
    p_caja_id: input.payment === "EFECTIVO" ? input.cajaId : null,
  });

  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo registrar el gasto." };

  return { ok: true, compra: data as PurchaseRow, supplierName };
}