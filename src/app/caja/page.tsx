"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import {
  Vault,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Unlock,
  Loader2,
  Banknote,
  QrCode,
  CreditCard,
  Receipt,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface ResumenCierre {
  vendedor: string;
  montoInicial: number;
  totalEfectivo: number;
  totalMercadoPago: number;
  totalTarjetas: number;
  totalVentas: number;
  cantidadVentas?: number;
  efectivoEnCajaEsperado: number;
  efectivoContado?: number;
  diferencia?: number;
}

export default function CajaPage() {
  const [cajaActiva, setCajaActiva] = useState<any>(null);
  const [resumenActual, setResumenActual] = useState<ResumenCierre | null>(null);
  const [loading, setLoading] = useState(true);
  const [montoInicial, setMontoInicial] = useState("");
  const [montoEfectivoContado, setMontoEfectivoContado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [summary, setSummary] = useState<ResumenCierre | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchEstadoCaja = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/caja");
      const data = await res.json();
      if (res.ok) {
        setCajaActiva(data.cashShift ?? null);
        setResumenActual(data.resumenActual ?? null);
      } else {
        setErrorMsg(data.error || "No se pudo consultar el estado de caja.");
      }
    } catch (err) {
      console.error("Error al consultar caja:", err);
      setErrorMsg("Error de comunicación al consultar la caja.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstadoCaja();
  }, []);

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "ABRIR",
          montoInicial: Number(montoInicial) || 0,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMontoInicial("");
        setSummary(null);
        await fetchEstadoCaja();
      } else {
        setErrorMsg(data.error || "No se pudo abrir la caja.");
      }
    } catch (err) {
      console.error("Error al abrir caja:", err);
      setErrorMsg("Error de comunicación al abrir la caja.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "CERRAR",
          id: cajaActiva?.id,
          montoEfectivoContado:
            montoEfectivoContado.trim() !== ""
              ? Number(montoEfectivoContado)
              : undefined,
          observaciones: observaciones.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setCajaActiva(null);
        setResumenActual(null);
        setMontoEfectivoContado("");
        setObservaciones("");
      } else {
        setErrorMsg(data.error || "No se pudo cerrar la caja.");
      }
    } catch (err) {
      console.error("Error al cerrar caja:", err);
      setErrorMsg("Error de comunicación al cerrar la caja.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
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
                <Vault className="w-6 h-6 text-amber-500" />
                Control de Caja
              </h1>
              <p className="text-xs text-slate-400">
                Apertura, Arqueo y Cierre de Turno con Resumen de Medios de Pago
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span>Consultando estado de turno...</span>
          </div>
        ) : summary ? (
          /* Tarjeta de Resumen Final */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400 border-b border-slate-800 pb-4">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <h2 className="text-base font-bold">Resumen de Cierre de Caja</h2>
                <p className="text-xs text-slate-400">Operador: {summary.vendedor}</p>
              </div>
            </div>

            {/* Desglose por Medios de Pago */}
            <div className="space-y-3">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-300 text-xs font-semibold">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>Ventas en Efectivo</span>
                </div>
                <span className="font-bold text-slate-100 text-sm">
                  ${summary.totalEfectivo.toLocaleString("es-AR")}
                </span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-300 text-xs font-semibold">
                  <QrCode className="w-4 h-4 text-sky-400" />
                  <span>MercadoPago / QR</span>
                </div>
                <span className="font-bold text-slate-100 text-sm">
                  ${summary.totalMercadoPago.toLocaleString("es-AR")}
                </span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-300 text-xs font-semibold">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Débito / Crédito</span>
                </div>
                <span className="font-bold text-slate-100 text-sm">
                  ${summary.totalTarjetas.toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            {/* Totales Generales */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Monto Inicial de Cambio:</span>
                <span className="font-semibold text-slate-200">
                  ${summary.montoInicial.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Total Facturado en Ventas ({summary.cantidadVentas ?? 0}):</span>
                <span className="font-bold text-amber-400">
                  ${summary.totalVentas.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex justify-between items-center mt-3">
                <span className="text-xs font-bold text-emerald-400 uppercase">
                  Efectivo Esperado en Caja:
                </span>
                <span className="text-xl font-black text-emerald-400">
                  ${summary.efectivoEnCajaEsperado.toLocaleString("es-AR")}
                </span>
              </div>
              {typeof summary.efectivoContado === "number" && (
                <div className="flex justify-between items-center text-xs pt-2">
                  <span className="text-slate-400">Efectivo Contado:</span>
                  <span className="font-bold text-slate-200">
                    ${summary.efectivoContado.toLocaleString("es-AR")}
                  </span>
                </div>
              )}
              {typeof summary.diferencia === "number" && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Diferencia de Arqueo:</span>
                  <span
                    className={`font-black ${
                      summary.diferencia === 0
                        ? "text-emerald-400"
                        : summary.diferencia > 0
                        ? "text-sky-400"
                        : "text-red-400"
                    }`}
                  >
                    {summary.diferencia > 0 ? "+" : ""}$
                    {summary.diferencia.toLocaleString("es-AR")}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSummary(null)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition"
            >
              Entendido / Finalizar
            </button>
          </div>
        ) : cajaActiva ? (
          /* Estado: Caja Abierta con Arqueo y Cierre */
          <form
            onSubmit={handleCerrarCaja}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl"
          >
            <div className="text-center space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 inline-flex items-center gap-2 text-xs font-bold">
                <Unlock className="w-4 h-4" />
                Turno Abierto Activamente
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400">
                  Monto Inicial con el que arrancó el turno:
                </p>
                <p className="text-2xl font-black text-amber-400">
                  ${Number(cajaActiva.montoInicial).toLocaleString("es-AR")}
                </p>
              </div>
            </div>

            {resumenActual && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">Ventas</span>
                  <span className="text-sm font-black text-slate-100">
                    {resumenActual.cantidadVentas ?? 0}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">
                    Efectivo Esperado
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    ${resumenActual.efectivoEnCajaEsperado.toLocaleString("es-AR")}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">
                    Digital / Tarjetas
                  </span>
                  <span className="text-sm font-black text-sky-400">
                    $
                    {(
                      resumenActual.totalMercadoPago + resumenActual.totalTarjetas
                    ).toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Efectivo físico contado en caja ($) (opcional)
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={montoEfectivoContado}
                  onChange={(e) => setMontoEfectivoContado(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  placeholder={
                    resumenActual
                      ? `Esperado: ${resumenActual.efectivoEnCajaEsperado}`
                      : "Ingresar monto contado"
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Observaciones de cierre (opcional)
                </label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  placeholder="Ej: Retiro parcial, diferencia de cambio, etc."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-red-500 hover:bg-red-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  Cerrar Turno y Ver Resumen
                </>
              )}
            </button>
          </form>
        ) : (
          /* Estado: Nueva Apertura */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-500 border-b border-slate-800 pb-4">
              <Lock className="w-5 h-5" />
              <span className="font-bold text-sm">Apertura de Nuevo Turno</span>
            </div>

            <form onSubmit={handleAbrirCaja} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Monto Inicial de Cambio ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                    placeholder="Ej: 5000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
                Abrir Caja e Iniciar Turno
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
