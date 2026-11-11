"use client";
export const dynamic = "force-dynamic";


import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Users, 
  UserPlus, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "SUPERADMIN" | "ADMIN" | "VENTAS";
  activo: boolean;
}

export default function UsuariosAdminPage() {
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "VENTAS",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/usuarios");
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setShowModal(false);
        setForm({ nombre: "", email: "", password: "", rol: "VENTAS" });
        await fetchUsuarios();
      } else {
        setErrorMsg(data.error || "Error al crear usuario.");
      }
    } catch (err) {
      setErrorMsg("Error de conexión con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEstado = async (id: string, estadoActual: boolean) => {
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, activo: !estadoActual }),
      });

      if (res.ok) {
        await fetchUsuarios();
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    }
  };

  const isSuperAdmin = (session?.user as any)?.rol === "SUPERADMIN" || (session?.user as any)?.role === "SUPERADMIN";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/pos" 
              className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-slate-200 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-amber-500" />
                Gestión de Personal
              </h1>
              <p className="text-xs text-slate-400">
                Administrá los usuarios y permisos de venta de mostrador
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>

        {/* Tabla de Usuarios */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span>Cargando lista de personal...</span>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850 transition">
                    <td className="p-4 font-semibold text-slate-200">{u.nombre}</td>
                    <td className="p-4 text-slate-400">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase ${
                        u.rol === "SUPERADMIN"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : u.rol === "ADMIN"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 font-medium ${
                        u.activo ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {u.activo ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {u.rol !== "SUPERADMIN" && (
                        <button
                          onClick={() => toggleEstado(u.id, u.activo)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                            u.activo
                              ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {u.activo ? "Desactivar" : "Activar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Nuevo Usuario */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                Registrar Nuevo Personal
              </h2>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    placeholder="vendedor@elreencuentro.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Rol en el Sistema</label>
                  <select
                    value={form.rol}
                    onChange={(e) => setForm({ ...form, rol: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="VENTAS">VENTAS (Mostrador)</option>
                    {isSuperAdmin && <option value="ADMIN">ADMINISTRADOR</option>}
                  </select>
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}