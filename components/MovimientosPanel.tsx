"use client";

import { useMemo, useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";

const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
};
const mono = { fontFamily: "var(--font-space-mono), monospace" } as const;
const display = { fontFamily: "var(--font-bricolage), sans-serif" } as const;
const money = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fFecha = (iso: string) => { const d = new Date(iso + "T00:00:00"); return d.getDate() + "/" + MESES[d.getMonth()]; };

type Mov = { id: string; folio: number; date: string; type: string; caja_id: string | null; area_id: string | null; concept: string; amount: number; currency: string; tender: string };
type Caja = { id: string; name: string; emoji: string | null };
type Area = { id: string; name: string };
type Props = { movimientos: Mov[]; cajas: Caja[]; areas: Area[] };

export default function MovimientosPanel({ movimientos = [], cajas = [], areas = [] }: Props) {
  const [texto, setTexto] = useState("");
  const [caja, setCaja] = useState("");
  const [tipo, setTipo] = useState<"" | "INGRESO" | "EGRESO">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const cajaMap = useMemo(() => new Map(cajas.map((c) => [c.id, c])), [cajas]);
  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return movimientos.filter((m) => {
      if (caja && m.caja_id !== caja) return false;
      if (tipo && m.type !== tipo) return false;
      if (desde && m.date < desde) return false;
      if (hasta && m.date > hasta) return false;
      if (q) {
        const hay = (m.concept ?? "").toLowerCase().includes(q) || String(m.amount).includes(q) || String(m.folio).includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [movimientos, texto, caja, tipo, desde, hasta]);

  const totIn = filtrados.filter((m) => m.type === "INGRESO").reduce((s, m) => s + Number(m.amount), 0);
  const totOut = filtrados.filter((m) => m.type === "EGRESO").reduce((s, m) => s + Number(m.amount), 0);
  const hayFiltro = texto || caja || tipo || desde || hasta;
  const limpiar = () => { setTexto(""); setCaja(""); setTipo(""); setDesde(""); setHasta(""); };

  const inputCls = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "11px 13px", fontSize: 14.5, color: C.ink, background: C.card, outline: "none", fontFamily: "var(--font-instrument-sans),sans-serif" } as const;

  return (
    <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 32px" }}>
        <h1 style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: "0 0 4px" }}>Movimientos</h1>
        <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 16px" }}>Busca y filtra los movimientos de caja</p>

        {/* Buscador */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={17} color={C.muted} style={{ position: "absolute", left: 13, top: 13 }} />
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por concepto, folio o monto…" style={{ ...inputCls, paddingLeft: 38 }} />
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ position: "relative", flex: "1 1 140px" }}>
            <select value={caja} onChange={(e) => setCaja(e.target.value)} style={{ ...inputCls, appearance: "none", paddingRight: 32 }}>
              <option value="">Todas las cajas</option>
              {cajas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={15} color={C.muted} style={{ position: "absolute", right: 11, top: 14, pointerEvents: "none" }} />
          </div>
          <div style={{ display: "flex", background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: 3, flex: "1 1 180px" }}>
            {([["", "Todos"], ["INGRESO", "Ingresos"], ["EGRESO", "Egresos"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setTipo(v)} style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 12.5, fontFamily: "var(--font-instrument-sans),sans-serif", background: tipo === v ? (v === "EGRESO" ? C.outSoft : v === "INGRESO" ? C.inSoft : C.mist) : "transparent", color: tipo === v ? (v === "EGRESO" ? C.out : v === "INGRESO" ? C.in : C.ink) : C.muted }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ ...inputCls, flex: 1 }} title="Desde" />
          <span style={{ color: C.muted, fontSize: 13 }}>a</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ ...inputCls, flex: 1 }} title="Hasta" />
          {hayFiltro && <button onClick={limpiar} title="Limpiar" style={{ padding: 10, borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", display: "grid", placeItems: "center" }}><X size={16} color={C.muted} /></button>}
        </div>

        {/* Resumen */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 2px" }}>
          <span style={{ fontSize: 13, color: C.muted }}><b style={{ color: C.ink }}>{filtrados.length}</b> resultado(s)</span>
          <span style={{ ...mono, fontSize: 13, fontWeight: 700 }}><span style={{ color: C.in }}>+{money(totIn)}</span> <span style={{ color: C.muted }}>·</span> <span style={{ color: C.out }}>−{money(totOut)}</span></span>
        </div>

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 15, padding: "28px 18px", textAlign: "center", color: C.muted, fontSize: 13.5 }}>Sin resultados con esos filtros.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtrados.map((m) => {
              const c = cajaMap.get(m.caja_id ?? ""); const ing = m.type === "INGRESO";
              return (
                <div key={m.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: C.mist, display: "grid", placeItems: "center", fontSize: 16 }}>{c?.emoji ?? "🏷️"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.concept || "—"}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>#{m.folio} · {fFecha(m.date)} · {c?.name ?? "—"}{m.area_id ? " · " + (areaMap.get(m.area_id) ?? "") : ""}{m.tender === "TARJETA" ? " · 💳" : ""}</div>
                  </div>
                  <div style={{ ...mono, fontWeight: 700, fontSize: 14, color: ing ? C.in : C.out, whiteSpace: "nowrap" }}>{ing ? "+" : "−"}{money(Number(m.amount))} <span style={{ fontSize: 10, color: C.muted }}>{m.currency}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}