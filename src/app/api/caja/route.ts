export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ShiftWithSales {
  id: string;
  montoInicial: unknown;
  user?: { nombre: string; email: string } | null;
  sales: Array<{
    montoTotal: unknown;
    medioPago: string;
  }>;
}

function buildShiftSummary(
  shift: ShiftWithSales,
  vendedorFallback: string,
  montoEfectivoContado?: number
) {
  let totalEfectivo = 0;
  let totalMercadoPago = 0;
  let totalTarjetas = 0;

  for (const sale of shift.sales) {
    const monto = Number(sale.montoTotal) || 0;
    if (sale.medioPago === "EFECTIVO") {
      totalEfectivo += monto;
    } else if (sale.medioPago === "MERCADOPAGO") {
      totalMercadoPago += monto;
    } else if (sale.medioPago === "DEBITO" || sale.medioPago === "CREDITO") {
      totalTarjetas += monto;
    }
  }

  const montoInicial = Number(shift.montoInicial) || 0;
  const totalVentas = totalEfectivo + totalMercadoPago + totalTarjetas;
  const totalDigital = totalMercadoPago + totalTarjetas;
  const efectivoEnCajaEsperado = montoInicial + totalEfectivo;
  const efectivoContado =
    typeof montoEfectivoContado === "number" && Number.isFinite(montoEfectivoContado)
      ? montoEfectivoContado
      : efectivoEnCajaEsperado;
  const diferencia = efectivoContado - efectivoEnCajaEsperado;

  return {
    vendedor: shift.user?.nombre || shift.user?.email || vendedorFallback,
    montoInicial,
    totalEfectivo,
    totalMercadoPago,
    totalTarjetas,
    totalDigital,
    totalVentas,
    cantidadVentas: shift.sales.length,
    efectivoEnCajaEsperado,
    efectivoContado,
    diferencia,
  };
}

async function closeActiveShift(
  userId: string,
  userName: string,
  shiftId?: string,
  montoEfectivoContado?: number,
  observaciones?: string
) {
  const activeShift = await prisma.cashShift.findFirst({
    where: shiftId
      ? { id: shiftId, userId, estado: "ABIERTA" }
      : { userId, estado: "ABIERTA" },
    include: {
      sales: {
        where: { estado: { not: "CANCELADO" } },
        select: { montoTotal: true, medioPago: true },
      },
      user: {
        select: { nombre: true, email: true },
      },
    },
  });

  if (!activeShift) {
    return null;
  }

  const summary = buildShiftSummary(activeShift, userName, montoEfectivoContado);

  const updatedShift = await prisma.cashShift.update({
    where: { id: activeShift.id },
    data: {
      montoEfectivo: summary.efectivoContado,
      montoDigital: summary.totalDigital,
      diferencia: summary.diferencia,
      observaciones: observaciones?.trim() || null,
      estado: "CERRADA",
      fechaCierre: new Date(),
    },
  });

  return { updatedShift, summary };
}

// GET: Obtener el estado actual de la caja (turno abierto)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const cashShift = await prisma.cashShift.findFirst({
      where: {
        userId,
        estado: "ABIERTA",
      },
      include: {
        sales: {
          where: { estado: { not: "CANCELADO" } },
          select: {
            id: true,
            montoTotal: true,
            medioPago: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        user: {
          select: { nombre: true, email: true },
        },
      },
    });

    const resumenActual = cashShift
      ? buildShiftSummary(cashShift, session.user.name || "Operador")
      : null;

    return NextResponse.json({ cashShift, resumenActual });
  } catch (error) {
    console.error("Error al obtener estado de caja:", error);
    return NextResponse.json(
      { error: "Error al obtener estado de caja" },
      { status: 500 }
    );
  }
}

// POST: Abrir o cerrar caja (compatibilidad con accion: "ABRIR" | "CERRAR")
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const accion = String(body.accion || "ABRIR").toUpperCase();

    if (accion === "CERRAR") {
      const montoContado =
        body.montoEfectivoContado !== undefined && body.montoEfectivoContado !== ""
          ? Number(body.montoEfectivoContado)
          : undefined;

      if (
        montoContado !== undefined &&
        (!Number.isFinite(montoContado) || montoContado < 0)
      ) {
        return NextResponse.json(
          { error: "El efectivo contado debe ser un número válido >= 0" },
          { status: 400 }
        );
      }

      const result = await closeActiveShift(
        userId,
        session.user.name || "Operador",
        body.id,
        montoContado,
        typeof body.observaciones === "string" ? body.observaciones : undefined
      );

      if (!result) {
        return NextResponse.json(
          { error: "No hay una caja abierta para cerrar" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        cashShift: result.updatedShift,
        summary: result.summary,
      });
    }

    // ABRIR
    const montoInicial = Number(body.montoInicial ?? 0);
    if (!Number.isFinite(montoInicial) || montoInicial < 0) {
      return NextResponse.json(
        { error: "El monto inicial debe ser un número válido >= 0" },
        { status: 400 }
      );
    }

    const activeShift = await prisma.cashShift.findFirst({
      where: {
        userId,
        estado: "ABIERTA",
      },
    });

    if (activeShift) {
      return NextResponse.json(
        { error: "Ya existe una caja abierta para tu usuario" },
        { status: 400 }
      );
    }

    const newShift = await prisma.cashShift.create({
      data: {
        userId,
        montoInicial,
        estado: "ABIERTA",
      },
    });

    return NextResponse.json({ cashShift: newShift }, { status: 201 });
  } catch (error) {
    console.error("Error en operación de caja:", error);
    return NextResponse.json(
      { error: "Error al procesar operación de caja" },
      { status: 500 }
    );
  }
}

// PATCH: Cerrar caja explícitamente por ID
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : undefined;
    const rawContado = body.montoEfectivoContado ?? body.montoFinal;
    const montoContado =
      rawContado !== undefined && rawContado !== ""
        ? Number(rawContado)
        : undefined;

    if (
      montoContado !== undefined &&
      (!Number.isFinite(montoContado) || montoContado < 0)
    ) {
      return NextResponse.json(
        { error: "El monto contado debe ser un número válido >= 0" },
        { status: 400 }
      );
    }

    const result = await closeActiveShift(
      userId,
      session.user.name || "Operador",
      id,
      montoContado,
      typeof body.observaciones === "string" ? body.observaciones : undefined
    );

    if (!result) {
      return NextResponse.json(
        { error: "Caja abierta no encontrada para cerrar" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      cashShift: result.updatedShift,
      summary: result.summary,
    });
  } catch (error) {
    console.error("Error al cerrar la caja:", error);
    return NextResponse.json(
      { error: "Error al cerrar la caja" },
      { status: 500 }
    );
  }
}
