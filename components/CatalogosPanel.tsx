"use client";

import { useState } from "react";
import { Check, X, Plus, Power, Pencil, Trash2 } from "lucide-react";
import { crearCatalogo, editarCatalogo, toggleCatalogo, borrarCatalogo, type Tabla } from "@/app/admin/catalogActions";

const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
};
const display = { fontFamily: "var(--font-bricolage), sans-serif" } as const;

type Row = { id: string; name: string; active: boolean; emoji?: string | null; share_pct?: number; notes?: string | null; code?: string };
type Props = { cajas: Row[]; areas: Row[]; channels: Row[]; suppliers: Row[]; partners: Row[] };
type Toast = { msg: string; kind: "success" | "error" };

const CATS: { key: Tabla; label: string; extra: "emoji" | "share_pct" | "notes" | null }[] = [
  { key: "cajas", label: "Cajas", extra: "emoji" },
  { key: "areas", label: "Áreas", extra: null },
  { key: "channels", label: "Canales", extra: null },
  { key: "suppliers", label: "Proveedores", extra: "notes" },
  { key: "partners", label: "Socios", extra: "share_pct" },
];

export default function CatalogosPanel({ cajas, areas, channels, suppliers, partners }: Props) {
  const [data, setData] = useState<Record<Tabla, Row[]>>({ cajas, areas, channels, suppliers, partners });
  const [cat, setCat] = useState<Tabla>("cajas");
  const [toast, setToast] = useState<Toast | null>(null);

  const [nName, setNName] = useState(""); const [nExtra, setNExtra] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState(""); const [eExtra, setEExtra] = useState("");

  const conf = CATS.find((c) => c.key === cat)!;
  const rows = data[cat];
  const notify = (t: Toast) => { setToast(t); setTimeout(() => setToast(null), 3200); };
  const setRows = (r: Row[]) => setData({ ...data, [cat]: r });

  const inputCls = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "11px 13px", fontSize: 14.5, color: C.ink, background: C.card, outline: "none", fontFamily: "var(--font-instrument-sans),sans-serif" } as const;
  const label = { fontSize: 11.5, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: C.muted, marginBottom: 6, display: "block" } as const;
  const pill = (a: boolean) => ({ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: a ? C.inSoft : C.outSoft, color: a ? C.in : C.out });
  const extraPh = conf.extra === "emoji" ? "🏨 (emoji)" : conf.extra === "share_pct" ? "% (ej. 25)" : conf.extra === "notes" ? "Notas (opcional)" : "";

  const payloadFrom = (name: string, extra: string) => {
    const p: Record<string, unknown> = { name };
    if (conf.extra === "emoji") p.emoji = extra || null;
    if (conf.extra === "share_pct") p.share_pct = extra;
    if (conf.extra === "notes") p.notes = extra;
    return p;
  };
  const extraOf = (r: Row) => conf.extra === "emoji" ? (r.emoji ?? "") : conf.extra === "share_pct" ? String(r.share_pct ?? "") : conf.extra === "notes" ? (r.notes ?? "") : "";

  const onCrear = async () => {
    if (!nName.trim()) return;
    const res = await crearCatalogo(cat, payloadFrom(nName, nExtra));
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    setRows([res.row as Row, ...rows]); notify({ msg: "Agregado ✓", kind: "success" }); setNName(""); setNExtra("");
  };
  const abrir = (r: Row) => { setEditId(r.id); setEName(r.name); setEExtra(extraOf(r)); };
  const onGuardar = async (r: Row) => {
    const res = await editarCatalogo(cat, r.id, payloadFrom(eName, eExtra));
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    setRows(rows.map((x) => (x.id === r.id ? (res.row as Row) : x))); notify({ msg: "Guardado ✓", kind: "success" }); setEditId(null);
  };
  const onToggle = async (r: Row) => {
    const res = await toggleCatalogo(cat, r.id, !r.active);
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    setRows(rows.map((x) => (x.id === r.id ? { ...x, active: !r.active } : x)));
  };
  const onBorrar = async (r: Row) => {
    if (!confirm(`¿Eliminar "${r.name}"? Si está en uso, no se borrará (mejor desactívalo).`)) return;
    const res = await borrarCatalogo(cat, r.id);
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    setRows(rows.filter((x) => x.id !== r.id)); notify({ msg: "Eliminado ✓", kind: "success" });
  };

  return (
    <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 32px" }}>
        <h1 style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: "0 0 14px" }}>Catálogos</h1>

        {/* Selector de catálogo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {CATS.map((c) => (
            <button key={c.key} onClick={() => { setCat(c.key); setEditId(null); }}
              style={{ padding: "10px 8px", borderRadius: 12, border: cat === c.key ? `1.5px solid ${C.teal}` : `1.5px solid ${C.line}`, background: cat === c.key ? "#E4F1F1" : C.card, color: cat === c.key ? C.deep : C.muted, fontWeight: 600, fontSize: 13.5, cursor: "pointer", fontFamily: "var(--font-instrument-sans),sans-serif" }}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Alta */}
        <section style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: 16, marginBottom: 16 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Plus size={18} color={C.teal} /> Agregar a {conf.label}</div>
          <label style={label}>Nombre</label>
          <input value={nName} onChange={(e) => setNName(e.target.value)} style={{ ...inputCls, marginBottom: conf.extra ? 10 : 12 }} placeholder="Nombre" />
          {conf.extra && (<><label style={label}>{conf.extra === "emoji" ? "Emoji" : conf.extra === "share_pct" ? "Participación %" : "Notas"}</label>
            <input value={nExtra} onChange={(e) => setNExtra(e.target.value)} inputMode={conf.extra === "share_pct" ? "decimal" : "text"} style={{ ...inputCls, marginBottom: 12 }} placeholder={extraPh} /></>)}
          <button onClick={onCrear} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: C.teal, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Check size={18} strokeWidth={2.6} /> Agregar
          </button>
        </section>

        <div style={{ ...display, fontWeight: 700, fontSize: 15, margin: "0 0 10px 2px" }}>{conf.label} ({rows.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {rows.map((r) => {
            const abierto = editId === r.id;
            return (
              <div key={r.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  {conf.extra === "emoji" && <span style={{ fontSize: 18 }}>{r.emoji ?? "🏷️"}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}{conf.extra === "share_pct" && <span style={{ color: C.muted, fontWeight: 500 }}> · {r.share_pct ?? 0}%</span>}</div>
                    {conf.extra === "notes" && r.notes && <div style={{ fontSize: 12, color: C.muted }}>{r.notes}</div>}
                  </div>
                  <span style={pill(r.active)}>{r.active ? "Activo" : "Inactivo"}</span>
                  <button onClick={() => (abierto ? setEditId(null) : abrir(r))} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Pencil size={16} /></button>
                </div>
                {abierto && (
                  <div style={{ borderTop: `1px solid ${C.line}`, padding: 14, background: "#FAFCFC" }}>
                    <label style={label}>Nombre</label>
                    <input value={eName} onChange={(e) => setEName(e.target.value)} style={{ ...inputCls, marginBottom: conf.extra ? 10 : 12 }} />
                    {conf.extra && (<><label style={label}>{conf.extra === "emoji" ? "Emoji" : conf.extra === "share_pct" ? "Participación %" : "Notas"}</label>
                      <input value={eExtra} onChange={(e) => setEExtra(e.target.value)} inputMode={conf.extra === "share_pct" ? "decimal" : "text"} style={{ ...inputCls, marginBottom: 12 }} placeholder={extraPh} /></>)}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => onGuardar(r)} style={{ flex: 1, padding: 11, borderRadius: 11, border: "none", background: C.teal, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={16} /> Guardar</button>
                      <button onClick={() => onToggle(r)} style={{ padding: "11px 13px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: C.card, color: C.muted, fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Power size={15} /> {r.active ? "Desact." : "Activar"}</button>
                      <button onClick={() => onBorrar(r)} title="Eliminar" style={{ padding: "11px 13px", borderRadius: 11, border: `1.5px solid ${C.out}`, background: C.outSoft, color: C.out, cursor: "pointer", display: "flex", alignItems: "center" }}><Trash2 size={15} /></button>
                    </div>
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