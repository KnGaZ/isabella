"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Minus, ChevronDown, ChevronUp, Banknote, CreditCard, ArrowLeftRight, Calendar, User, X } from "lucide-react";
import { registrarMovimiento } from "@/app/captura/actions";
import { notificarCaja } from "@/app/captura/whatsapp";
import type { Area, Caja, CashMovementRow, CurrencyCode, MovementType, TenderType, UserProfile } from "@/lib/types";

/* ── Paleta laguna (diseño aprobado) ─────────────────────────────────── */
const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C", sand: "#EADFC7",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const fmtMoney = (n: number, cur: string) =>
  "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (cur ? " " + cur : "");

const fmtFechaCorta = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.getDate() + "/" + MESES[d.getMonth()];
};

type Props = {
  responsable: UserProfile;
  cajas: Caja[];
  areas: Area[];
  movimientosIniciales: CashMovementRow[];
  tipoDeCambioHoy: number | null;
  fechaHoy: string;
};

type Toast = { msg: string; kind: "success" | "error" };

export default function CapturaRapida({
  responsable,
  cajas,
  areas,
  movimientosIniciales,
  tipoDeCambioHoy,
  fechaHoy,
}: Props) {
  const [type, setType] = useState<MovementType>("INGRESO");
  const [caja, setCaja] = useState(cajas[0]?.id ?? "");
  const [area, setArea] = useState(areas[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("MXN");
  const [tender, setTender] = useState<TenderType>("EFECTIVO");
  const [concepto, setConcepto] = useState("");
  const [exchangeRate, setExchangeRate] = useState(tipoDeCambioHoy ? String(tipoDeCambioHoy) : "");
  const [fecha, setFecha] = useState(fechaHoy);
  const [more, setMore] = useState(false);
  const [movs, setMovs] = useState<CashMovementRow[]>(movimientosIniciales);
  const [toast, setToast] = useState<Toast | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cajaMap = useMemo(() => new Map(cajas.map((c) => [c.id, c])), [cajas]);
  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  const accent = type === "INGRESO" ? C.in : C.out;
  const accentSoft = type === "INGRESO" ? C.inSoft : C.outSoft;
  const cajaObj = cajaMap.get(caja);
  const areaObj = areaMap.get(area);
  const montoNum = parseFloat(amount) || 0;
  const exchangeRateNum = parseFloat(exchangeRate) || 0;
  const valido =
    montoNum > 0 &&
    concepto.trim() !== "" &&
    !!caja &&
    !!area &&
    (currency === "MXN" || exchangeRateNum > 0);

  const mostrarToast = (t: Toast, ms: number) => {
    setToast(t);
    setTimeout(() => setToast(null), ms);
  };

  const registrar = async () => {
    if (!valido || submitting) return;
    setSubmitting(true);

    const result = await registrarMovimiento({
      type,
      cajaId: caja,
      areaId: area,
      amount: montoNum,
      currency,
      tender,
      concept: concepto,
      exchangeRate: currency === "USD" ? exchangeRateNum : null,
      date: fecha,
    });

    setSubmitting(false);

    if (!result.ok) {
      mostrarToast({ msg: result.error, kind: "error" }, 3600);
      return;
    }

    setMovs([result.movimiento, ...movs]);
    // Aviso por WhatsApp (best-effort: no bloquea ni rompe si falla)
    notificarCaja({
      tipo: type,
      monto: montoNum,
      moneda: currency,
      caja: cajaObj?.name ?? "—",
      area: areaObj?.name ?? "—",
      concepto: concepto,
      responsable: responsable.full_name,
        }).then((r) => { if (!r?.ok) console.log("WA error:", r?.error); }).catch((e) => console.log("WA catch:", e));
    mostrarToast(
      { msg: (type === "INGRESO" ? "Ingreso" : "Egreso") + " registrado · Folio #" + result.movimiento.folio, kind: "success" },
      2600
    );
    setAmount("");
    setConcepto("");
  };

  const totales = useMemo(() => {
    let i = 0, e = 0;
    movs.forEach((m) => {
      if (m.currency === "MXN") {
        if (m.type === "INGRESO") i += Number(m.amount_mxn);
        else e += Number(m.amount_mxn);
      }
    });
    return { i, e };
  }, [movs]);

  const seg = (active: boolean) => ({
    flex: 1, padding: "11px 8px", border: "none", borderRadius: 11, cursor: "pointer",
    fontWeight: 600, fontSize: 14, fontFamily: "'Instrument Sans',sans-serif",
    background: active ? C.card : "transparent", color: active ? C.ink : C.muted,
    boxShadow: active ? "0 1px 3px rgba(11,43,48,.14)" : "none", transition: "all .15s",
  });

  const reciboRow = { display: "flex", alignItems: "center", gap: 7 } as const;

  return (
    <div style={{ minHeight: "100%", background: C.mist, fontFamily: "'Instrument Sans',sans-serif", color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .cr-input { width:100%; border:1.5px solid ${C.line}; border-radius:12px; padding:13px 14px;
          font-size:15px; font-family:'Instrument Sans',sans-serif; color:${C.ink}; background:${C.card}; outline:none; transition:border-color .15s; }
        .cr-input:focus { border-color:${C.teal}; box-shadow:0 0 0 3px rgba(14,140,140,.14); }
        .cr-input::placeholder { color:#9DB0B1; }
        .cr-chip:focus-visible, button:focus-visible { outline:2.5px solid ${C.teal}; outline-offset:2px; }
        .cr-scroll::-webkit-scrollbar { display:none; }
        .cr-scroll { -ms-overflow-style:none; scrollbar-width:none; }
        @keyframes cr-pop { from { opacity:0; transform:translateY(8px) scale(.985);} to {opacity:1; transform:none;} }
        .cr-anim { animation: cr-pop .28s ease; }
        @media (prefers-reduced-motion: reduce){ .cr-anim{ animation:none; } }
        .cr-label { font-size:12px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; color:${C.muted}; margin-bottom:8px; display:block; }
      `}</style>

      <div style={{ maxWidth: 430, margin: "0 auto", padding: "18px 16px 40px" }}>
        {/* Título */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: 0 }}>Captura</h1>
          <p style={{ fontSize: 13.5, color: C.muted, margin: "4px 0 0" }}>Registra un ingreso o egreso · {fmtFechaCorta(fechaHoy)}</p>
        </div>

        {/* Card principal */}
        <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.line}`, padding: 16, boxShadow: "0 6px 22px rgba(11,43,48,.06)" }}>
          {/* Ingreso / Egreso */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {(["INGRESO", "EGRESO"] as const).map((t) => {
              const on = type === t; const col = t === "INGRESO" ? C.in : C.out; const sc = t === "INGRESO" ? C.inSoft : C.outSoft;
              return (
                <button key={t} onClick={() => setType(t)} className="cr-chip"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px", borderRadius: 14,
                    border: on ? `1.5px solid ${col}` : `1.5px solid ${C.line}`, background: on ? sc : C.card, color: on ? col : C.muted,
                    fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all .15s", fontFamily: "'Instrument Sans',sans-serif" }}>
                  {t === "INGRESO" ? <Plus size={17} strokeWidth={2.6} /> : <Minus size={17} strokeWidth={2.6} />}
                  {t === "INGRESO" ? "Ingreso" : "Egreso"}
                </button>
              );
            })}
          </div>

          {/* Monto */}
          <label className="cr-label">Monto</label>
          <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${amount ? accent : C.line}`, borderRadius: 14, padding: "6px 14px", background: amount ? accentSoft : C.card, transition: "all .15s", marginBottom: 10 }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 26, fontWeight: 700, color: amount ? accent : "#9DB0B1" }}>$</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00" aria-label="Monto"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "'Space Mono',monospace",
                fontSize: 26, fontWeight: 700, color: accent, width: "100%", padding: "6px 8px" }} />
          </div>

          {/* Moneda + Medio */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, display: "flex", background: C.mist, borderRadius: 13, padding: 4 }}>
              {(["MXN", "USD"] as const).map((m) => (
                <button key={m} onClick={() => setCurrency(m)} style={seg(currency === m)}>{m}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", background: C.mist, borderRadius: 13, padding: 4, marginBottom: currency === "USD" ? 14 : 18 }}>
            <button onClick={() => setTender("EFECTIVO")} style={{ ...seg(tender === "EFECTIVO"), display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 12.5 }}>
              <Banknote size={15} /> Efectivo
            </button>
            <button onClick={() => setTender("TARJETA")} style={{ ...seg(tender === "TARJETA"), display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 12.5 }}>
              <CreditCard size={15} /> Tarjeta
            </button>
            <button onClick={() => setTender("TRANSFERENCIA")} style={{ ...seg(tender === "TRANSFERENCIA"), display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 12.5 }}>
              <ArrowLeftRight size={15} /> Transfer.
            </button>
          </div>

          {/* Tipo de cambio (solo USD) */}
          {currency === "USD" && (
            <div className="cr-anim" style={{ marginBottom: 18 }}>
              <label className="cr-label">Tipo de cambio · MXN por USD</label>
              <input
                inputMode="decimal"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="18.50"
                className="cr-input"
              />
              {montoNum > 0 && exchangeRateNum > 0 && (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                  ≈ {fmtMoney(montoNum * exchangeRateNum, "MXN")}
                </div>
              )}
            </div>
          )}

          {/* Caja */}
          <label className="cr-label">Caja</label>
          <div className="cr-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 18 }}>
            {cajas.map((c) => {
              const on = caja === c.id;
              return (
                <button key={c.id} onClick={() => setCaja(c.id)} className="cr-chip"
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 999,
                    border: on ? `1.5px solid ${C.teal}` : `1.5px solid ${C.line}`, background: on ? "#E4F1F1" : C.card,
                    color: on ? C.deep : C.muted, fontWeight: 600, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 15 }}>{c.emoji}</span> {c.name}
                </button>
              );
            })}
          </div>

          {/* Área */}
          <label className="cr-label">Área</label>
          <div style={{ position: "relative", marginBottom: 18 }}>
            <select value={area} onChange={(e) => setArea(e.target.value)} className="cr-input" style={{ appearance: "none", paddingRight: 40 }}>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <ChevronDown size={18} color={C.muted} style={{ position: "absolute", right: 13, top: 15, pointerEvents: "none" }} />
          </div>

          {/* Concepto */}
          <label className="cr-label">Concepto</label>
          <input value={concepto} onChange={(e) => setConcepto(e.target.value)} className="cr-input" placeholder="Ej. 3 pax desayuno MyLove" style={{ marginBottom: 14 }} />

          {/* Más opciones */}
          <button onClick={() => setMore(!more)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: C.teal, fontWeight: 600, fontSize: 13.5, cursor: "pointer", padding: "2px 0", marginBottom: more ? 14 : 2, fontFamily: "'Instrument Sans',sans-serif" }}>
            {more ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {more ? "Menos opciones" : "Fecha"}
          </button>
          {more && (
            <div>
              <label className="cr-label">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="cr-input" />
            </div>
          )}
        </div>

        {/* Recibo en vivo (elemento distintivo) */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: C.muted, marginBottom: 10, textAlign: "center" }}>
            Se guardará y enviará
          </div>
          <div style={{ position: "relative", maxWidth: 300, margin: "0 auto", filter: "drop-shadow(0 8px 20px rgba(11,43,48,.10))" }}>
            <div style={{ background: "#FCFBF7", borderRadius: "14px 14px 0 0", padding: "20px 22px 14px", fontFamily: "'Space Mono',monospace", color: C.ink }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 14, color: accent }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: accent, display: "inline-block" }} />
                  {type === "INGRESO" ? "INGRESO" : "EGRESO"}
                </span>
                <span style={{ fontSize: 12.5, color: C.muted }}>#nuevo</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: accent, letterSpacing: "-.01em", marginBottom: currency === "USD" && montoNum > 0 && exchangeRateNum > 0 ? 4 : 14 }}>
                {fmtMoney(montoNum, currency)}
              </div>
              {currency === "USD" && montoNum > 0 && exchangeRateNum > 0 && (
                <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14 }}>
                  ≈ {fmtMoney(montoNum * exchangeRateNum, "MXN")}
                </div>
              )}
              <div style={{ borderTop: `1.5px dashed ${C.line}`, paddingTop: 12, fontSize: 12.5, color: C.deep, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={reciboRow}><Calendar size={13} color={C.muted} /> {fmtFechaCorta(fecha)}</div>
                <div style={reciboRow}><User size={13} color={C.muted} /> {responsable.full_name}</div>
                <div style={reciboRow}><span style={{ fontSize: 14 }}>{cajaObj?.emoji ?? ""}</span> {cajaObj ? cajaObj.name : "—"}</div>
                <div style={reciboRow}>
                  {tender === "EFECTIVO" ? <Banknote size={13} color={C.muted} /> : tender === "TARJETA" ? <CreditCard size={13} color={C.muted} /> : <ArrowLeftRight size={13} color={C.muted} />}
                  {tender === "EFECTIVO" ? "Efectivo" : tender === "TARJETA" ? "Tarjeta" : "Transferencia"} · {areaObj?.name ?? "—"}
                </div>
                <div style={{ marginTop: 8, color: C.ink, fontWeight: 700, wordBreak: "break-word" }}>
                  {concepto.trim() || <span style={{ color: "#B7C4C4", fontWeight: 400 }}>— concepto —</span>}
                </div>
              </div>
            </div>
            {/* Perforación inferior */}
            <div style={{ height: 12, background: `radial-gradient(circle at 6px 12px, ${C.mist} 6px, transparent 7px) repeat-x`, backgroundSize: "12px 12px", marginTop: -1 }} />
          </div>
        </div>

        {/* Botón registrar */}
        <button onClick={registrar} disabled={!valido || submitting}
          style={{ width: "100%", marginTop: 22, padding: "16px", borderRadius: 15, border: "none",
            background: valido && !submitting ? accent : "#C4D2D1", color: "#fff", fontSize: 16, fontWeight: 700,
            fontFamily: "'Instrument Sans',sans-serif", cursor: valido && !submitting ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: valido && !submitting ? `0 8px 18px ${accent}44` : "none", transition: "all .18s" }}>
          <Check size={19} strokeWidth={2.6} /> {submitting ? "Guardando…" : `Registrar ${type === "INGRESO" ? "ingreso" : "egreso"}`}
        </button>
        {!valido && (
          <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 9 }}>
            Falta {montoNum <= 0 ? "el monto" : currency === "USD" && exchangeRateNum <= 0 ? "el tipo de cambio" : "el concepto"} para poder registrar.
          </div>
        )}

        {/* Movimientos de hoy */}
        <div style={{ marginTop: 34 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 17 }}>Movimientos de hoy</span>
            <span style={{ fontSize: 12.5, color: C.muted }}>{movs.length} registrados</span>
          </div>

          {movs.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, background: C.inSoft, borderRadius: 13, padding: "11px 13px" }}>
                <div style={{ fontSize: 11.5, color: C.in, fontWeight: 600 }}>Ingresos MXN</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 16, color: C.in }}>{fmtMoney(totales.i, "")}</div>
              </div>
              <div style={{ flex: 1, background: C.outSoft, borderRadius: 13, padding: "11px 13px" }}>
                <div style={{ fontSize: 11.5, color: C.out, fontWeight: 600 }}>Egresos MXN</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 16, color: C.out }}>{fmtMoney(totales.e, "")}</div>
              </div>
            </div>
          )}

          {movs.length === 0 ? (
            <div style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 15, padding: "26px 18px", textAlign: "center", color: C.muted, fontSize: 13.5 }}>
              Aún no hay movimientos hoy.<br />Registra el primero arriba.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {movs.map((m) => {
                const mCaja = cajaMap.get(m.caja_id);
                const mArea = areaMap.get(m.area_id);
                return (
                  <div key={m.id} className="cr-anim" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 18,
                      background: m.type === "INGRESO" ? C.inSoft : C.outSoft }}>{mCaja?.emoji ?? "🏷️"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.concept}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>#{m.folio} · {mCaja?.name ?? "—"} · {mArea?.name ?? "—"}</div>
                    </div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 14, color: m.type === "INGRESO" ? C.in : C.out, whiteSpace: "nowrap" }}>
                      {m.type === "INGRESO" ? "+" : "−"}{fmtMoney(Number(m.amount), m.currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="cr-anim" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", maxWidth: "90vw",
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