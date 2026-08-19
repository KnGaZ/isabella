"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { registrarCompra, type PaymentMethod, type PurchaseRow, type PurchaseStatus } from "@/app/gastos/actions";

const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
};
const mono = { fontFamily: "var(--font-space-mono), monospace" } as const;
const display = { fontFamily: "var(--font-bricolage), sans-serif" } as const;

const money = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PAGOS: { code: PaymentMethod; label: string }[] = [
  { code: "DEBITO", label: "Débito" },
  { code: "TRANSFERENCIA", label: "Transferencia" },
  { code: "EFECTIVO", label: "Efectivo" },
  { code: "CREDITO", label: "Crédito" },
];
const ESTATUS: { code: PurchaseStatus; label: string }[] = [
  { code: "PAGADO", label: "Pagado" },
  { code: "PENDIENTE", label: "Pendiente" },
  { code: "POR_REEMBOLSAR", label: "Por reembolsar" },
];

type AreaLite = { id: string; name: string };
type CajaLite = { id: string; name: string; emoji: string | null };
type AccountLite = { id: string; name: string };
type SupplierLite = { id: string; name: string };

type Props = {
  areas: AreaLite[];
  cajas: CajaLite[];
  accounts: AccountLite[];
  suppliers: SupplierLite[];
  comprasIniciales: PurchaseRow[];
  fechaHoy: string;
};

type Toast = { msg: string; kind: "success" | "error" };

