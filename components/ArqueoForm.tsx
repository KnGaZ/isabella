"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, X, Scale } from "lucide-react";
import { registrarArqueo, type ArqueoRow } from "@/app/arqueo/actions";

const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
};
const mono = { fontFamily: "var(--font-space-mono), monospace" } as const;
const display = { fontFamily: "var(--font-bricolage), sans-serif" } as const;
const money = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];

type CajaLite = { id: string; name: string; emoji: string | null };
type BalanceRow = { caja_id: string; currency: "MXN" | "USD"; balance: number };

type Props = {
  cajas: CajaLite[];
  balances: BalanceRow[];
  arqueosRecientes: ArqueoRow[];
  fechaHoy: string;
};

type Toast = { msg: string; kind: "success" | "error" };

export default function ArqueoForm({ cajas, balances, arqueosRecientes, fechaHoy }: Props) {
  const [caja, setCaja] = useState(cajas[0]?.id ?? "");
  const [currency, setCurrency] = useState<"MXN" | "USD">("MXN");
  const [total, setTotal] = useState("");
  const [modoDenom, setModoDenom] = useState(false);
  const [denoms, setDenoms] = useState<Record<number, string>>({});
  const [fecha, setFecha] = useState(fechaHoy);
  const [notas, setNotas] = useState("");
  const [more, setMore] = useState(false);
  const [recientes, setRecientes] = useState<ArqueoRow[]>(arqueosRecientes);
  const [toast, setToast] = useState<Toast | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cajaMap = useMemo(() => new Map(cajas.map((c) => [c.id, c])), [cajas]);
  const balMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of balances) m.set(b.caja_id + "|" + b.currency, Number(b.balance));
    return m;
  }, [balances]);

  const esperado = balMap.get(caja + "|" + currency) ?? 0;

  const sumaDenoms = useMemo(
    () => DENOMS.reduce((s, d) => s + d * (parseInt(denoms[d] || "0", 10) || 0), 0),
    [denoms]
  );
  const usarDenom = modoDenom && currency === "MXN";
  const contado = usarDenom ? sumaDenoms : parseFloat(total) || 0;
  const diferencia = contado - esperado;
  const valido = !!caja && (usarDenom ? sumaDenoms >= 0 : total !== "");

  const mostrarToast = (t: Toast, ms: number) => { setToast(t); setTimeout(() => setToast(null), ms); };

  const guardar = async () => {
    if (!valido || submitting) return;
    setSubmitting(true);
    const result = await registrarArqueo({ cajaId: caja, currency, counted: contado, date: fecha, notes: notas });
    setSubmitting(false);
    if (!result.ok) { mostrarToast({ msg: result.error, kind: "error" }, 3600); return; }
    setRecientes([result.arqueo, ...recientes]);
    const d = Number(result.arqueo.difference);
    mostrarToast({ msg: d === 0 ? "Arqueo cuadrado ✓" : "Arqueo guardado · " + (d > 0 ? "sobrante " : "faltante ") + money(Math.abs(d)), kind: "success" }, 3000);
    setTotal(""); setDenoms({}); setNotas("");
  };

  const difColor = diferencia === 0 ? C.in : C.out;
  const difLabel = diferencia === 0 ? "Cuadra" : diferencia > 0 ? "Sobrante" : "Faltante";

  return (
    <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
      <style>{`
        .a-input { width:100%; border:1.5px solid ${C.line}; border-radius:12px; padding:13px 14px;
          font-size:15px; font-family:var(--font-instrument-sans),sans-serif; color:${C.ink}; background:${C.card}; outline:none; transition:border-color .15s; }
        .a-input:focus { border-color:${C.teal}; box-shadow:0 0 0 3px rgba(14,140,140,.14); }
        .a-input::placeholder { color:#9DB0B1; }
        .a-label { font-size:12px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; color:${C.muted}; margin-bottom:8px; display:block; }
        @keyframes a-pop { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:none;} }
        .a-anim { animation: a-pop .28s ease; }
        button:focus-visible, input:focus-visible { outline:2.5px solid ${C.teal}; outline-offset:2px; }
      `}</style>

      <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 32px" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: 0 }}>Arqueo de efectivo</h1>
          <p style={{ fontSize: 13.5, color: C.muted, margin: "4px 0 0" }}>Cuenta el efectivo y compáralo con el sistema</p>
        </div>

        <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.line}`, padding: 16, boxShadow: "0 6px 22px rgba(11,43,48,.06)" }}>
          {/* Caja */}
          <label className="a-label">Caja</label>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
            {cajas.map((c) => {
              const on = caja === c.id;
              return (
                <button key={c.id} onClick={() => setCaja(c.id)}
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 999,
                    border: on ? `1.5px solid ${C.teal}` : `1.5px solid ${C.line}`, background: on ? "#E4F1F1" : C.card,
                    color: on ? C.deep : C.muted, fontWeight: 600, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 15 }}>{c.emoji ?? "🏷️"}</span> {c.name}
                </button>
              );
            })}
          </div>

          {/* Moneda */}
          <label className="a-label">Moneda</label>
          <div style={{ display: "flex", gap: 6, background: C.mist, borderRadius: 13, padding: 4, marginBottom: 18, maxWidth: 180 }}>
            {(["MXN", "USD"] as const).map((m) => (
              <button key={m} onClick={() => setCurrency(m)}
                style={{ flex: 1, padding: "9px 8px", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13.5,
                  fontFamily: "var(--font-instrument-sans),sans-serif", background: currency === m ? C.card : "transparent",
                  color: currency === m ? C.ink : C.muted, boxShadow: currency === m ? "0 1px 3px rgba(11,43,48,.14)" : "none" }}>
                {m}
              </button>
            ))}
          </div>

          {/* Esperado vs contado */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, background: C.mist, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>Sistema dice</div>
              <div style={{ ...mono, fontSize: 19, fontWeight: 700, color: C.ink, marginTop: 3 }}>{money(esperado)}</div>
            </div>
            <div style={{ flex: 1, background: difColor === C.in ? C.inSoft : C.outSoft, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 11.5, color: difColor, fontWeight: 600 }}>{difLabel}</div>
              <div style={{ ...mono, fontSize: 19, fontWeight: 700, color: difColor, marginTop: 3 }}>
                {diferencia > 0 ? "+" : diferencia < 0 ? "−" : ""}{money(Math.abs(diferencia))}
              </div>
            </div>
          </div>

          {/* Contado */}
          <label className="a-label">Contado (físico)</label>
          {!usarDenom && (
            <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${total ? C.teal : C.line}`, borderRadius: 14, padding: "6px 14px", background: C.card, marginBottom: 10 }}>
              <span style={{ ...mono, fontSize: 24, fontWeight: 700, color: total ? C.ink : "#9DB0B1" }}>$</span>
              <input inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00" aria-label="Monto contado"
                style={{ ...mono, flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 24, fontWeight: 700, color: C.ink, width: "100%", padding: "6px 8px" }} />
            </div>
          )}

          {/* Desglose por denominación (opcional, solo MXN) */}
          {currency === "MXN" && (
            <button onClick={() => setModoDenom(!modoDenom)}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: C.teal, fontWeight: 600, fontSize: 13.5, cursor: "pointer", padding: "4px 0 2px", fontFamily: "var(--font-instrument-sans),sans-serif" }}>
              {modoDenom ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {modoDenom ? "Usar total directo" : "Contar por denominación"}
            </button>
          )}

          {usarDenom && (
            <div className="a-anim" style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
              {DENOMS.map((d) => {
                const cant = parseInt(denoms[d] || "0", 10) || 0;
                return (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ ...mono, width: 64, fontSize: 13.5, fontWeight: 700, color: C.deep }}>${d % 1 === 0 ? d : d.toFixed(2)}</span>
                    <span style={{ color: C.muted, fontSize: 13 }}>×</span>
                    <input inputMode="numeric" value={denoms[d] ?? ""} onChange={(e) => setDenoms({ ...denoms, [d]: e.target.value.replace(/[^\d]/g, "") })}
                      placeholder="0" className="a-input" style={{ width: 70, padding: "8px 10px", textAlign: "center" }} />
                    <span style={{ ...mono, flex: 1, textAlign: "right", fontSize: 13.5, color: cant ? C.ink : "#B7C4C4" }}>{money(d * cant)}</span>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1.5px dashed ${C.line}`, marginTop: 6, paddingTop: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: C.muted }}>Total contado</span>
                <span style={{ ...mono, fontSize: 16, fontWeight: 700, color: C.ink }}>{money(sumaDenoms)}</span>
              </div>
            </div>
          )}

          {/* Notas + fecha */}
          <button onClick={() => setMore(!more)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: C.teal, fontWeight: 600, fontSize: 13.5, cursor: "pointer", padding: "12px 0 2px", fontFamily: "var(--font-instrument-sans),sans-serif" }}>
            {more ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {more ? "Menos opciones" : "Notas y fecha"}
          </button>
          {more && (
            <div className="a-anim" style={{ marginTop: 12 }}>
              <label className="a-label">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="a-input" style={{ marginBottom: 12 }} />
              <label className="a-label">Notas</label>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} className="a-input" placeholder="Ej. faltó cambio, se depositó al banco…" />
            </div>
          )}
        </div>

        {/* Guardar */}
        <button onClick={guardar} disabled={!valido || submitting}
          style={{ width: "100%", marginTop: 20, padding: "16px", borderRadius: 15, border: "none",
            background: valido && !submitting ? C.teal : "#C4D2D1", color: "#fff", fontSize: 16, fontWeight: 700,
            fontFamily: "var(--font-instrument-sans),sans-serif", cursor: valido && !submitting ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: valido && !submitting ? `0 8px 18px ${C.teal}44` : "none" }}>
          <Check size={19} strokeWidth={2.6} /> {submitting ? "Guardando…" : "Guardar arqueo"}
        </button>

        {/* Arqueos recientes */}
        <div style={{ marginTop: 32 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: 17, marginBottom: 12 }}>Arqueos recientes</div>
          {recientes.length === 0 ? (
            <div style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 15, padding: "26px 18px", textAlign: "center", color: C.muted, fontSize: 13.5 }}>
              Aún no hay arqueos. Haz el primero arriba.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {recientes.map((a) => {
                const c = cajaMap.get(a.caja_id);
                const d = Number(a.difference);
                const col = d === 0 ? C.in : C.out;
                return (
                  <div key={a.id} className="a-anim" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "grid", placeItems: "center", background: d === 0 ? C.inSoft : C.outSoft }}>
                      <Scale size={17} color={col} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c?.emoji} {c?.name ?? "—"} · {a.currency}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{a.date} · contado {money(Number(a.counted_amount))}</div>
                    </div>
                    <div style={{ ...mono, fontWeight: 700, fontSize: 13.5, color: col, whiteSpace: "nowrap" }}>
                      {d > 0 ? "+" : d < 0 ? "−" : ""}{money(Math.abs(d))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="a-anim" style={{ position: "fixed", left: "50%", bottom: 88, transform: "translateX(-50%)", maxWidth: "90vw",
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