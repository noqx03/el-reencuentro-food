export const dynamic = "force-dynamic";
export const dynamic = "force-dynamic";
export const dynamic = "force-dynamic";
"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  ArrowLeft, 
  Calendar, 
  Search, 
  Banknote, 
  CreditCard, 
  DollarSign, 
  Loader2,
  ChevronDown,
  ChevronUp,
  User
} from "lucide-react";
import Link from "next/link";

interface SaleItem {
  id: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  product: {
    nombre: string;
  };
}

interface Venta {
  id: string;
  montoTotal: number;
  medioPago: string;
  createdAt: string;
  user: {
    nombre: string;
    email: string;
  };
  items: SaleItem[];
}

export default function ReportesAdminPage() {
  const hoyStr = new Date().toISOString().split("T")[0];
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [metricas, setMetricas] = useState({
    totalVentasCount: 0,
    totalMonto: 0,
    totalEfectivo: 0,
    totalDigital: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const fetchReportes = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/reportes?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
      );
      if (res.ok) {
        const data = await res.json();
        setVentas(data.ventas);
        setMetricas(data.metricas);
      }
    } catch (err) {
      console.error("Error al obtener reportes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportes();
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReportes();
  };

  const toggleExpand = (id: string) => {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/pos" 
              className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-slate-200 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6 text-amber-500" />
                Historial y Reportes de Ventas
              </h1>
              <p className="text-xs text-slate-400">
                Auditoría detallada de tickets y cobros por rango de fecha
              </p>
            </div>
          </div>

          {/* Filtros por Fecha */}
          <form onSubmit={handleFilter} className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-600">a</span>
            <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition"
              title="Filtrar"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Métrica de Tarjetas / Tarjetas Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Tickets Emitidos</span>
            <span className="text-2xl font-black text-slate-100">{metricas.totalVentasCount}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500 font-semibold">Total Cobrado</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-2xl font-black text-amber-400">
              ${metricas.totalMonto.toLocaleString("es-AR")}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500 font-semibold">Total Efectivo</span>
              <Banknote className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-black text-emerald-400">
              ${metricas.totalEfectivo.toLocaleString("es-AR")}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500 font-semibold">Digital / Tarjetas</span>
              <CreditCard className="w-4 h-4 text-sky-400" />
            </div>
            <span className="text-2xl font-black text-sky-400">
              ${metricas.totalDigital.toLocaleString("es-AR")}
            </span>
          </div>
        </div>

        {/* Tabla de Ventas */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span>Generando reporte de ventas...</span>
          </div>
        ) : ventas.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-2 stroke-1" />
            <p className="text-sm">No se encontraron ventas en el rango seleccionado.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Fecha y Hora</th>
                  <th className="p-4">Vendedor</th>
                  <th className="p-4">Medio de Pago</th>
                  <th className="p-4">Total</th>
                  <th className="p-4 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ventas.map((v) => (
                  <React.Fragment key={v.id}>
                    <tr className="hover:bg-slate-850 transition cursor-pointer" onClick={() => toggleExpand(v.id)}>
                      <td className="p-4 font-semibold text-slate-200">
                        {new Date(v.createdAt).toLocaleString("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })} hs
                      </td>
                      <td className="p-4 text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {v.user?.nombre || "Vendedor"}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                          v.medioPago === "EFECTIVO"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : v.medioPago === "TRANSFERENCIA" || v.medioPago === "MERCADOPAGO"
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {v.medioPago}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-amber-400 text-sm">
                        ${Number(v.montoTotal).toLocaleString("es-AR")}
                      </td>
                      <td className="p-4 text-right text-slate-500">
                        {expandedSaleId === v.id ? (
                          <ChevronUp className="w-4 h-4 ml-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-auto" />
                        )}
                      </td>
                    </tr>

                    {/* Desglose desplegable de la venta */}
                    {expandedSaleId === v.id && (
                      <tr className="bg-slate-950/80">
                        <td colSpan={5} className="p-4 border-t border-slate-800/50">
                          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 max-w-lg space-y-2">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                              Ítems del Ticket
                            </span>
                            <div className="divide-y divide-slate-800 text-xs">
                              {v.items.map((item) => (
                                <div key={item.id} className="py-1.5 flex justify-between text-slate-300">
                                  <span>
                                    {item.cantidad}x {item.product?.nombre || "Producto"}
                                  </span>
                                  <span className="font-medium text-slate-100">
                                    ${Number(item.subtotal).toLocaleString("es-AR")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}