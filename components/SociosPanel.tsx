"use client";

import { useMemo, useState } from "react";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { registrarMovimientoSocio, type PartnerTxType } from "@/app/socios/actions";

const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
};
const mono = { fontFamily: "var(--font-space-mono), monospace" } as const;
const display = { fontFamily: "var(--font-bricolage), sans-serif" } as const;
const money = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Partner = { id: string; name: string; share_pct: number };
type PT = { id: string; partner_id: string; type: string; amount: number; date: string; notes: string | null };
type Props = {
  partners: Partner[];
  transacciones: PT[];
  pnl: { ingresos: number; compras: number; otrosEgresos: number; utilidad: number };
  canEdit: boolean;
};
const TIPOS: { code: PartnerTxType; label: string }[] = [
  { code: "APORTACION", label: "Aportación" },
  { code: "RETIRO", label: "Retiro" },
  { code: "DISTRIBUCION", label: "Distribución" },
];

export default function SociosPanel({ partners, transacciones, pnl, canEdit }: Props) {
  const [txs, setTxs] = useState<PT[]>(transacciones);
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [tipo, setTipo] = useState<PartnerTxType>("APORTACION");
  const [amount, setAmount] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);

  const cuentas = useMemo(() => {
    const m = new Map<string, { ap: number; pa: number; re: number; di: number }>();
    for (const p of partners) m.set(p.id, { ap: 0, pa: 0, re: 0, di: 0 });
    for (const t of txs) {
      const c = m.get(t.partner_id); if (!c) continue;
      const a = Number(t.amount);
      if (t.type === "APORTACION") c.ap += a;
      else if (t.type === "PAGO_POR_SOCIO") c.pa += a;
      else if (t.type === "RETIRO") c.re += a;
      else if (t.type === "DISTRIBUCION") c.di += a;
    }
    return m;
  }, [txs, partners]);

  const notify = (t: { msg: string; kind: "success" | "error" }) => { setToast(t); setTimeout(() => setToast(null), 3000); };

  const guardar = async () => {
    if (saving) return;
    setSaving(true);
    const res = await registrarMovimientoSocio({ partnerId, type: tipo, amount: parseFloat(amount) || 0, date: fecha, notes: notas });
    setSaving(false);
    if (!res.ok) { notify({ msg: res.error, kind: "error" }); return; }
    setTxs([{ ...res.tx }, ...txs]);
    notify({ msg: "Movimiento registrado ✓", kind: "success" });
    setAmount(""); setNotas("");
  };

  const inputCls = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", fontSize: 15, color: C.ink, background: C.card, outline: "none", fontFamily: "var(--font-instrument-sans),sans-serif" } as const;
  const label = { fontSize: 12, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: C.muted, marginBottom: 8, display: "block" } as const;

  return (
    <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 32px" }}>
        <h1 style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: "0 0 4px" }}>Socios y P&L</h1>
        <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 16px" }}>Acumulado del negocio</p>

        {/* P&L */}
        <section style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.line}`, padding: 18, boxShadow: "0 6px 22px rgba(11,43,48,.06)", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: C.muted, marginBottom: 12 }}>Resultado (P&L)</div>
          {[["Ingresos (ventas)", pnl.ingresos, C.in], ["Compras a proveedor", -pnl.compras, C.out], ["Otros egresos de caja", -pnl.otrosEgresos, C.out]].map(([l, v, col]) => (
            <div key={l as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
              <span style={{ color: C.muted }}>{l as string}</span>
              <span style={{ ...mono, fontWeight: 700, color: col as string }}>{(v as number) < 0 ? "−" : ""}{money(Math.abs(v as number))}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1.5px dashed ${C.line}`, paddingTop: 10, marginTop: 4 }}>
            <span style={{ fontWeight: 700 }}>Utilidad</span>
            <span style={{ ...mono, fontWeight: 700, fontSize: 17, color: pnl.utilidad >= 0 ? C.in : C.out }}>{pnl.utilidad < 0 ? "−" : ""}{money(Math.abs(pnl.utilidad))}</span>
          </div>
        </section>

        {/* Registrar movimiento */}
        {canEdit && (
          <section style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: 16, marginBottom: 16 }}>
            <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <span style={{ ...display, fontWeight: 700, fontSize: 16 }}>Registrar movimiento</span>
              {open ? <ChevronUp size={18} color={C.muted} /> : <ChevronDown size={18} color={C.muted} />}
            </button>
            {open && (
              <div style={{ marginTop: 14 }}>
                <label style={label}>Socio</label>
                <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} style={{ ...inputCls, appearance: "none", marginBottom: 12 }}>
                  {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <label style={label}>Tipo</label>
                <div style={{ display: "flex", background: C.mist, borderRadius: 12, padding: 4, marginBottom: 12 }}>
                  {TIPOS.map((t) => (
                    <button key={t.code} onClick={() => setTipo(t.code)} style={{ flex: 1, padding: "9px 4px", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 12.5, fontFamily: "var(--font-instrument-sans),sans-serif", background: tipo === t.code ? C.card : "transparent", color: tipo === t.code ? C.ink : C.muted, boxShadow: tipo === t.code ? "0 1px 3px rgba(11,43,48,.14)" : "none" }}>{t.label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Monto</label>
                    <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} style={inputCls} placeholder="0.00" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Fecha</label>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputCls} />
                  </div>
                </div>
                <label style={label}>Notas</label>
                <input value={notas} onChange={(e) => setNotas(e.target.value)} style={{ ...inputCls, marginBottom: 14 }} placeholder="Opcional" />
                <button onClick={guardar} disabled={saving} style={{ width: "100%", padding: 14, borderRadius: 13, border: "none", background: saving ? "#C4D2D1" : C.teal, color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Check size={18} strokeWidth={2.6} /> {saving ? "Guardando…" : "Registrar"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Cuentas de socios */}
        <div style={{ ...display, fontWeight: 700, fontSize: 16, margin: "0 0 10px 2px" }}>Cuenta de cada socio</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {partners.map((p) => {
            const c = cuentas.get(p.id) ?? { ap: 0, pa: 0, re: 0, di: 0 };
            const balance = c.ap + c.pa - c.re - c.di;
            const corresponde = pnl.utilidad * (Number(p.share_pct) / 100);
            const estado = balance > 0 ? "El negocio le debe" : balance < 0 ? "Debe al negocio" : "Al corriente";
            const col = balance > 0 ? C.in : balance < 0 ? C.out : C.muted;
            return (
              <div key={p.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ ...display, fontWeight: 700, fontSize: 16 }}>{p.name}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: C.deep, background: "#E4F1F1", padding: "3px 9px", borderRadius: 999 }}>{Number(p.share_pct)}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{estado}</span>
                  <span style={{ ...mono, fontWeight: 700, fontSize: 18, color: col }}>{money(Math.abs(balance))}</span>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: C.muted, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                  <span>Aportó: <b style={{ color: C.ink }}>{money(c.ap)}</b></span>
                  <span>Pagó: <b style={{ color: C.ink }}>{money(c.pa)}</b></span>
                  <span>Retiró: <b style={{ color: C.ink }}>{money(c.re)}</b></span>
                  <span>Le toca: <b style={{ color: corresponde >= 0 ? C.in : C.out }}>{money(corresponde)}</b></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 88, transform: "translateX(-50%)", maxWidth: "90vw", background: C.ink, color: "#fff", padding: "12px 18px", borderRadius: 999, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 30px rgba(0,0,0,.28)", zIndex: 50 }}>
          <div style={{ width: 20, height: 20, borderRadius: 999, flexShrink: 0, background: toast.kind === "success" ? C.in : C.out, display: "grid", placeItems: "center" }}>
            {toast.kind === "success" ? <Check size={13} strokeWidth={3} color="#fff" /> : <X size={13} strokeWidth={3} color="#fff" />}
          </div>
          {toast.msg}
        </div>
      )}
    </div>
  );
}