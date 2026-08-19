"use client";

import { useState } from "react";
import { Check, X, UserPlus, Plus, Power } from "lucide-react";
import {
  crearUsuario, cambiarActivoUsuario, crearCuenta, cambiarActivoCuenta,
  type AdminUserRow, type AdminAccountRow,
} from "@/app/admin/actions";

const C = {
  ink: "#0C2A30", mist: "#EEF4F3", card: "#FFFFFF", line: "#D8E4E2",
  teal: "#0E8C8C", deep: "#0B5563", muted: "#5C7A7C",
  in: "#0FA36B", inSoft: "#E4F5EC", out: "#E1583F", outSoft: "#FCEAE6",
};
const display = { fontFamily: "var(--font-bricolage), sans-serif" } as const;

type Role = { code: string; name: string };
type Props = { usuarios: AdminUserRow[]; roles: Role[]; cuentas: AdminAccountRow[] };
type Toast = { msg: string; kind: "success" | "error" };

export default function AdminPanel({ usuarios, roles, cuentas }: Props) {
  const [tab, setTab] = useState<"usuarios" | "cuentas">("usuarios");
  const [listaUsuarios, setListaUsuarios] = useState(usuarios);
  const [listaCuentas, setListaCuentas] = useState(cuentas);
  const [toast, setToast] = useState<Toast | null>(null);

  // form usuario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState(roles.find((r) => r.code === "RECEPCION")?.code ?? roles[0]?.code ?? "");
  const [savingU, setSavingU] = useState(false);

  // form cuenta
  const [cuentaNombre, setCuentaNombre] = useState("");
  const [cuentaTipo, setCuentaTipo] = useState("Débito");
  const [savingC, setSavingC] = useState(false);

  const notify = (t: Toast) => { setToast(t); setTimeout(() => setToast(null), 3200); };

  const onCrearUsuario = async () => {
    if (savingU) return;
    setSavingU(true);
    const res = await crearUsuario({ fullName: nombre, email, password, roleCode: rol });
    setSavingU(false);
    if (!res.ok) { notify({ msg: res.error, kind: "error" }); return; }
    setListaUsuarios([res.usuario, ...listaUsuarios]);
    notify({ msg: "Usuario creado ✓", kind: "success" });
    setNombre(""); setEmail(""); setPassword("");
  };

  const onToggleUsuario = async (u: AdminUserRow) => {
    const res = await cambiarActivoUsuario(u.id, !u.active);
    if (!res.ok) { notify({ msg: res.error, kind: "error" }); return; }
    setListaUsuarios(listaUsuarios.map((x) => (x.id === u.id ? { ...x, active: !u.active } : x)));
  };

  const onCrearCuenta = async () => {
    if (savingC) return;
    setSavingC(true);
    const res = await crearCuenta({ name: cuentaNombre, kind: cuentaTipo });
    setSavingC(false);
    if (!res.ok) { notify({ msg: res.error, kind: "error" }); return; }
    setListaCuentas([res.cuenta, ...listaCuentas]);
    notify({ msg: "Cuenta agregada ✓", kind: "success" });
    setCuentaNombre("");
  };

  const onToggleCuenta = async (a: AdminAccountRow) => {
    const res = await cambiarActivoCuenta(a.id, !a.active);
    if (!res.ok) { notify({ msg: res.error, kind: "error" }); return; }
    setListaCuentas(listaCuentas.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x)));
  };

  const inputCls = {
    width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "12px 14px",
    fontSize: 15, color: C.ink, background: C.card, outline: "none",
    fontFamily: "var(--font-instrument-sans), sans-serif", marginBottom: 12,
  } as const;
  const label = { fontSize: 12, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: C.muted, marginBottom: 8, display: "block" } as const;

  const pill = (active: boolean) => ({
    fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
    background: active ? C.inSoft : C.outSoft, color: active ? C.in : C.out,
  });

  return (
    <div style={{ background: C.mist, minHeight: "100%", color: C.ink }}>
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 32px" }}>
        <h1 style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: "0 0 14px" }}>Administración</h1>

        {/* Tabs */}
        <div style={{ display: "flex", background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: 4, marginBottom: 16 }}>
          {(["usuarios", "cuentas"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14,
                fontFamily: "var(--font-instrument-sans),sans-serif",
                background: tab === t ? C.teal : "transparent", color: tab === t ? "#fff" : C.muted }}>
              {t === "usuarios" ? "Usuarios" : "Cuentas"}
            </button>
          ))}
        </div>

        {tab === "usuarios" ? (
          <>
            <section style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: 16, marginBottom: 16, boxShadow: "0 6px 22px rgba(11,43,48,.06)" }}>
              <div style={{ ...display, fontWeight: 700, fontSize: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <UserPlus size={18} color={C.teal} /> Nuevo usuario
              </div>
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
              <button onClick={onCrearUsuario} disabled={savingU}
                style={{ width: "100%", padding: 14, borderRadius: 13, border: "none", background: savingU ? "#C4D2D1" : C.teal, color: "#fff", fontWeight: 700, fontSize: 15, cursor: savingU ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Check size={18} strokeWidth={2.6} /> {savingU ? "Creando…" : "Crear usuario"}
              </button>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Comparte la contraseña con la persona; podrá cambiarla después.</div>
            </section>

            <div style={{ ...display, fontWeight: 700, fontSize: 15, margin: "0 0 10px 2px" }}>Usuarios ({listaUsuarios.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {listaUsuarios.map((u) => (
                <div key={u.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 999, flexShrink: 0, background: C.deep, color: "#fff", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700 }}>
                    {u.full_name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{u.role?.name ?? "Sin rol"}</div>
                  </div>
                  <span style={pill(u.active)}>{u.active ? "Activo" : "Inactivo"}</span>
                  <button onClick={() => onToggleUsuario(u)} title={u.active ? "Desactivar" : "Activar"}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "grid", placeItems: "center", padding: 4 }}>
                    <Power size={17} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <section style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: 16, marginBottom: 16, boxShadow: "0 6px 22px rgba(11,43,48,.06)" }}>
              <div style={{ ...display, fontWeight: 700, fontSize: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Plus size={18} color={C.teal} /> Nueva cuenta
              </div>
              <label style={label}>Nombre</label>
              <input value={cuentaNombre} onChange={(e) => setCuentaNombre(e.target.value)} style={inputCls} placeholder="Ej. Débito Caribe" />
              <label style={label}>Tipo</label>
              <select value={cuentaTipo} onChange={(e) => setCuentaTipo(e.target.value)} style={{ ...inputCls, appearance: "none" }}>
                {["Débito", "Crédito", "Banco", "Otro"].map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <button onClick={onCrearCuenta} disabled={savingC}
                style={{ width: "100%", padding: 14, borderRadius: 13, border: "none", background: savingC ? "#C4D2D1" : C.teal, color: "#fff", fontWeight: 700, fontSize: 15, cursor: savingC ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Check size={18} strokeWidth={2.6} /> {savingC ? "Guardando…" : "Agregar cuenta"}
              </button>
            </section>

            <div style={{ ...display, fontWeight: 700, fontSize: 15, margin: "0 0 10px 2px" }}>Cuentas ({listaCuentas.length})</div>
            {listaCuentas.length === 0 ? (
              <div style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 15, padding: "24px 18px", textAlign: "center", color: C.muted, fontSize: 13.5 }}>
                Aún no hay cuentas. Agrega la primera arriba.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {listaCuentas.map((a) => (
                  <div key={a.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{a.kind ?? "—"}</div>
                    </div>
                    <span style={pill(a.active)}>{a.active ? "Activa" : "Inactiva"}</span>
                    <button onClick={() => onToggleCuenta(a)} title={a.active ? "Desactivar" : "Activar"}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "grid", placeItems: "center", padding: 4 }}>
                      <Power size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 88, transform: "translateX(-50%)", maxWidth: "90vw",
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