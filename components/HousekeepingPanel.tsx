"use client";

import { useMemo, useState } from "react";
import { Check, X, ChevronLeft, ChevronRight, Sparkles, User } from "lucide-react";
import { guardarLimpieza, type HkRow } from "@/app/housekeeping/actions";

const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
};
const display = { fontFamily: "var(--font-bricolage), sans-serif" } as const;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fFecha = (iso: string) => { const d = new Date(iso + "T00:00:00"); return d.getDate() + "/" + MESES[d.getMonth()]; };
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const ESTADOS: { code: string; label: string; bg: string; fg: string }[] = [
  { code: "PENDIENTE", label: "Pendiente", bg: C.mist, fg: C.muted },
  { code: "LIMPIEZA", label: "Limpieza", bg: "#F6ECD6", fg: "#9A6A12" },
  { code: "REFRESCADA", label: "Refrescada", bg: "#E4EDFB", fg: "#2E6FDB" },
  { code: "SALIDA", label: "Salida", bg: C.outSoft, fg: C.out },
  { code: "LLEGADA", label: "Llegada", bg: "#E4F1F1", fg: C.deep },
  { code: "SALIDA_LLEGADA", label: "Salida+Llegada", bg: "#EFE7FB", fg: "#7A5AF8" },
  { code: "LISTA", label: "Lista", bg: C.inSoft, fg: C.in },
];
const estInfo = (code: string) => ESTADOS.find((e) => e.code === code) ?? ESTADOS[0];

type Room = { id: string; code: string; name: string | null };
type Cam = { id: string; full_name: string };
type Resv = { room_id: string; check_in: string; check_out: string; status: string; guest: { full_name: string } | null; special_requests: string | null };
type Props = { fecha: string; hoy: string; rooms: Room[]; camaristas: Cam[]; housekeeping: HkRow[]; reservas: Resv[] };
type Toast = { msg: string; kind: "success" | "error" };

export default function HousekeepingPanel({ fecha: fInit, hoy, rooms, camaristas, housekeeping, reservas }: Props) {
  const [fecha, setFecha] = useState(fInit);
  const [hk, setHk] = useState<HkRow[]>(housekeeping);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const camMap = useMemo(() => new Map(camaristas.map((c) => [c.id, c.full_name])), [camaristas]);
  const notify = (t: Toast) => { setToast(t); setTimeout(() => setToast(null), 2600); };

  const hkDe = (roomId: string) => hk.find((h) => h.room_id === roomId && h.date === fecha) ?? null;
  const resvDe = (roomId: string) => reservas.find((r) => r.status !== "CANCELADA" && r.room_id === roomId && r.check_in <= fecha && r.check_out > fecha) ?? null;

  const resumen = useMemo(() => {
    const c: Record<string, number> = {};
    for (const room of rooms) { const s = hkDe(room.id)?.status ?? "PENDIENTE"; c[s] = (c[s] ?? 0) + 1; }
    return c;
  }, [hk, fecha, rooms]);
  const listas = resumen["LISTA"] ?? 0;

  const guardar = async (roomId: string, status: string, assignedTo: string | null) => {
    const res = await guardarLimpieza({ roomId, date: fecha, status, assignedTo, notes: "" });
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    setHk([...hk.filter((h) => !(h.room_id === roomId && h.date === fecha)), res.row]);
    notify({ msg: "Actualizado ✓", kind: "success" });
  };

  const inputCls = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, color: C.ink, background: C.card, outline: "none", fontFamily: "var(--font-instrument-sans),sans-serif" } as const;

  return (
    <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 32px" }}>
        <h1 style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: "0 0 4px" }}>Limpieza</h1>
        <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 14px" }}>Estado de las habitaciones</p>

        {/* Fecha */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setFecha(addDays(fecha, -1))} style={{ padding: 8, borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", display: "grid", placeItems: "center" }}><ChevronLeft size={16} color={C.muted} /></button>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ ...inputCls, flex: 1, textAlign: "center" }} />
          <button onClick={() => setFecha(addDays(fecha, 1))} style={{ padding: 8, borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", display: "grid", placeItems: "center" }}><ChevronRight size={16} color={C.muted} /></button>
          <button onClick={() => setFecha(hoy)} style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: fecha === hoy ? "#E4F1F1" : C.card, color: fecha === hoy ? C.deep : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Hoy</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 16px", marginBottom: 18 }}>
          <span style={{ fontSize: 13.5, color: C.muted }}>{fFecha(fecha)} · <b style={{ color: C.ink }}>{listas}/{rooms.length}</b> listas</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.teal, fontWeight: 700, fontSize: 13.5 }}><Sparkles size={15} /> {Math.round((listas / Math.max(1, rooms.length)) * 100)}%</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {rooms.map((room) => {
            const h = hkDe(room.id); const st = estInfo(h?.status ?? "PENDIENTE");
            const rv = resvDe(room.id); const open = abierto === room.id;
            return (
              <div key={room.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
                <div onClick={() => setAbierto(open ? null : room.id)} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: C.mist, display: "grid", placeItems: "center", fontFamily: "var(--font-space-mono),monospace", fontWeight: 700, fontSize: 13, color: C.deep }}>{room.code.replace("i ", "i")}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rv?.guest?.full_name ?? "Sin huésped"}</div>
                    <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}>{h?.assigned_to ? <><User size={11} /> {camMap.get(h.assigned_to) ?? "—"}</> : "Sin asignar"}{rv?.special_requests ? " · " + rv.special_requests : ""}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: st.bg, color: st.fg, whiteSpace: "nowrap" }}>{st.label}</span>
                </div>
                {open && (
                  <div style={{ borderTop: `1px solid ${C.line}`, padding: 14, background: "#FAFCFC" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>Estado</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
                      {ESTADOS.map((e) => {
                        const on = (h?.status ?? "PENDIENTE") === e.code;
                        return (
                          <button key={e.code} onClick={() => guardar(room.id, e.code, h?.assigned_to ?? null)}
                            style={{ padding: "7px 11px", borderRadius: 999, border: on ? `1.5px solid ${e.fg}` : `1.5px solid ${C.line}`, background: on ? e.bg : C.card, color: on ? e.fg : C.muted, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
                            {e.label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>Camarista</div>
                    <select value={h?.assigned_to ?? ""} onChange={(e) => guardar(room.id, h?.status ?? "PENDIENTE", e.target.value || null)} style={{ ...inputCls, appearance: "none" }}>
                      <option value="">Sin asignar</option>
                      {camaristas.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                  </div>
                )}
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