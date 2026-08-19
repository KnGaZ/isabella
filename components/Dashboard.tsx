"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Scale, ChevronRight } from "lucide-react";

const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
};
const mono = { fontFamily: "var(--font-space-mono), monospace" } as const;
const display = { fontFamily: "var(--font-bricolage), sans-serif" } as const;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtFechaCorta = (iso: string) => { const d = new Date(iso + "T00:00:00"); return d.getDate() + "/" + MESES[d.getMonth()]; };
const money = (n: number, cur = "") =>
  "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (cur ? " " + cur : "");

// utilidades de fecha en string ISO (sin líos de zona horaria)
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
};
const eachDay = (from: string, to: string) => {
  const out: string[] = []; let c = from; let guard = 0;
  while (c <= to && guard < 400) { out.push(c); c = addDays(c, 1); guard++; }
  return out;
};

type CajaLite = { id: string; name: string; emoji: string | null };
type BalanceRow = { caja_id: string; currency: "MXN" | "USD"; balance: number };
type DailyTotal = { date: string; ingresos: number; egresos: number };
type DailyByCaja = { date: string; caja_id: string; ingresos: number; egresos: number };

type Props = {
  fecha: string;
  cajas: CajaLite[];
  balances: BalanceRow[];
  dailyTotals: DailyTotal[];
  dailyByCaja: DailyByCaja[];
  descuadre: number | null;
};

type Periodo = "hoy" | "semana" | "mes" | "rango";

