"use client";

import { useMemo, useState } from "react";
import { Check, X, Plus, Pencil, CalendarDays, LogIn, LogOut, BedDouble, List, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { crearReserva, editarReserva, type ReservationInput, type ReservationRow } from "@/app/reservas/actions";

const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
};
const display = { fontFamily: "var(--font-bricolage), sans-serif" } as const;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DOW = ["D", "L", "M", "M", "J", "V", "S"];
const fFecha = (iso: string) => { if (!iso) return "—"; const d = new Date(iso + "T00:00:00"); return d.getDate() + "/" + MESES[d.getMonth()]; };
const money = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const noches = (ci: string, co: string) => Math.max(0, Math.round((+new Date(co) - +new Date(ci)) / 86400000));
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const idxOf = (iso: string, start: string) => Math.round((+new Date(iso + "T00:00:00Z") - +new Date(start + "T00:00:00Z")) / 86400000);

const ESTATUS: Record<string, { label: string; bg: string; fg: string }> = {
  CONFIRMADA: { label: "Confirmada", bg: "#E4F1F1", fg: C.deep },
  EN_CASA: { label: "En casa", bg: C.inSoft, fg: C.in },
  SALIDA: { label: "Salida", bg: C.mist, fg: C.muted },
  CANCELADA: { label: "Cancelada", bg: C.outSoft, fg: C.out },
  NO_SHOW: { label: "No llegó", bg: C.outSoft, fg: C.out },
};
const ESTATUS_OPC = ["CONFIRMADA", "EN_CASA", "SALIDA", "CANCELADA", "NO_SHOW"];

// Color de barra por canal
const CHAN_COLOR: Record<string, string> = { BOOKING: "#2E6FDB", EXPEDIA: "#C98A1B", MHC: "#7A5AF8", DIRECTO: "#0E8C8C", OTRO: "#0B5563" };

type Room = { id: string; code: string; name: string | null };
type Channel = { id: string; code: string; name: string };
type Props = { fecha: string; rooms: Room[]; channels: Channel[]; reservasIniciales: ReservationRow[] };
type Toast = { msg: string; kind: "success" | "error" };

const vacio = (fecha: string, roomId: string, channelId: string): ReservationInput => ({
  roomId, guestName: "", guestPhone: "", checkIn: fecha, checkOut: addDays(fecha, 1), pax: 2,
  channelId: channelId || null, ratePerNight: null, breakfast: false, specialRequests: "", notes: "", status: "CONFIRMADA",
});