export default function GastosForm({ areas, cajas, accounts, suppliers, comprasIniciales, fechaHoy }: Props) {
  const [amount, setAmount] = useState("");
  const [concepto, setConcepto] = useState("");
  const [area, setArea] = useState(areas[0]?.id ?? "");
  const [payment, setPayment] = useState<PaymentMethod>("TRANSFERENCIA");
  const [account, setAccount] = useState(accounts[0]?.id ?? "");
  const [caja, setCaja] = useState(cajas[0]?.id ?? "");
  const [proveedor, setProveedor] = useState("");
  const [invoice, setInvoice] = useState("");
  const [status, setStatus] = useState<PurchaseStatus>("PAGADO");
  const [fecha, setFecha] = useState(fechaHoy);
  const [more, setMore] = useState(false);
  const [compras, setCompras] = useState<PurchaseRow[]>(comprasIniciales);
  const [toast, setToast] = useState<Toast | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const montoNum = parseFloat(amount) || 0;
  const esEfectivo = payment === "EFECTIVO";
  const valido = montoNum > 0 && concepto.trim() !== "" && !!area && (!esEfectivo || !!caja);

  const totalHoy = useMemo(() => compras.reduce((s, c) => s + Number(c.amount), 0), [compras]);

  const mostrarToast = (t: Toast, ms: number) => { setToast(t); setTimeout(() => setToast(null), ms); };

  const registrar = async () => {
    if (!valido || submitting) return;
    setSubmitting(true);
    const result = await registrarCompra({
      date: fecha, concept: concepto, amount: montoNum, areaId: area,
      proveedor, accountId: esEfectivo ? null : account || null,
      cajaId: esEfectivo ? caja : null, payment, status, invoice,
    });
    setSubmitting(false);
    if (!result.ok) { mostrarToast({ msg: result.error, kind: "error" }, 3600); return; }
    setCompras([result.compra, ...compras]);
    mostrarToast({ msg: "Gasto registrado" + (esEfectivo ? " · descontado de caja" : ""), kind: "success" }, 2600);
    setAmount(""); setConcepto(""); setInvoice(""); setProveedor("");
  };

  const seg = (active: boolean) => ({
    padding: "10px 8px", border: "none", borderRadius: 10, cursor: "pointer",
    fontWeight: 600, fontSize: 13.5, fontFamily: "var(--font-instrument-sans), sans-serif",
    background: active ? C.card : "transparent", color: active ? C.ink : C.muted,
    boxShadow: active ? "0 1px 3px rgba(11,43,48,.14)" : "none", transition: "all .15s",
  });

  return (
    <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
      <style>{`
        .g-input { width:100%; border:1.5px solid ${C.line}; border-radius:12px; padding:13px 14px;
          font-size:15px; font-family:var(--font-instrument-sans),sans-serif; color:${C.ink}; background:${C.card}; outline:none; transition:border-color .15s; }
        .g-input:focus { border-color:${C.teal}; box-shadow:0 0 0 3px rgba(14,140,140,.14); }
        .g-input::placeholder { color:#9DB0B1; }
        .g-label { font-size:12px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; color:${C.muted}; margin-bottom:8px; display:block; }
        @keyframes g-pop { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:none;} }
        .g-anim { animation: g-pop .28s ease; }
        button:focus-visible { outline:2.5px solid ${C.teal}; outline-offset:2px; }
      `}</style>

      <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 32px" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: 0 }}>Nuevo gasto</h1>
          <p style={{ fontSize: 13.5, color: C.muted, margin: "4px 0 0" }}>Compras y pagos a proveedor</p>
        </div>

        <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.line}`, padding: 16, boxShadow: "0 6px 22px rgba(11,43,48,.06)" }}>
          {/* Monto */}
          <label className="g-label">Monto (MXN)</label>
          <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${amount ? C.out : C.line}`, borderRadius: 14, padding: "6px 14px", background: amount ? C.outSoft : C.card, marginBottom: 16 }}>
            <span style={{ ...mono, fontSize: 26, fontWeight: 700, color: amount ? C.out : "#9DB0B1" }}>$</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00" aria-label="Monto"
              style={{ ...mono, flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 26, fontWeight: 700, color: C.out, width: "100%", padding: "6px 8px" }} />
          </div>

          {/* Concepto */}
          <label className="g-label">Concepto</label>
          <input value={concepto} onChange={(e) => setConcepto(e.target.value)} className="g-input" placeholder="Ej. Despensa cocina — Sams" style={{ marginBottom: 16 }} />

          {/* Área */}
          <label className="g-label">Área</label>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <select value={area} onChange={(e) => setArea(e.target.value)} className="g-input" style={{ appearance: "none", paddingRight: 40 }}>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <ChevronDown size={18} color={C.muted} style={{ position: "absolute", right: 13, top: 15, pointerEvents: "none" }} />
          </div>

          {/* Forma de pago */}
          <label className="g-label">Forma de pago</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: C.mist, borderRadius: 13, padding: 4, marginBottom: 16 }}>
            {PAGOS.map((p) => (
              <button key={p.code} onClick={() => setPayment(p.code)} style={seg(payment === p.code)}>{p.label}</button>
            ))}
          </div>

          {/* Condicional: caja (efectivo) o cuenta (resto) */}
          {esEfectivo ? (
            <div className="g-anim" style={{ marginBottom: 16 }}>
              <label className="g-label">¿De qué caja sale el efectivo?</label>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {cajas.map((c) => {
                  const on = caja === c.id;
                  return (
                    <button key={c.id} onClick={() => setCaja(c.id)}
                      style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 999,
                        border: on ? `1.5px solid ${C.out}` : `1.5px solid ${C.line}`, background: on ? C.outSoft : C.card,
                        color: on ? C.out : C.muted, fontWeight: 600, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 15 }}>{c.emoji ?? "🏷️"}</span> {c.name}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 7 }}>Se descontará de esa caja automáticamente.</div>
            </div>
          ) : (
            <div className="g-anim" style={{ marginBottom: 16 }}>
              <label className="g-label">Cuenta {accounts.length === 0 && <span style={{ textTransform: "none", fontWeight: 400 }}>· agrégalas en Admin</span>}</label>
              <div style={{ position: "relative" }}>
                <select value={account} onChange={(e) => setAccount(e.target.value)} className="g-input" style={{ appearance: "none", paddingRight: 40 }} disabled={accounts.length === 0}>
                  <option value="">— sin especificar —</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <ChevronDown size={18} color={C.muted} style={{ position: "absolute", right: 13, top: 15, pointerEvents: "none" }} />
              </div>
            </div>
          )}

          {/* Proveedor */}
          <label className="g-label">Proveedor <span style={{ textTransform: "none", fontWeight: 400 }}>· opcional</span></label>
          <input list="g-proveedores" value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="g-input" placeholder="Ej. Sams, La Popular…" style={{ marginBottom: 16 }} />
          <datalist id="g-proveedores">{suppliers.map((s) => <option key={s.id} value={s.name} />)}</datalist>

          {/* Estatus */}
          <label className="g-label">Estatus</label>
          <div style={{ display: "flex", background: C.mist, borderRadius: 13, padding: 4, marginBottom: 6 }}>
            {ESTATUS.map((s) => (
              <button key={s.code} onClick={() => setStatus(s.code)} style={{ ...seg(status === s.code), flex: 1 }}>{s.label}</button>
            ))}
          </div>

          {/* Más opciones: factura + fecha */}
          <button onClick={() => setMore(!more)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: C.teal, fontWeight: 600, fontSize: 13.5, cursor: "pointer", padding: "8px 0 2px", fontFamily: "var(--font-instrument-sans),sans-serif" }}>
            {more ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {more ? "Menos opciones" : "Factura y fecha"}
          </button>
          {more && (
            <div className="g-anim" style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="g-label">Factura / CFDI</label>
                <input value={invoice} onChange={(e) => setInvoice(e.target.value)} className="g-input" placeholder="Folio" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="g-label">Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="g-input" />
              </div>
            </div>
          )}
        </div>

        {/* Botón */}
        <button onClick={registrar} disabled={!valido || submitting}
          style={{ width: "100%", marginTop: 20, padding: "16px", borderRadius: 15, border: "none",
            background: valido && !submitting ? C.out : "#C4D2D1", color: "#fff", fontSize: 16, fontWeight: 700,
            fontFamily: "var(--font-instrument-sans),sans-serif", cursor: valido && !submitting ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: valido && !submitting ? `0 8px 18px ${C.out}44` : "none", transition: "all .18s" }}>
          <Check size={19} strokeWidth={2.6} /> {submitting ? "Guardando…" : "Registrar gasto"}
        </button>
        {!valido && (
          <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 9 }}>
            Falta {montoNum <= 0 ? "el monto" : concepto.trim() === "" ? "el concepto" : esEfectivo && !caja ? "la caja de origen" : "un dato"} para registrar.
          </div>
        )}

        {/* Gastos de hoy */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ ...display, fontWeight: 700, fontSize: 17 }}>Gastos de hoy</span>
            <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: C.out }}>{money(totalHoy)}</span>
          </div>

          {compras.length === 0 ? (
            <div style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 15, padding: "26px 18px", textAlign: "center", color: C.muted, fontSize: 13.5 }}>
              Aún no hay gastos hoy. Registra el primero arriba.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {compras.map((c) => (
                <div key={c.id} className="g-anim" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.concept}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      {(c.area_id && areaMap.get(c.area_id)) || "—"}
                      {c.supplier_id && supplierMap.get(c.supplier_id) ? " · " + supplierMap.get(c.supplier_id) : ""}
                      {c.status !== "PAGADO" ? " · " + (c.status === "PENDIENTE" ? "Pendiente" : "Por reembolsar") : ""}
                    </div>
                  </div>
                  <div style={{ ...mono, fontWeight: 700, fontSize: 14, color: C.out, whiteSpace: "nowrap" }}>−{money(Number(c.amount))}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="g-anim" style={{ position: "fixed", left: "50%", bottom: 88, transform: "translateX(-50%)", maxWidth: "90vw",
          background: C.ink, color: "#fff", padding: "12px 18px", borderRadius: 999, fontSize: 14, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 30px rgba(0,0,0,.28)", zIndex: 50 }}>
          <div style={{ width: 20, height: 20, borderRadius: 999, flexShrink: 0, background: toast.kind === "success" ? C.in : C.out, display: "grid", placeItems: "center" }}>
            {toast.kind === "success" ? <Check size={13} strokeWidth={3} color="#fff" /> : <X size={13} strokeWidth={3} color="#fff" />}
          </div>
          {toast.msg}
        </div>
      )}
    </div>
  );
}