export default function Dashboard({ fecha, cajas, balances, dailyTotals, dailyByCaja, descuadre }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const [rIni, setRIni] = useState(addDays(fecha, -6));
  const [rFin, setRFin] = useState(fecha);

  // Efectivo en caja (no depende del periodo)
  const balMap = new Map<string, { MXN: number; USD: number }>();
  for (const b of balances) {
    const cur = balMap.get(b.caja_id) ?? { MXN: 0, USD: 0 };
    cur[b.currency] = Number(b.balance); balMap.set(b.caja_id, cur);
  }
  const totalMXN = balances.filter((b) => b.currency === "MXN").reduce((s, b) => s + Number(b.balance), 0);
  const totalUSD = balances.filter((b) => b.currency === "USD").reduce((s, b) => s + Number(b.balance), 0);

  // Rango del periodo
  const [from, to] = useMemo<[string, string]>(() => {
    if (periodo === "hoy") return [fecha, fecha];
    if (periodo === "semana") return [addDays(fecha, -6), fecha];
    if (periodo === "mes") return [fecha.slice(0, 8) + "01", fecha];
    return [rIni <= rFin ? rIni : rFin, rIni <= rFin ? rFin : rIni];
  }, [periodo, fecha, rIni, rFin]);

  // Totales del periodo
  const enRango = (d: string) => d >= from && d <= to;
  const totalesPeriodo = useMemo(() => {
    let i = 0, e = 0;
    for (const t of dailyTotals) if (enRango(t.date)) { i += Number(t.ingresos); e += Number(t.egresos); }
    return { i, e };
  }, [dailyTotals, from, to]);

  const porCaja = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of dailyByCaja) if (enRango(r.date)) m.set(r.caja_id, (m.get(r.caja_id) ?? 0) + Number(r.ingresos));
    return m;
  }, [dailyByCaja, from, to]);
  const maxIng = Math.max(1, ...cajas.map((c) => porCaja.get(c.id) ?? 0));
  const cajasPorIngreso = [...cajas].sort((a, b) => (porCaja.get(b.id) ?? 0) - (porCaja.get(a.id) ?? 0));

  // Serie por día (para la gráfica)
  const serie = useMemo(() => {
    const idx = new Map(dailyTotals.map((t) => [t.date, t]));
    return eachDay(from, to).map((d) => ({ date: d, ingresos: Number(idx.get(d)?.ingresos ?? 0), egresos: Number(idx.get(d)?.egresos ?? 0) }));
  }, [dailyTotals, from, to]);
  const maxDia = Math.max(1, ...serie.map((s) => Math.max(s.ingresos, s.egresos)));

  const neto = totalesPeriodo.i - totalesPeriodo.e;
  const totalDia = totalesPeriodo.i + totalesPeriodo.e;
  const pctIng = totalDia > 0 ? (totalesPeriodo.i / totalDia) * 100 : 0;
  const etiquetaPeriodo = periodo === "hoy" ? "hoy" : periodo === "semana" ? "últimos 7 días" : periodo === "mes" ? "este mes" : `${fmtFechaCorta(from)}–${fmtFechaCorta(to)}`;

  const segPeriodo = (p: Periodo, label: string) => (
    <button key={p} onClick={() => setPeriodo(p)}
      style={{ flex: 1, padding: "9px 4px", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13,
        fontFamily: "var(--font-instrument-sans),sans-serif", background: periodo === p ? C.card : "transparent",
        color: periodo === p ? C.ink : C.muted, boxShadow: periodo === p ? "0 1px 3px rgba(11,43,48,.14)" : "none" }}>
      {label}
    </button>
  );

  return (
    <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 32px" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: 0 }}>Concentrado</h1>
          <p style={{ fontSize: 13.5, color: C.muted, margin: "4px 0 0" }}>Hoy · {fmtFechaCorta(fecha)}</p>
        </div>

        {/* Efectivo en caja (estado actual, sin periodo) */}
        <section style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.line}`, padding: 20, boxShadow: "0 6px 22px rgba(11,43,48,.06)", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: C.muted }}>Efectivo en caja ahora</div>
          <div style={{ ...mono, fontSize: 34, fontWeight: 700, color: C.ink, marginTop: 4, lineHeight: 1.1 }}>
            {money(totalMXN)}<span style={{ fontSize: 15, color: C.muted, marginLeft: 6 }}>MXN</span>
          </div>
          {totalUSD !== 0 && <div style={{ ...mono, fontSize: 14, color: C.muted, marginTop: 2 }}>+ {money(totalUSD)} USD</div>}
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 16, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {cajas.map((c) => {
              const b = balMap.get(c.id) ?? { MXN: 0, USD: 0 };
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{c.emoji ?? "🏷️"}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                  <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: b.MXN < 0 ? C.out : C.ink }}>{money(b.MXN)}</span>
                  {b.USD !== 0 && <span style={{ ...mono, fontSize: 12, color: C.muted, marginLeft: 8 }}>{money(b.USD)} USD</span>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Selector de periodo */}
        <div style={{ display: "flex", background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: 4, marginBottom: 12 }}>
          {segPeriodo("hoy", "Hoy")}{segPeriodo("semana", "Semana")}{segPeriodo("mes", "Mes")}{segPeriodo("rango", "Rango")}
        </div>
        {periodo === "rango" && (
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input type="date" value={rIni} max={fecha} onChange={(e) => setRIni(e.target.value)}
              style={{ flex: 1, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, background: C.card, color: C.ink, fontFamily: "var(--font-instrument-sans),sans-serif" }} />
            <input type="date" value={rFin} max={fecha} onChange={(e) => setRFin(e.target.value)}
              style={{ flex: 1, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, background: C.card, color: C.ink, fontFamily: "var(--font-instrument-sans),sans-serif" }} />
          </div>
        )}

        {/* Ingresos vs egresos del periodo */}
        <section style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, background: C.inSoft, borderRadius: 16, padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.in, fontSize: 12.5, fontWeight: 600 }}><ArrowUpRight size={15} /> Ingresos</div>
              <div style={{ ...mono, fontSize: 20, fontWeight: 700, color: C.in, marginTop: 4 }}>{money(totalesPeriodo.i)}</div>
            </div>
            <div style={{ flex: 1, background: C.outSoft, borderRadius: 16, padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.out, fontSize: 12.5, fontWeight: 600 }}><ArrowDownRight size={15} /> Egresos</div>
              <div style={{ ...mono, fontSize: 20, fontWeight: 700, color: C.out, marginTop: 4 }}>{money(totalesPeriodo.e)}</div>
            </div>
          </div>

          {/* Gráfica por día (si el periodo abarca más de un día) */}
          {serie.length > 1 && (
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "14px 12px 10px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "stretch", gap: serie.length > 40 ? 1 : 3, height: 90, overflowX: "auto" }}>
                {serie.map((s) => (
                  <div key={s.date} title={`${fmtFechaCorta(s.date)} · +${money(s.ingresos)} / -${money(s.egresos)}`}
                    style={{ flex: "1 0 auto", minWidth: serie.length > 40 ? 3 : 6, display: "flex", flexDirection: "column", justifyContent: "center", gap: 1 }}>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 40 }}>
                      <div style={{ height: `${(s.ingresos / maxDia) * 100}%`, background: C.in, borderRadius: "3px 3px 0 0", minHeight: s.ingresos > 0 ? 2 : 0 }} />
                    </div>
                    <div style={{ height: 1, background: C.line }} />
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", height: 40 }}>
                      <div style={{ height: `${(s.egresos / maxDia) * 100}%`, background: C.out, borderRadius: "0 0 3px 3px", minHeight: s.egresos > 0 ? 2 : 0 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: C.muted }}>
                <span>{fmtFechaCorta(from)}</span><span>{fmtFechaCorta(to)}</span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: C.muted }}>Neto · {etiquetaPeriodo}</span>
            <span style={{ ...mono, fontWeight: 700, color: neto >= 0 ? C.in : C.out }}>{neto >= 0 ? "+" : "−"}{money(Math.abs(neto))} MXN</span>
          </div>
          {totalDia > 0 && (
            <div style={{ height: 8, borderRadius: 999, background: C.outSoft, overflow: "hidden", display: "flex", marginTop: 8 }}>
              <div style={{ width: `${pctIng}%`, background: C.in }} />
            </div>
          )}
        </section>

        {/* Ingresos por línea del periodo */}
        <section style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.line}`, padding: 18, boxShadow: "0 6px 22px rgba(11,43,48,.06)", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: C.muted, marginBottom: 14 }}>
            Ingresos por línea · {etiquetaPeriodo}
          </div>
          {totalesPeriodo.i === 0 ? (
            <div style={{ fontSize: 13.5, color: C.muted, textAlign: "center", padding: "8px 0" }}>
              Sin ingresos en este periodo.{periodo === "hoy" ? " Prueba con Semana o Mes." : ""}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {cajasPorIngreso.map((c) => {
                const v = porCaja.get(c.id) ?? 0;
                return (
                  <div key={c.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 15 }}>{c.emoji ?? "🏷️"}</span>
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{c.name}</span>
                      <span style={{ ...mono, fontSize: 13.5, fontWeight: 700, color: v > 0 ? C.ink : C.muted }}>{money(v)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: C.mist, overflow: "hidden" }}>
                      <div style={{ width: `${(v / maxIng) * 100}%`, height: "100%", background: C.teal, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Arqueo */}
        <Link href="/arqueo" style={{ display: "flex", alignItems: "center", gap: 12, background: C.card, borderRadius: 16, border: `1px solid ${C.line}`, padding: "14px 16px", textDecoration: "none", color: "inherit" }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "grid", placeItems: "center", background: descuadre === null ? C.mist : descuadre === 0 ? C.inSoft : C.outSoft }}>
            <Scale size={18} color={descuadre === null ? C.muted : descuadre === 0 ? C.in : C.out} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Arqueo de efectivo</div>
            <div style={{ fontSize: 12.5, color: C.muted }}>
              {descuadre === null ? "Sin arqueo hoy" : descuadre === 0 ? "Cuadrado ✓" : `Descuadre: ${money(Math.abs(descuadre))} MXN`}
            </div>
          </div>
          <ChevronRight size={18} color={C.muted} />
        </Link>
      </div>
    </div>
  );
}