export default function ReservasPanel({ fecha: hoy, rooms, channels, reservasIniciales }: Props) {
  const [reservas, setReservas] = useState<ReservationRow[]>(reservasIniciales);
  const [pantalla, setPantalla] = useState<"main" | "form">("main");
  const [vista, setVista] = useState<"lista" | "calendario">("lista");
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState<ReservationInput>(vacio(hoy, rooms[0]?.id ?? "", channels[0]?.id ?? ""));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [detalle, setDetalle] = useState<ReservationRow | null>(null);

  // Fecha seleccionada: por defecto hoy, o la reserva más reciente si hoy no tiene actividad
  const defaultFecha = useMemo(() => {
    const act = reservasIniciales.some((r) => r.status !== "CANCELADA" && r.check_in <= hoy && r.check_out > hoy);
    if (act || reservasIniciales.length === 0) return hoy;
    return [...reservasIniciales].sort((a, b) => b.check_in.localeCompare(a.check_in))[0].check_in;
  }, [reservasIniciales, hoy]);
  const [fecha, setFecha] = useState(defaultFecha);

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const chanMap = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels]);
  const chanColor = (id: string | null) => (id ? CHAN_COLOR[chanMap.get(id)?.code ?? "OTRO"] ?? C.muted : C.muted);
  const notify = (t: Toast) => { setToast(t); setTimeout(() => setToast(null), 3200); };

  const activas = reservas.filter((r) => r.status !== "CANCELADA");
  const llegadas = activas.filter((r) => r.check_in === fecha);
  const salidas = activas.filter((r) => r.check_out === fecha);
  const enCasa = activas.filter((r) => r.check_in <= fecha && r.check_out > fecha);
  const ocupadas = new Set(enCasa.map((r) => r.room_id)).size;

  const abrirNueva = () => { setEditId(null); setF(vacio(fecha, rooms[0]?.id ?? "", channels[0]?.id ?? "")); setPantalla("form"); };
  const abrirEdit = (r: ReservationRow) => {
    setEditId(r.id);
    setF({ roomId: r.room_id, guestName: r.guest?.full_name ?? "", guestPhone: r.guest?.phone ?? "", checkIn: r.check_in, checkOut: r.check_out, pax: r.pax, channelId: r.channel_id, ratePerNight: r.rate_per_night, breakfast: r.breakfast_included, specialRequests: r.special_requests ?? "", notes: r.notes ?? "", status: r.status });
    setPantalla("form");
  };
  const guardar = async () => {
    if (saving) return; setSaving(true);
    const res = editId ? await editarReserva(editId, f) : await crearReserva(f);
    setSaving(false);
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    if (editId) setReservas(reservas.map((x) => (x.id === editId ? res.reserva : x)));
    else setReservas([...reservas, res.reserva]);
    notify({ msg: editId ? "Reserva actualizada ✓" : "Reserva creada ✓", kind: "success" });
    setPantalla("main");
  };
  const set = (k: keyof ReservationInput, v: unknown) => setF({ ...f, [k]: v });

  const inputCls = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "12px 13px", fontSize: 14.5, color: C.ink, background: C.card, outline: "none", fontFamily: "var(--font-instrument-sans),sans-serif" } as const;
  const label = { fontSize: 11.5, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: C.muted, marginBottom: 6, display: "block" } as const;
  const nom = (r: ReservationRow) => r.guest?.full_name ?? "Sin nombre";

  const Tarjeta = ({ r }: { r: ReservationRow }) => {
    const room = roomMap.get(r.room_id); const est = ESTATUS[r.status] ?? ESTATUS.CONFIRMADA;
    return (
      <div onClick={() => setDetalle(r)} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: C.mist, display: "grid", placeItems: "center", fontFamily: "var(--font-space-mono),monospace", fontWeight: 700, fontSize: 13, color: C.deep }}>{(room?.code ?? "—").replace("i ", "i")}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nom(r)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{fFecha(r.check_in)} → {fFecha(r.check_out)} · {r.pax ?? "?"} pax{r.channel_id ? " · " + (chanMap.get(r.channel_id)?.name ?? "") : ""}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: est.bg, color: est.fg, whiteSpace: "nowrap" }}>{est.label}</span>
      </div>
    );
  };

  /* ===================== FORM ===================== */
  if (pantalla === "form") {
    const n = noches(f.checkIn, f.checkOut); const total = f.ratePerNight ? f.ratePerNight * n : 0;
    return (
      <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
        <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 32px" }}>
          <h1 style={{ ...display, fontWeight: 800, fontSize: 24, letterSpacing: "-.02em", margin: "0 0 16px" }}>{editId ? "Editar reserva" : "Nueva reserva"}</h1>
          <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={label}>Habitación</label>
              <select value={f.roomId} onChange={(e) => set("roomId", e.target.value)} style={{ ...inputCls, appearance: "none" }}>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.code}{r.name ? " · " + r.name : ""}</option>)}
              </select></div>
            <div><label style={label}>Huésped</label><input value={f.guestName} onChange={(e) => set("guestName", e.target.value)} style={inputCls} placeholder="Nombre completo" /></div>
            <div><label style={label}>WhatsApp del huésped</label><input value={f.guestPhone} onChange={(e) => set("guestPhone", e.target.value)} style={inputCls} placeholder="Ej. 5219981234567" inputMode="tel" /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><label style={label}>Check-in</label><input type="date" value={f.checkIn} onChange={(e) => set("checkIn", e.target.value)} style={inputCls} /></div>
              <div style={{ flex: 1 }}><label style={label}>Check-out</label><input type="date" value={f.checkOut} onChange={(e) => set("checkOut", e.target.value)} style={inputCls} /></div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 90 }}><label style={label}>Pax</label><input type="number" min={1} value={f.pax ?? ""} onChange={(e) => set("pax", parseInt(e.target.value) || null)} style={inputCls} /></div>
              <div style={{ flex: 1 }}><label style={label}>Canal</label>
                <select value={f.channelId ?? ""} onChange={(e) => set("channelId", e.target.value || null)} style={{ ...inputCls, appearance: "none" }}>
                  <option value="">—</option>{channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
            </div>
            <div><label style={label}>Tarifa por noche (opcional)</label>
              <input inputMode="decimal" value={f.ratePerNight ?? ""} onChange={(e) => set("ratePerNight", e.target.value ? Number(e.target.value.replace(/[^\d.]/g, "")) : null)} style={inputCls} placeholder="0.00" />
              {f.ratePerNight ? <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{n} noche(s) · Total {money(total)} MXN</div> : null}</div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={f.breakfast} onChange={(e) => set("breakfast", e.target.checked)} style={{ width: 18, height: 18, accentColor: C.teal }} /> Desayuno incluido</label>
            <div><label style={label}>Solicitudes especiales</label><input value={f.specialRequests} onChange={(e) => set("specialRequests", e.target.value)} style={inputCls} placeholder="Ej. cuna, llegada tarde…" /></div>
            <div><label style={label}>Notas recepción</label><input value={f.notes} onChange={(e) => set("notes", e.target.value)} style={inputCls} placeholder="Opcional" /></div>
            <div><label style={label}>Estatus</label>
              <select value={f.status} onChange={(e) => set("status", e.target.value)} style={{ ...inputCls, appearance: "none" }}>
                {ESTATUS_OPC.map((s) => <option key={s} value={s}>{ESTATUS[s].label}</option>)}
              </select></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={() => setPantalla("main")} style={{ padding: "14px 18px", borderRadius: 14, border: `1.5px solid ${C.line}`, background: C.card, color: C.muted, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={{ flex: 1, padding: 14, borderRadius: 14, border: "none", background: saving ? "#C4D2D1" : C.teal, color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Check size={18} strokeWidth={2.6} /> {saving ? "Guardando…" : editId ? "Guardar cambios" : "Crear reserva"}</button>
          </div>
        </div>
        {toast && <ToastView toast={toast} />}
      </div>
    );
  }

  /* ===================== MAIN ===================== */
  const dias = 30; const dayW = 34; const labelW = 46; const rowH = 34;
  const winStart = fecha;
  const dayList = Array.from({ length: dias }, (_, i) => addDays(winStart, i));
  const canalesUsados = channels.filter((c) => activas.some((r) => r.channel_id === c.id));

  return (
    <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
      <div style={{ maxWidth: vista === "calendario" ? 760 : 430, margin: "0 auto", padding: "16px 16px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h1 style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: 0 }}>Reservas</h1>
          <button onClick={abrirNueva} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12, border: "none", background: C.teal, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}><Plus size={17} /> Nueva</button>
        </div>

        {/* Toggle vista */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 4, maxWidth: 260, flex: 1 }}>
            {([["lista", "Lista", List], ["calendario", "Calendario", CalendarDays]] as const).map(([v, l, Ic]) => (
              <button key={v} onClick={() => setVista(v)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13.5, fontFamily: "var(--font-instrument-sans),sans-serif", background: vista === v ? C.teal : "transparent", color: vista === v ? "#fff" : C.muted }}>
                <Ic size={15} /> {l}
              </button>
            ))}
          </div>
          <a href="/housekeeping" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: C.teal, textDecoration: "none", whiteSpace: "nowrap" }}><Sparkles size={15} /> Limpieza</a>
        </div>

        {/* Navegador de fecha */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setFecha(addDays(fecha, vista === "calendario" ? -7 : -1))} style={{ padding: 8, borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", display: "grid", placeItems: "center" }}><ChevronLeft size={16} color={C.muted} /></button>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ ...inputCls, padding: "8px 10px", flex: 1, textAlign: "center" }} />
          <button onClick={() => setFecha(addDays(fecha, vista === "calendario" ? 7 : 1))} style={{ padding: 8, borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", display: "grid", placeItems: "center" }}><ChevronRight size={16} color={C.muted} /></button>
          <button onClick={() => setFecha(hoy)} style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: fecha === hoy ? "#E4F1F1" : C.card, color: fecha === hoy ? C.deep : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Hoy</button>
        </div>

        {/* Resumen del día */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 8 }}>
          {[[LogIn, "Llegadas", llegadas.length, C.in, C.inSoft], [LogOut, "Salidas", salidas.length, C.out, C.outSoft], [BedDouble, "En casa", enCasa.length, C.deep, "#E4F1F1"]].map(([Ic, l, v, col, bg]) => {
            const Icon = Ic as typeof LogIn;
            return (
              <div key={l as string} style={{ background: bg as string, borderRadius: 14, padding: "12px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: col as string, fontSize: 11.5, fontWeight: 600 }}><Icon size={14} /> {l as string}</div>
                <div style={{ ...display, fontWeight: 800, fontSize: 22, color: col as string, marginTop: 2 }}>{v as number}</div>
              </div>);
          })}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 18, textAlign: "center" }}>{fFecha(fecha)} · Ocupación <b style={{ color: C.ink }}>{ocupadas}/{rooms.length}</b> ({Math.round((ocupadas / Math.max(1, rooms.length)) * 100)}%)</div>

        {vista === "lista" ? (
          <>
            {llegadas.length > 0 && <Seccion titulo={`Llegan ${fFecha(fecha)}`} items={llegadas} Tarjeta={Tarjeta} />}
            {salidas.length > 0 && <Seccion titulo={`Salen ${fFecha(fecha)}`} items={salidas} Tarjeta={Tarjeta} />}
            <div style={{ ...display, fontWeight: 700, fontSize: 16, margin: "18px 0 10px 2px" }}>Todas las reservas ({activas.length})</div>
            {activas.length === 0 ? (
              <div style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 15, padding: "28px 18px", textAlign: "center", color: C.muted, fontSize: 13.5 }}>Aún no hay reservas. Crea la primera con “Nueva”.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {[...activas].sort((a, b) => a.check_in.localeCompare(b.check_in)).map((r) => <Tarjeta key={r.id} r={r} />)}
              </div>
            )}
          </>
        ) : (
          <>
            {/* CALENDARIO */}
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <div style={{ width: labelW + dias * dayW }}>
                  {/* Header días */}
                  <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ width: labelW, flexShrink: 0, position: "sticky", left: 0, zIndex: 3, background: C.card, borderRight: `1px solid ${C.line}` }} />
                    {dayList.map((d) => {
                      const dd = new Date(d + "T00:00:00"); const esHoy = d === hoy; const esSel = d === fecha;
                      return (
                        <div key={d} style={{ width: dayW, flexShrink: 0, textAlign: "center", padding: "5px 0", background: esSel ? "#E4F1F1" : esHoy ? C.inSoft : "transparent" }}>
                          <div style={{ fontSize: 9, color: C.muted }}>{DOW[dd.getDay()]}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: esSel ? C.deep : C.ink }}>{dd.getDate()}</div>
                        </div>);
                    })}
                  </div>
                  {/* Filas de habitaciones */}
                  {rooms.map((room, ri) => {
                    const barras = activas.filter((r) => r.room_id === room.id && r.check_out > winStart && r.check_in < addDays(winStart, dias));
                    return (
                      <div key={room.id} style={{ display: "flex", height: rowH, borderBottom: ri < rooms.length - 1 ? `1px solid ${C.mist}` : "none" }}>
                        <div style={{ width: labelW, flexShrink: 0, position: "sticky", left: 0, zIndex: 2, background: C.card, borderRight: `1px solid ${C.line}`, display: "grid", placeItems: "center", fontFamily: "var(--font-space-mono),monospace", fontSize: 11, fontWeight: 700, color: C.deep }}>{room.code.replace("i ", "i")}</div>
                        <div style={{ position: "relative", width: dias * dayW }}>
                          {barras.map((r) => {
                            const s = Math.max(0, idxOf(r.check_in, winStart)); const e = Math.min(dias, idxOf(r.check_out, winStart));
                            const w = (e - s) * dayW - 3; if (w <= 0) return null;
                            return (
                              <button key={r.id} onClick={() => setDetalle(r)} title={`${nom(r)} · ${fFecha(r.check_in)}→${fFecha(r.check_out)}`}
                                style={{ position: "absolute", left: s * dayW + 1.5, top: 5, height: rowH - 12, width: w, background: chanColor(r.channel_id), color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", padding: "0 6px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", textAlign: "left" }}>
                                {nom(r)}
                              </button>);
                          })}
                        </div>
                      </div>);
                  })}
                </div>
              </div>
            </div>
            {/* Leyenda de canales */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, justifyContent: "center" }}>
              {canalesUsados.map((c) => (
                <span key={c.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: CHAN_COLOR[c.code] ?? C.muted }} /> {c.name}
                </span>
              ))}
              {activas.some((r) => !r.channel_id) && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}><span style={{ width: 11, height: 11, borderRadius: 3, background: C.muted }} /> Sin canal</span>}
            </div>
            <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 10 }}>Desliza el calendario de lado para ver los 30 días. Toca una barra para editar.</div>
          </>
        )}
      </div>
      {detalle && (
        <DetalleModal
          r={detalle}
          roomCode={roomMap.get(detalle.room_id)?.code ?? "—"}
          channelName={detalle.channel_id ? (chanMap.get(detalle.channel_id)?.name ?? null) : null}
          onClose={() => setDetalle(null)}
          onEdit={() => { const r = detalle; setDetalle(null); abrirEdit(r); }}
        />
      )}
      {toast && <ToastView toast={toast} />}
    </div>
  );
}

