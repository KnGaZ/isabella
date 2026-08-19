"use client";

import { useMemo, useState } from "react";
import { Check, X, Plus, Pencil, CalendarDays, LogIn, LogOut, BedDouble } from "lucide-react";
import { crearReserva, editarReserva, type ReservationInput, type ReservationRow } from "@/app/reservas/actions";

const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
  amber: "#C98A1B", amberSoft: "#F6ECD6",
};
const display = { fontFamily: "var(--font-bricolage), sans-serif" } as const;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fFecha = (iso: string) => { if (!iso) return "—"; const d = new Date(iso + "T00:00:00"); return d.getDate() + "/" + MESES[d.getMonth()]; };
const money = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const noches = (ci: string, co: string) => Math.max(0, Math.round((+new Date(co) - +new Date(ci)) / 86400000));

const ESTATUS: Record<string, { label: string; bg: string; fg: string }> = {
  CONFIRMADA: { label: "Confirmada", bg: "#E4F1F1", fg: C.deep },
  EN_CASA: { label: "En casa", bg: C.inSoft, fg: C.in },
  SALIDA: { label: "Salida", bg: C.mist, fg: C.muted },
  CANCELADA: { label: "Cancelada", bg: C.outSoft, fg: C.out },
  NO_SHOW: { label: "No llegó", bg: C.outSoft, fg: C.out },
};
const ESTATUS_OPC = ["CONFIRMADA", "EN_CASA", "SALIDA", "CANCELADA", "NO_SHOW"];

type Room = { id: string; code: string; name: string | null };
type Channel = { id: string; code: string; name: string };
type Props = { fecha: string; rooms: Room[]; channels: Channel[]; reservasIniciales: ReservationRow[] };
type Toast = { msg: string; kind: "success" | "error" };

const vacio = (fecha: string, roomId: string, channelId: string): ReservationInput => ({
  roomId, guestName: "", guestPhone: "", checkIn: fecha, checkOut: fecha, pax: 2,
  channelId: channelId || null, ratePerNight: null, breakfast: false, specialRequests: "", notes: "", status: "CONFIRMADA",
});

