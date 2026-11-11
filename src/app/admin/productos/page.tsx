export const dynamic = "force-dynamic";
export const dynamic = "force-dynamic";
export const dynamic = "force-dynamic";
"use client";

import React, { useState, useEffect } from "react";
import { 
  Utensils, 
  Plus, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  PackageCheck,
  Tag
} from "lucide-react";
import AdminNav from "../components/AdminNav";

interface Product {
  id: string;
  nombre: string;
  precio: number;
  stockActual: number;
  activo: boolean;
  category?: {
    id: string;
    nombre: string;
  };
}

export default function ProductosAdminPage() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    precio: "",
    stockActual: "",
    categoriaNombre: "Minutas",
    activo: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/productos");
      if (res.ok) {
        const data = await res.json();
        setProductos(data.productos);
        setCategorias(data.categorias);
      }
    } catch (err) {
      console.error("Error al cargar productos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const openModalNew = () => {
    setEditingProd(null);
    setForm({
      nombre: "",
      precio: "",
      stockActual: "",
      categoriaNombre: categorias[0]?.nombre || "Minutas",
      activo: true,
    });
    setShowModal(true);
  };

  const openModalEdit = (prod: Product) => {
    setEditingProd(prod);
    setForm({
      nombre: prod.nombre,
      precio: String(prod.precio),
      stockActual: String(prod.stockActual),
      categoriaNombre: prod.category?.nombre || "Minutas",
      activo: prod.activo,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const isEdit = Boolean(editingProd);
      const url = "/api/admin/productos";
      const method = isEdit ? "PUT" : "POST";

      const payload = isEdit
        ? { id: editingProd?.id, ...form }
        : form;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        await fetchProductos();
      }
    } catch (err) {
      console.error("Error al guardar producto:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de Navegación Administrativa */}
      <AdminNav />

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Catálogo de Productos y Precios</h1>
              <p className="text-xs text-slate-400">
                Administración de la carta, precios de lista y control de stock
              </p>
            </div>
          </div>

          <button
            onClick={openModalNew}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>

        {/* Tabla de Productos */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span>Cargando productos de la carta...</span>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Producto</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Precio</th>
                  <th className="p-4">Stock Disponible</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {productos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-850 transition">
                    <td className="p-4 font-semibold text-slate-200">{p.nombre}</td>
                    <td className="p-4 text-slate-400">
                      <span className="inline-flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                        <Tag className="w-3 h-3 text-amber-500" />
                        {p.category?.nombre || "General"}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-amber-400 text-sm">
                      ${Number(p.precio).toLocaleString("es-AR")}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md font-semibold ${
                        p.stockActual > 5 
                          ? "bg-emerald-500/10 text-emerald-400"
                          : p.stockActual > 0
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                      }`}>
                        {p.stockActual} u.
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1 font-medium ${
                        p.activo ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {p.activo ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {p.activo ? "Disponible" : "Pausado"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openModalEdit(p)}
                        className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-slate-400 transition"
                        title="Editar producto"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Crear/Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-amber-500" />
                {editingProd ? "Modificar Producto" : "Agregar Nuevo Producto"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Plato / Bebida</label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    placeholder="Ej: Sándwich de Milanesa Completo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Precio ($)</label>
                    <input
                      type="number"
                      required
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      placeholder="5500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Stock Actual</label>
                    <input
                      type="number"
                      required
                      value={form.stockActual}
                      onChange={(e) => setForm({ ...form, stockActual: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      placeholder="20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    value={form.categoriaNombre}
                    onChange={(e) => setForm({ ...form, categoriaNombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    placeholder="Minutas, Bebidas, Postres..."
                  />
                </div>

                {editingProd && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="activo"
                      checked={form.activo}
                      onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                      className="accent-amber-500 rounded"
                    />
                    <label htmlFor="activo" className="text-xs text-slate-300 font-medium">
                      Disponible para venta en el POS
                    </label>
                  </div>
                )}

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
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
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