function DetalleModal({ r, roomCode, channelName, onClose, onEdit }: { r: ReservationRow; roomCode: string; channelName: string | null; onClose: () => void; onEdit: () => void }) {
  const est = ESTATUS[r.status] ?? ESTATUS.CONFIRMADA;
  const n = noches(r.check_in, r.check_out);
  const total = r.rate_per_night ? r.rate_per_night * n : 0;
  const phone = (r.guest?.phone ?? "").replace(/[^\d]/g, "");
  const Fila = ({ k, v }: { k: string; v: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: `1px solid ${C.mist}`, fontSize: 14 }}>
      <span style={{ color: C.muted }}>{k}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,42,48,.45)", zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, width: "100%", maxWidth: 430, borderRadius: "22px 22px 0 0", padding: "20px 20px 28px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: C.mist, display: "grid", placeItems: "center", fontFamily: "var(--font-space-mono),monospace", fontWeight: 700, fontSize: 14, color: C.deep }}>{roomCode.replace("i ", "i")}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...display, fontWeight: 800, fontSize: 18 }}>{r.guest?.full_name ?? "Sin nombre"}</div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: est.bg, color: est.fg }}>{est.label}</span>
          </div>
          <button onClick={onClose} style={{ background: C.mist, border: "none", borderRadius: 999, width: 32, height: 32, cursor: "pointer", display: "grid", placeItems: "center" }}><X size={17} color={C.muted} /></button>
        </div>

        <Fila k="Fechas" v={`${fFecha(r.check_in)} → ${fFecha(r.check_out)} · ${n} noche(s)`} />
        <Fila k="Pax" v={String(r.pax ?? "—")} />
        <Fila k="Canal" v={channelName ?? "—"} />
        {r.rate_per_night ? <Fila k="Tarifa" v={`${money(r.rate_per_night)}/noche · Total ${money(total)}`} /> : null}
        <Fila k="Desayuno" v={r.breakfast_included ? "Incluido" : "No"} />
        {r.special_requests ? <Fila k="Solicitudes" v={r.special_requests} /> : null}
        {r.notes ? <Fila k="Notas" v={r.notes} /> : null}
        {r.guest?.phone ? <Fila k="WhatsApp" v={r.guest.phone} /> : null}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          {phone && (
            <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: "center", padding: 13, borderRadius: 13, background: C.inSoft, color: C.in, fontWeight: 700, fontSize: 14.5, textDecoration: "none" }}>WhatsApp</a>
          )}
          <button onClick={onEdit} style={{ flex: 1, padding: 13, borderRadius: 13, border: "none", background: C.teal, color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Pencil size={16} /> Editar</button>
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, items, Tarjeta }: { titulo: string; items: ReservationRow[]; Tarjeta: (p: { r: ReservationRow }) => React.ReactElement }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...display, fontWeight: 700, fontSize: 14, margin: "0 0 8px 2px", color: C.deep }}>{titulo} ({items.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{items.map((r) => <Tarjeta key={r.id} r={r} />)}</div>
    </div>
  );
}

function ToastView({ toast }: { toast: Toast }) {
  return (
    <div style={{ position: "fixed", left: "50%", bottom: 88, transform: "translateX(-50%)", maxWidth: "90vw", background: C.ink, color: "#fff", padding: "12px 18px", borderRadius: 999, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 30px rgba(0,0,0,.28)", zIndex: 50 }}>
      <div style={{ width: 20, height: 20, borderRadius: 999, flexShrink: 0, background: toast.kind === "success" ? C.in : C.out, display: "grid", placeItems: "center" }}>
        {toast.kind === "success" ? <Check size={13} strokeWidth={3} color="#fff" /> : <X size={13} strokeWidth={3} color="#fff" />}
      </div>
      {toast.msg}
    </div>
  );
}