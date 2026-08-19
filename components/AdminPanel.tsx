"use client";

import { useState } from "react";
import { Check, X, UserPlus, Plus, Power, Pencil, Trash2, ArrowRightLeft, ChevronDown, ChevronUp } from "lucide-react";
import {
  crearUsuario, editarUsuario, cambiarActivoUsuario, reasignarMovimientos, borrarUsuario,
  crearCuenta, cambiarActivoCuenta, type AdminUserRow, type AdminAccountRow,
} from "@/app/admin/actions";

const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
};
const display = { fontFamily: "var(--font-bricolage), sans-serif" } as const;

type Role = { code: string; name: string };
type Props = {
  usuarios: AdminUserRow[]; roles: Role[]; cuentas: AdminAccountRow[];
  movementCounts: Record<string, number>; selfId: string;
};
type Toast = { msg: string; kind: "success" | "error" };

export default function AdminPanel({ usuarios, roles, cuentas, movementCounts, selfId }: Props) {
  const [tab, setTab] = useState<"usuarios" | "cuentas">("usuarios");
  const [lista, setLista] = useState(usuarios);
  const [listaCuentas, setListaCuentas] = useState(cuentas);
  const [toast, setToast] = useState<Toast | null>(null);

  // crear usuario
  const [nombre, setNombre] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [rol, setRol] = useState(roles.find((r) => r.code === "RECEPCION")?.code ?? roles[0]?.code ?? "");
  const [savingU, setSavingU] = useState(false); const [openNuevo, setOpenNuevo] = useState(false);

  // edición inline
  const [editId, setEditId] = useState<string | null>(null);
  const [eNombre, setENombre] = useState(""); const [eRol, setERol] = useState(""); const [reTo, setReTo] = useState("");

  // cuenta
  const [cuentaNombre, setCuentaNombre] = useState(""); const [cuentaTipo, setCuentaTipo] = useState("Débito"); const [savingC, setSavingC] = useState(false);

  const notify = (t: Toast) => { setToast(t); setTimeout(() => setToast(null), 3200); };
  const inputCls = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "11px 13px", fontSize: 14.5, color: C.ink, background: C.card, outline: "none", fontFamily: "var(--font-instrument-sans),sans-serif", marginBottom: 10 } as const;
  const label = { fontSize: 11.5, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: C.muted, marginBottom: 6, display: "block" } as const;
  const pill = (a: boolean) => ({ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: a ? C.inSoft : C.outSoft, color: a ? C.in : C.out });

  const abrirEdicion = (u: AdminUserRow) => {
    setEditId(u.id); setENombre(u.full_name); setERol(u.role?.code ?? ""); setReTo("");
  };

  const onCrear = async () => {
    if (savingU) return; setSavingU(true);
    const res = await crearUsuario({ fullName: nombre, email, password, roleCode: rol });
    setSavingU(false);
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    setLista([res.usuario, ...lista]); notify({ msg: "Usuario creado ✓", kind: "success" });
    setNombre(""); setEmail(""); setPassword(""); setOpenNuevo(false);
  };

  const onGuardarEdicion = async (u: AdminUserRow) => {
    const cambios: { fullName?: string; roleCode?: string } = {};
    if (eNombre.trim() !== u.full_name) cambios.fullName = eNombre;
    if (eRol !== (u.role?.code ?? "")) cambios.roleCode = eRol;
    if (!cambios.fullName && !cambios.roleCode) { setEditId(null); return; }
    const res = await editarUsuario(u.id, cambios);
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    setLista(lista.map((x) => (x.id === u.id ? res.usuario : x))); notify({ msg: "Cambios guardados ✓", kind: "success" }); setEditId(null);
  };

  const onToggle = async (u: AdminUserRow) => {
    const res = await cambiarActivoUsuario(u.id, !u.active);
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    setLista(lista.map((x) => (x.id === u.id ? { ...x, active: !u.active } : x)));
  };

  const onReasignar = async (u: AdminUserRow) => {
    if (!reTo) return notify({ msg: "Elige a quién reasignar.", kind: "error" });
    const destino = lista.find((x) => x.id === reTo);
    if (!confirm(`¿Reasignar TODOS los movimientos de ${u.full_name} a ${destino?.full_name}? Esta acción queda registrada.`)) return;
    const res = await reasignarMovimientos(u.id, reTo);
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    notify({ msg: "Movimientos reasignados ✓ (recarga para ver conteos)", kind: "success" }); setEditId(null);
  };

  const onBorrar = async (u: AdminUserRow) => {
    if (!confirm(`¿Eliminar a ${u.full_name}? No se puede deshacer.`)) return;
    const res = await borrarUsuario(u.id);
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    setLista(lista.filter((x) => x.id !== u.id)); notify({ msg: "Usuario eliminado ✓", kind: "success" });
  };

  const onCrearCuenta = async () => {
    if (savingC) return; setSavingC(true);
    const res = await crearCuenta({ name: cuentaNombre, kind: cuentaTipo });
    setSavingC(false);
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    setListaCuentas([res.cuenta, ...listaCuentas]); notify({ msg: "Cuenta agregada ✓", kind: "success" }); setCuentaNombre("");
  };
  const onToggleCuenta = async (a: AdminAccountRow) => {
    const res = await cambiarActivoCuenta(a.id, !a.active);
    if (!res.ok) return notify({ msg: res.error, kind: "error" });
    setListaCuentas(listaCuentas.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x)));
  };

  return (
    <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 32px" }}>
        <h1 style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: "0 0 14px" }}>Administración</h1>

        <div style={{ display: "flex", background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: 4, marginBottom: 16 }}>
          {(["usuarios", "cuentas"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "var(--font-instrument-sans),sans-serif", background: tab === t ? C.teal : "transparent", color: tab === t ? "#fff" : C.muted }}>
              {t === "usuarios" ? "Usuarios" : "Cuentas"}
            </button>
          ))}
        </div>

        {tab === "usuarios" ? (
          <>
            {/* Nuevo usuario (colapsable) */}
            <section style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: 16, marginBottom: 16 }}>
              <button onClick={() => setOpenNuevo(!openNuevo)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <span style={{ ...display, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}><UserPlus size={18} color={C.teal} /> Nuevo usuario con acceso</span>
                {openNuevo ? <ChevronUp size={18} color={C.muted} /> : <ChevronDown size={18} color={C.muted} />}
              </button>
              {openNuevo && (
                <div style={{ marginTop: 14 }}>
                  <label style={label}>Nombre completo</label>
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputCls} placeholder="Ej. Pablo Ramírez" />
                  <label style={label}>Correo de acceso</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputCls} placeholder="pablo@isabellabacalar.com" />
                  <label style={label}>Contraseña inicial</label>
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} style={inputCls} placeholder="mínimo 6 caracteres" />
                  <label style={label}>Rol</label>
                  <select value={rol} onChange={(e) => setRol(e.target.value)} style={{ ...inputCls, appearance: "none" }}>
                    {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                  </select>
                  <button onClick={onCrear} disabled={savingU} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: savingU ? "#C4D2D1" : C.teal, color: "#fff", fontWeight: 700, fontSize: 15, cursor: savingU ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Check size={18} strokeWidth={2.6} /> {savingU ? "Creando…" : "Crear usuario"}
                  </button>
                </div>
              )}
            </section>

            <div style={{ ...display, fontWeight: 700, fontSize: 15, margin: "0 0 10px 2px" }}>Usuarios ({lista.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {lista.map((u) => {
                const n = movementCounts[u.id] ?? 0; const esYo = u.id === selfId; const abierto = editId === u.id;
                return (
                  <div key={u.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 999, flexShrink: 0, background: C.deep, color: "#fff", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700 }}>{u.full_name[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name} {esYo && <span style={{ fontSize: 11, color: C.teal }}>(tú)</span>}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{u.role?.name ?? "Sin rol"}{n > 0 ? ` · ${n} mov.` : ""}</div>
                      </div>
                      <span style={pill(u.active)}>{u.active ? "Activo" : "Inactivo"}</span>
                      <button onClick={() => (abierto ? setEditId(null) : abrirEdicion(u))} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Pencil size={16} /></button>
                    </div>

                    {abierto && (
                      <div style={{ borderTop: `1px solid ${C.line}`, padding: 14, background: "#FAFCFC" }}>
                        <label style={label}>Nombre</label>
                        <input value={eNombre} onChange={(e) => setENombre(e.target.value)} style={inputCls} />
                        <label style={label}>Rol</label>
                        <select value={eRol} onChange={(e) => setERol(e.target.value)} style={{ ...inputCls, appearance: "none" }} disabled={esYo}>
                          <option value="">Sin rol</option>
                          {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                        </select>
                        {esYo && <div style={{ fontSize: 11.5, color: C.muted, marginTop: -4, marginBottom: 10 }}>No puedes cambiar tu propio rol.</div>}

                        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                          <button onClick={() => onGuardarEdicion(u)} style={{ flex: 1, padding: 11, borderRadius: 11, border: "none", background: C.teal, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={16} /> Guardar</button>
                          {!esYo && (
                            <button onClick={() => onToggle(u)} style={{ padding: "11px 14px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: C.card, color: C.muted, fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Power size={15} /> {u.active ? "Desactivar" : "Activar"}</button>
                          )}
                        </div>

                        {!esYo && (n > 0 ? (
                          <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 12 }}>
                            <label style={label}>Reasignar sus {n} movimientos a…</label>
                            <div style={{ display: "flex", gap: 8 }}>
                              <select value={reTo} onChange={(e) => setReTo(e.target.value)} style={{ ...inputCls, marginBottom: 0, appearance: "none", flex: 1 }}>
                                <option value="">Elige responsable…</option>
                                {lista.filter((x) => x.id !== u.id).map((x) => <option key={x.id} value={x.id}>{x.full_name}</option>)}
                              </select>
                              <button onClick={() => onReasignar(u)} style={{ padding: "0 14px", borderRadius: 11, border: "none", background: C.deep, color: "#fff", fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><ArrowRightLeft size={15} /> Reasignar</button>
                            </div>
                            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>Para poder borrarlo, primero reasigna sus movimientos.</div>
                          </div>
                        ) : (
                          <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 12 }}>
                            <button onClick={() => onBorrar(u)} style={{ width: "100%", padding: 11, borderRadius: 11, border: `1.5px solid ${C.out}`, background: C.outSoft, color: C.out, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Trash2 size={16} /> Eliminar usuario</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <section style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: 16, marginBottom: 16 }}>
              <div style={{ ...display, fontWeight: 700, fontSize: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><Plus size={18} color={C.teal} /> Nueva cuenta</div>
              <label style={label}>Nombre</label>
              <input value={cuentaNombre} onChange={(e) => setCuentaNombre(e.target.value)} style={inputCls} placeholder="Ej. Débito Caribe" />
              <label style={label}>Tipo</label>
              <select value={cuentaTipo} onChange={(e) => setCuentaTipo(e.target.value)} style={{ ...inputCls, appearance: "none" }}>
                {["Débito", "Crédito", "Banco", "Otro"].map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <button onClick={onCrearCuenta} disabled={savingC} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: savingC ? "#C4D2D1" : C.teal, color: "#fff", fontWeight: 700, fontSize: 15, cursor: savingC ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Check size={18} strokeWidth={2.6} /> {savingC ? "Guardando…" : "Agregar cuenta"}
              </button>
            </section>

            <div style={{ ...display, fontWeight: 700, fontSize: 15, margin: "0 0 10px 2px" }}>Cuentas ({listaCuentas.length})</div>
            {listaCuentas.length === 0 ? (
              <div style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 15, padding: "24px 18px", textAlign: "center", color: C.muted, fontSize: 13.5 }}>Aún no hay cuentas.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {listaCuentas.map((a) => (
                  <div key={a.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div><div style={{ fontSize: 12, color: C.muted }}>{a.kind ?? "—"}</div></div>
                    <span style={pill(a.active)}>{a.active ? "Activa" : "Inactiva"}</span>
                    <button onClick={() => onToggleCuenta(a)} title={a.active ? "Desactivar" : "Activar"} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Power size={17} /></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
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