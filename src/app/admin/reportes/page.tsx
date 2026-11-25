"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Calendar,
  Search,
  Banknote,
  CreditCard,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  AlertCircle,
} from "lucide-react";
import AdminNav from "../components/AdminNav";
import { getArgentinaDateString } from "@/lib/date";
import { formatOrderNumber } from "@/components/TicketPrint";

interface SaleItem {
  id: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  nota?: string | null;
  product: {
    nombre: string;
  };
}

interface Venta {
  id: string;
  numeroPedido: number;
  estado: string;
  canal: string;
  clienteNombre?: string | null;
  clienteTelefono?: string | null;
  notas?: string | null;
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
  const hoyStr = getArgentinaDateString();
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [metricas, setMetricas] = useState({
    totalVentasCount: 0,
    totalCanceladasCount: 0,
    totalMonto: 0,
    totalEfectivo: 0,
    totalDigital: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const fetchReportes = useCallback(async (inicio: string, fin: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(
        `/api/admin/reportes?fechaInicio=${encodeURIComponent(
          inicio
        )}&fechaFin=${encodeURIComponent(fin)}`
      );
      const data = await res.json();
      if (res.ok) {
        setVentas(Array.isArray(data.ventas) ? data.ventas : []);
        if (data.metricas) {
          setMetricas(data.metricas);
        }
      } else {
        setErrorMsg(data.error || "No se pudo generar el reporte de ventas.");
      }
    } catch (err) {
      console.error("Error al obtener reportes:", err);
      setErrorMsg("Error de conexión al obtener reportes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportes(hoyStr, hoyStr);
  }, [fetchReportes, hoyStr]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReportes(fechaInicio, fechaFin);
  };

  const toggleExpand = (id: string) => {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNav />

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Historial y Reportes de Ventas</h1>
              <p className="text-xs text-slate-400">
                Auditoría detallada de tickets, pedidos y cobros por rango de fecha
              </p>
            </div>
          </div>

          {/* Filtros por Fecha */}
          <form
            onSubmit={handleFilter}
            className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800"
          >
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

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tarjetas Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-500 font-semibold block mb-1">
              Tickets Válidos
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-100">
                {metricas.totalVentasCount}
              </span>
              {metricas.totalCanceladasCount > 0 && (
                <span className="text-[11px] text-red-400 font-semibold">
                  ({metricas.totalCanceladasCount} cancel.)
                </span>
              )}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500 font-semibold">
                Total Cobrado
              </span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-2xl font-black text-amber-400">
              ${metricas.totalMonto.toLocaleString("es-AR")}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500 font-semibold">
                Total Efectivo
              </span>
              <Banknote className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-black text-emerald-400">
              ${metricas.totalEfectivo.toLocaleString("es-AR")}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500 font-semibold">
                Digital / Tarjetas
              </span>
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
            <p className="text-sm">
              No se encontraron ventas en el rango seleccionado.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Pedido / Fecha</th>
                  <th className="p-4">Cliente / Canal</th>
                  <th className="p-4">Vendedor</th>
                  <th className="p-4">Pago / Estado</th>
                  <th className="p-4">Total</th>
                  <th className="p-4 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ventas.map((v) => (
                  <React.Fragment key={v.id}>
                    <tr
                      className={`hover:bg-slate-800/50 transition cursor-pointer ${
                        v.estado === "CANCELADO" ? "opacity-55" : ""
                      }`}
                      onClick={() => toggleExpand(v.id)}
                    >
                      <td className="p-4">
                        <span className="font-black text-amber-400 mr-2">
                          {formatOrderNumber(v.numeroPedido, v.id)}
                        </span>
                        <span className="font-semibold text-slate-300">
                          {new Date(v.createdAt).toLocaleString("es-AR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}{" "}
                          hs
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-bold mr-1.5">
                          {v.canal || "MOSTRADOR"}
                        </span>
                        {v.clienteNombre && (
                          <span className="font-medium text-slate-200">
                            {v.clienteNombre}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {v.user?.nombre || "Vendedor"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                              v.medioPago === "EFECTIVO"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : v.medioPago === "MERCADOPAGO"
                                ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {v.medioPago}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              v.estado === "CANCELADO"
                                ? "bg-red-500/15 text-red-400"
                                : v.estado === "ENTREGADO"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {v.estado}
                          </span>
                        </div>
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

                    {expandedSaleId === v.id && (
                      <tr className="bg-slate-950/80">
                        <td
                          colSpan={6}
                          className="p-4 border-t border-slate-800/50"
                        >
                          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 max-w-lg space-y-2">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                              Ítems del Ticket
                            </span>
                            <div className="divide-y divide-slate-800 text-xs">
                              {v.items.map((item) => (
                                <div key={item.id} className="py-1.5 space-y-0.5">
                                  <div className="flex justify-between text-slate-300">
                                    <span>
                                      {item.cantidad}x{" "}
                                      {item.product?.nombre || "Producto"}
                                    </span>
                                    <span className="font-medium text-slate-100">
                                      ${Number(item.subtotal).toLocaleString("es-AR")}
                                    </span>
                                  </div>
                                  {item.nota && (
                                    <p className="text-[11px] text-amber-300 italic">
                                      ↳ {item.nota}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                            {v.notas && (
                              <p className="text-[11px] text-amber-200 pt-1 border-t border-slate-800">
                                <strong>Nota del pedido:</strong> {v.notas}
                              </p>
                            )}
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
