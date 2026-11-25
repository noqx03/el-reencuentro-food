"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ChefHat,
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  PackageCheck,
  Flame,
  User,
  Phone,
  AlertCircle,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { formatOrderNumber } from "@/components/TicketPrint";

type OrderStatus =
  | "PENDIENTE"
  | "EN_PREPARACION"
  | "LISTO"
  | "ENTREGADO"
  | "CANCELADO";

interface PedidoItem {
  id: string;
  cantidad: number;
  nota?: string | null;
  product: {
    nombre: string;
  };
}

interface Pedido {
  id: string;
  numeroPedido: number;
  estado: OrderStatus;
  canal: string;
  clienteNombre?: string | null;
  clienteTelefono?: string | null;
  notas?: string | null;
  montoTotal: number;
  medioPago: string;
  createdAt: string;
  user?: {
    nombre: string;
  };
  items: PedidoItem[];
}

function getMinutesElapsed(isoDate: string): number {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

const CHANNEL_STYLE: Record<string, string> = {
  MOSTRADOR: "bg-slate-800 text-slate-200 border-slate-700",
  WHATSAPP: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  TELEFONO: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  PEDIDOSYA: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  RAPPI: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export default function PedidosPage() {
  const { data: session } = useSession();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const userRole = session?.user?.role || session?.user?.rol;
  const isAdminOrSuper = userRole === "ADMIN" || userRole === "SUPERADMIN";

  const fetchPedidos = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/pedidos");
      const data = await res.json();
      if (res.ok) {
        setPedidos(Array.isArray(data.pedidos) ? data.pedidos : []);
      } else {
        setErrorMsg(data.error || "No se pudieron cargar los pedidos.");
      }
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      setErrorMsg("Error de conexión al cargar la cola de pedidos.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(() => {
      fetchPedidos(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  const cambiarEstado = async (id: string, estado: OrderStatus) => {
    try {
      setUpdatingId(id);
      setErrorMsg(null);
      const res = await fetch("/api/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchPedidos(true);
      } else {
        setErrorMsg(data.error || "No se pudo actualizar el estado.");
      }
    } catch (err) {
      console.error("Error al actualizar pedido:", err);
      setErrorMsg("Error de conexión al actualizar pedido.");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendientes = pedidos.filter((p) => p.estado === "PENDIENTE");
  const enPreparacion = pedidos.filter((p) => p.estado === "EN_PREPARACION");
  const listos = pedidos.filter((p) => p.estado === "LISTO");
  const historial = pedidos
    .filter((p) => p.estado === "ENTREGADO" || p.estado === "CANCELADO")
    .slice()
    .reverse();

  const renderOrderCard = (
    p: Pedido,
    actionLabel: string,
    nextStatus: OrderStatus,
    actionClass: string,
    prevStatus?: OrderStatus
  ) => {
    const mins = getMinutesElapsed(p.createdAt);
    const orderNum = formatOrderNumber(p.numeroPedido, p.id);
    const isBusy = updatingId === p.id;

    return (
      <div
        key={p.id}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg"
      >
        {/* Cabecera del pedido */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-amber-400 tracking-tight">
                {orderNum}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${
                  CHANNEL_STYLE[p.canal] || CHANNEL_STYLE.MOSTRADOR
                }`}
              >
                {p.canal}
              </span>
            </div>
            {(p.clienteNombre || p.clienteTelefono) && (
              <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-slate-300">
                {p.clienteNombre && (
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <User className="w-3 h-3 text-slate-400" />
                    {p.clienteNombre}
                  </span>
                )}
                {p.clienteTelefono && (
                  <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                    <Phone className="w-3 h-3" />
                    {p.clienteTelefono}
                  </span>
                )}
              </div>
            )}
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${
              mins >= 20
                ? "bg-red-500/15 text-red-400"
                : mins >= 10
                ? "bg-amber-500/15 text-amber-400"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            <Clock className="w-3 h-3" />
            {mins} min
          </span>
        </div>

        {/* Ítems y notas de cocina */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2">
          {p.items.map((item) => (
            <div key={item.id} className="text-xs">
              <div className="font-semibold text-slate-100">
                <span className="text-amber-400 font-black mr-1.5">
                  {item.cantidad}x
                </span>
                {item.product?.nombre || "Producto"}
              </div>
              {item.nota && (
                <p className="text-[11px] text-amber-300 pl-5 italic">
                  ↳ {item.nota}
                </p>
              )}
            </div>
          ))}
        </div>

        {p.notas && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-[11px] text-amber-200">
            <strong className="uppercase text-[10px] mr-1">Nota:</strong>
            {p.notas}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-1">
          {prevStatus && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => cambiarEstado(p.id, prevStatus)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition disabled:opacity-50"
              title="Volver al estado anterior"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            disabled={isBusy}
            onClick={() => cambiarEstado(p.id, nextStatus)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wide transition flex items-center justify-center gap-1.5 disabled:opacity-50 ${actionClass}`}
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              actionLabel
            )}
          </button>

          {isAdminOrSuper && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => cambiarEstado(p.id, "CANCELADO")}
              className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition disabled:opacity-50"
              title="Cancelar pedido y devolver stock"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <Link
            href="/pos"
            className="p-2 bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al POS</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 leading-none">
                Pedidos y Cocina (Take Away)
              </h1>
              <span className="text-[11px] text-slate-400">
                Actualización automática cada 10s
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              mostrarHistorial
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            {mostrarHistorial
              ? "Ver Tablero Activo"
              : `Historial del Día (${historial.length})`}
          </button>

          <button
            type="button"
            onClick={() => fetchPedidos()}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition"
            title="Actualizar ahora"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto w-full flex-1 space-y-6">
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span>Cargando pedidos del día...</span>
          </div>
        ) : mostrarHistorial ? (
          /* Historial de Entregados y Cancelados */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200">
                Pedidos Entregados y Cancelados Hoy
              </h2>
            </div>
            {historial.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                Todavía no hay pedidos entregados o cancelados hoy.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {historial.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-amber-400 text-sm">
                          {formatOrderNumber(p.numeroPedido, p.id)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.estado === "ENTREGADO"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {p.estado}
                        </span>
                        <span className="text-slate-400">{p.canal}</span>
                        {p.clienteNombre && (
                          <span className="text-slate-200 font-semibold">
                            • {p.clienteNombre}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400">
                        {p.items
                          .map(
                            (i) =>
                              `${i.cantidad}x ${i.product?.nombre || "Producto"}`
                          )
                          .join(", ")}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-100">
                        ${Number(p.montoTotal).toLocaleString("es-AR")}
                      </span>
                      {p.estado === "ENTREGADO" && (
                        <button
                          type="button"
                          disabled={updatingId === p.id}
                          onClick={() => cambiarEstado(p.id, "LISTO")}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Volver a Listo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Tablero Kanban de 3 Columnas */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* Columna 1: Pendientes */}
            <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pendientes
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-black">
                  {pendientes.length}
                </span>
              </div>

              {pendientes.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">
                  Sin pedidos pendientes
                </p>
              ) : (
                <div className="space-y-3">
                  {pendientes.map((p) =>
                    renderOrderCard(
                      p,
                      "Iniciar Preparación",
                      "EN_PREPARACION",
                      "bg-amber-500 hover:bg-amber-400 text-slate-950"
                    )
                  )}
                </div>
              )}
            </section>

            {/* Columna 2: En Preparación */}
            <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  En Preparación
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 text-xs font-black">
                  {enPreparacion.length}
                </span>
              </div>

              {enPreparacion.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">
                  Ningún pedido en cocina
                </p>
              ) : (
                <div className="space-y-3">
                  {enPreparacion.map((p) =>
                    renderOrderCard(
                      p,
                      "Marcar Listo",
                      "LISTO",
                      "bg-sky-500 hover:bg-sky-400 text-slate-950",
                      "PENDIENTE"
                    )
                  )}
                </div>
              )}
            </section>

            {/* Columna 3: Listos para Retirar */}
            <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4" />
                  Listos para Retirar
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-black">
                  {listos.length}
                </span>
              </div>

              {listos.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">
                  Sin pedidos listos para entrega
                </p>
              ) : (
                <div className="space-y-3">
                  {listos.map((p) =>
                    renderOrderCard(
                      p,
                      "Entregado al Cliente",
                      "ENTREGADO",
                      "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
                      "EN_PREPARACION"
                    )
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
