import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fechaInicioParam = searchParams.get("fechaInicio");
    const fechaFinParam = searchParams.get("fechaFin");

    // Construcción de filtros por fecha
    let whereClause: any = {};

    if (fechaInicioParam && fechaFinParam) {
      const inicio = new Date(fechaInicioParam);
      inicio.setHours(0, 0, 0, 0);

      const fin = new Date(fechaFinParam);
      fin.setHours(23, 59, 59, 999);

      whereClause.createdAt = {
        gte: inicio,
        lte: fin,
      };
    }

    // Obtener las ventas con relaciones
    const ventas = await prisma.sale.findMany({
      where: whereClause,
      include: {
        user: {
          select: { nombre: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { nombre: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Totales calculados para métricas rápidas
    const totalMonto = ventas.reduce((acc, v) => acc + Number(v.montoTotal), 0);
    const totalEfectivo = ventas
      .filter((v) => v.medioPago?.toUpperCase() === "EFECTIVO")
      .reduce((acc, v) => acc + Number(v.montoTotal), 0);
    const totalDigital = totalMonto - totalEfectivo;

    return NextResponse.json({
      ventas,
      metricas: {
        totalVentasCount: ventas.length,
        totalMonto,
        totalEfectivo,
        totalDigital,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener reportes:", error);
    return NextResponse.json(
      { error: "Error al generar reporte de ventas" },
      { status: 500 }
    );
  }
}