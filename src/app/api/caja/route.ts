import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: Consultar la caja abierta del usuario
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const cashShift = await prisma.cashShift.findFirst({
      where: {
        userId: session.user.id,
        estado: "ABIERTA",
      },
      include: {
        sales: true,
      },
    });

    return NextResponse.json({ cashShift });
  } catch (error: any) {
    console.error("Error al obtener estado de caja:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST: Abrir o Cerrar Turno con Resumen Directo
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { accion, montoInicial } = body;

    // APERTURA DE CAJA
    if (accion === "ABRIR") {
      const cajaAbierta = await prisma.cashShift.findFirst({
        where: { userId: session.user.id, estado: "ABIERTA" },
      });

      if (cajaAbierta) {
        return NextResponse.json(
          { error: "Ya hay una caja abierta para este usuario." },
          { status: 400 }
        );
      }

      const nuevoTurno = await prisma.cashShift.create({
        data: {
          user: { connect: { id: session.user.id } },
          montoInicial: Number(montoInicial) || 0,
          estado: "ABIERTA",
        },
      });

      return NextResponse.json({ success: true, cashShift: nuevoTurno });
    }

    // CIERRE DIRECTO DE CAJA
    if (accion === "CERRAR") {
      const cajaAbierta = await prisma.cashShift.findFirst({
        where: { userId: session.user.id, estado: "ABIERTA" },
        include: { sales: true },
      });

      if (!cajaAbierta) {
        return NextResponse.json(
          { error: "No hay ninguna caja abierta activa." },
          { status: 400 }
        );
      }

      // Agrupar ventas por medio de pago
      let totalEfectivo = 0;
      let totalMercadoPago = 0;
      let totalTarjetas = 0;

      cajaAbierta.sales.forEach((sale) => {
        const monto = Number(sale.montoTotal);
        const medio = sale.medioPago?.toUpperCase() || "";

        if (medio === "EFECTIVO") {
          totalEfectivo += monto;
        } else if (medio === "TRANSFERENCIA" || medio === "MERCADOPAGO" || medio === "MP") {
          totalMercadoPago += monto;
        } else {
          totalTarjetas += monto; // DEBITO, CREDITO, ETC.
        }
      });

      const totalVentas = totalEfectivo + totalMercadoPago + totalTarjetas;

      // Marcar caja como CERRADA
      await prisma.cashShift.update({
        where: { id: cajaAbierta.id },
        data: {
          estado: "CERRADA",
          fechaCierre: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        summary: {
          vendedor: session.user.name || "Vendedor",
          montoInicial: Number(cajaAbierta.montoInicial),
          totalEfectivo,
          totalMercadoPago,
          totalTarjetas,
          totalVentas,
          efectivoEnCajaEsperado: Number(cajaAbierta.montoInicial) + totalEfectivo,
        },
      });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error: any) {
    console.error("Error en módulo de caja:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}