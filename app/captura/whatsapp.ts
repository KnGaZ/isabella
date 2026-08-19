"use server";

import { sendWhatsApp } from "@/lib/notify";

/** Aviso de un movimiento de caja por WhatsApp. Best-effort: nunca rompe la captura. */
export async function notificarCaja(p: {
  tipo: string; monto: number; moneda: string; caja: string; area: string; concepto: string; responsable: string;
}): Promise<{ ok: boolean; error?: string }> {
  const linea = p.tipo === "INGRESO" ? "🟢 Ingreso" : "🔴 Egreso";
  const text =
    `🏨 *Caja Isabella*\n` +
    `${linea}: $${Number(p.monto).toFixed(2)} ${p.moneda}\n` +
    `📍 ${p.caja} · ${p.area}\n` +
    `📝 ${p.concepto || "—"}\n` +
    `👤 ${p.responsable}`;
  return sendWhatsApp(text);
}