export default function ReservasPanel({ fecha, rooms, channels, reservasIniciales }: Props) {
  const [reservas, setReservas] = useState<ReservationRow[]>(reservasIniciales);
  const [modo, setModo] = useState<"lista" | "form">("lista");
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState<ReservationInput>(vacio(fecha, rooms[0]?.id ?? "", channels[0]?.id ?? ""));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const chanMap = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels]);
  const notify = (t: Toast) => { setToast(t); setTimeout(() => setToast(null), 3200); };

  const activas = reservas.filter((r) => r.status !== "CANCELADA");
  const llegadas = activas.filter((r) => r.check_in === fecha);
  const salidas = activas.filter((r) => r.check_out === fecha);
  const enCasa = activas.filter((r) => r.check_in <= fecha && r.check_out > fecha);
  const ocupadas = new Set(enCasa.map((r) => r.room_id)).size;

  const abrirNueva = () => { setEditId(null); setF(vacio(fecha, rooms[0]?.id ?? "", channels[0]?.id ?? "")); setModo("form"); };
  const abrirEdit = (r: ReservationRow) => {
    setEditId(r.id);
    setF({
      roomId: r.room_id, guestName: r.guest?.full_name ?? "", guestPhone: r.guest?.phone ?? "",
      checkIn: r.check_in, checkOut: r.check_out, pax: r.pax, channelId: r.channel_id,
      ratePerNight: r.rate_per_night, breakfast: r.breakfast_included,
      specialRequests: r.special_requests ?? "", notes: r.notes ?? "", status: r.status,
    });
    setModo("form");
  };

  const guardar = async () => {
    if (saving) return; setSaving(true);
    const res = editId ? await editarReserva(editId, f) : await crearReserva(f);
    setSaving(false);
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    if (editId) setReservas(reservas.map((x) => (x.id === editId ? res.reserva : x)));
    else setReservas([...reservas, res.reserva]);
    notify({ msg: editId ? "Reserva actualizada ✓" : "Reserva creada ✓", kind: "success" });
    setModo("lista");
  };

  const set = (k: keyof ReservationInput, v: unknown) => setF({ ...f, [k]: v });
  const inputCls = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "12px 13px", fontSize: 14.5, color: C.ink, background: C.card, outline: "none", fontFamily: "var(--font-instrument-sans),sans-serif" } as const;
  const label = { fontSize: 11.5, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: C.muted, marginBottom: 6, display: "block" } as const;
  const nom = (r: ReservationRow) => r.guest?.full_name ?? "Sin nombre";

  const Tarjeta = ({ r }: { r: ReservationRow }) => {
    const room = roomMap.get(r.room_id); const est = ESTATUS[r.status] ?? ESTATUS.CONFIRMADA;
    return (
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: C.mist, display: "grid", placeItems: "center", fontFamily: "var(--font-space-mono),monospace", fontWeight: 700, fontSize: 13, color: C.deep }}>
          {(room?.code ?? "—").replace("i ", "i")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nom(r)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{fFecha(r.check_in)} → {fFecha(r.check_out)} · {r.pax ?? "?"} pax{r.channel_id ? " · " + (chanMap.get(r.channel_id)?.name ?? "") : ""}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: est.bg, color: est.fg, whiteSpace: "nowrap" }}>{est.label}</span>
        <button onClick={() => abrirEdit(r)} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Pencil size={16} /></button>
      </div>
    );
  };

  if (modo === "form") {
    const n = noches(f.checkIn, f.checkOut);
    const total = f.ratePerNight ? f.ratePerNight * n : 0;
    return (
      <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
        <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 32px" }}>
          <h1 style={{ ...display, fontWeight: 800, fontSize: 24, letterSpacing: "-.02em", margin: "0 0 16px" }}>{editId ? "Editar reserva" : "Nueva reserva"}</h1>
          <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={label}>Habitación</label>
              <select value={f.roomId} onChange={(e) => set("roomId", e.target.value)} style={{ ...inputCls, appearance: "none" }}>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.code}{r.name ? " · " + r.name : ""}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Huésped</label>
              <input value={f.guestName} onChange={(e) => set("guestName", e.target.value)} style={inputCls} placeholder="Nombre completo" />
            </div>
            <div>
              <label style={label}>WhatsApp del huésped</label>
              <input value={f.guestPhone} onChange={(e) => set("guestPhone", e.target.value)} style={inputCls} placeholder="Ej. 5219981234567" inputMode="tel" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><label style={label}>Check-in</label><input type="date" value={f.checkIn} onChange={(e) => set("checkIn", e.target.value)} style={inputCls} /></div>
              <div style={{ flex: 1 }}><label style={label}>Check-out</label><input type="date" value={f.checkOut} onChange={(e) => set("checkOut", e.target.value)} style={inputCls} /></div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 90 }}><label style={label}>Pax</label><input type="number" min={1} value={f.pax ?? ""} onChange={(e) => set("pax", parseInt(e.target.value) || null)} style={inputCls} /></div>
              <div style={{ flex: 1 }}><label style={label}>Canal</label>
                <select value={f.channelId ?? ""} onChange={(e) => set("channelId", e.target.value || null)} style={{ ...inputCls, appearance: "none" }}>
                  <option value="">—</option>
                  {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={label}>Tarifa por noche (opcional)</label>
              <input inputMode="decimal" value={f.ratePerNight ?? ""} onChange={(e) => set("ratePerNight", e.target.value ? Number(e.target.value.replace(/[^\d.]/g, "")) : null)} style={inputCls} placeholder="0.00" />
              {f.ratePerNight ? <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{n} noche(s) · Total {money(total)} MXN</div> : null}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={f.breakfast} onChange={(e) => set("breakfast", e.target.checked)} style={{ width: 18, height: 18, accentColor: C.teal }} />
              Desayuno incluido
            </label>
            <div><label style={label}>Solicitudes especiales</label><input value={f.specialRequests} onChange={(e) => set("specialRequests", e.target.value)} style={inputCls} placeholder="Ej. cuna, llegada tarde…" /></div>
            <div><label style={label}>Notas recepción</label><input value={f.notes} onChange={(e) => set("notes", e.target.value)} style={inputCls} placeholder="Opcional" /></div>
            <div>
              <label style={label}>Estatus</label>
              <select value={f.status} onChange={(e) => set("status", e.target.value)} style={{ ...inputCls, appearance: "none" }}>
                {ESTATUS_OPC.map((s) => <option key={s} value={s}>{ESTATUS[s].label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={() => setModo("lista")} style={{ padding: "14px 18px", borderRadius: 14, border: `1.5px solid ${C.line}`, background: C.card, color: C.muted, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={{ flex: 1, padding: 14, borderRadius: 14, border: "none", background: saving ? "#C4D2D1" : C.teal, color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Check size={18} strokeWidth={2.6} /> {saving ? "Guardando…" : editId ? "Guardar cambios" : "Crear reserva"}
            </button>
          </div>
        </div>
        {toast && <ToastView toast={toast} />}
      </div>
    );
  }

  return (
    <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h1 style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: 0 }}>Reservas</h1>
            <p style={{ fontSize: 13.5, color: C.muted, margin: "4px 0 0" }}>Hoy · {fFecha(fecha)}</p>
          </div>
          <button onClick={abrirNueva} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12, border: "none", background: C.teal, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}><Plus size={17} /> Nueva</button>
        </div>

        {/* Resumen de hoy */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[[LogIn, "Llegadas", llegadas.length, C.in, C.inSoft], [LogOut, "Salidas", salidas.length, C.out, C.outSoft], [BedDouble, "En casa", enCasa.length, C.deep, "#E4F1F1"]].map(([Ic, l, v, col, bg]) => {
            const Icon = Ic as typeof LogIn;
            return (
              <div key={l as string} style={{ background: bg as string, borderRadius: 14, padding: "12px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: col as string, fontSize: 11.5, fontWeight: 600 }}><Icon size={14} /> {l as string}</div>
                <div style={{ ...display, fontWeight: 800, fontSize: 22, color: col as string, marginTop: 2 }}>{v as number}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 18, textAlign: "center" }}>Ocupación de hoy: <b style={{ color: C.ink }}>{ocupadas}/{rooms.length}</b> habitaciones ({Math.round((ocupadas / Math.max(1, rooms.length)) * 100)}%)</div>

        {/* Secciones */}
        {llegadas.length > 0 && <Seccion titulo="Llegan hoy" items={llegadas} Tarjeta={Tarjeta} />}
        {salidas.length > 0 && <Seccion titulo="Salen hoy" items={salidas} Tarjeta={Tarjeta} />}

        <div style={{ ...display, fontWeight: 700, fontSize: 16, margin: "18px 0 10px 2px" }}>Todas las reservas ({activas.length})</div>
        {activas.length === 0 ? (
          <div style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 15, padding: "28px 18px", textAlign: "center", color: C.muted, fontSize: 13.5 }}>
            <CalendarDays size={26} color={C.line} style={{ marginBottom: 8 }} /><br />Aún no hay reservas. Crea la primera con “Nueva”.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {[...activas].sort((a, b) => a.check_in.localeCompare(b.check_in)).map((r) => <Tarjeta key={r.id} r={r} />)}
          </div>
        )}
      </div>
      {toast && <ToastView toast={toast} />}
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