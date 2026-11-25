export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { OrderStatus, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseArgentinaDayBoundary } from "@/lib/date";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = session.user.role || session.user.rol;
    if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const searchParams = new URL(req.url, `${protocol}://${host}`).searchParams;

    const fechaInicioParam = searchParams.get("fechaInicio");
    const fechaFinParam = searchParams.get("fechaFin");

    const whereClause: Prisma.SaleWhereInput = {};

    if (fechaInicioParam && fechaFinParam) {
      const inicio = parseArgentinaDayBoundary(fechaInicioParam, false);
      const fin = parseArgentinaDayBoundary(fechaFinParam, true);

      if (!inicio || !fin || inicio > fin) {
        return NextResponse.json(
          { error: "Rango de fechas inválido" },
          { status: 400 }
        );
      }

      whereClause.createdAt = {
        gte: inicio,
        lte: fin,
      };
    }

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

    const ventasActivas = ventas.filter(
      (v) => v.estado !== OrderStatus.CANCELADO
    );

    let totalMonto = 0;
    let totalEfectivo = 0;
    let totalMercadoPago = 0;
    let totalDebito = 0;
    let totalCredito = 0;

    for (const v of ventasActivas) {
      const monto = Number(v.montoTotal) || 0;
      totalMonto += monto;
      switch (v.medioPago) {
        case "EFECTIVO":
          totalEfectivo += monto;
          break;
        case "MERCADOPAGO":
          totalMercadoPago += monto;
          break;
        case "DEBITO":
          totalDebito += monto;
          break;
        case "CREDITO":
          totalCredito += monto;
          break;
      }
    }

    const totalDigital = totalMonto - totalEfectivo;

    return NextResponse.json({
      ventas,
      metricas: {
        totalVentasCount: ventasActivas.length,
        totalCanceladasCount: ventas.length - ventasActivas.length,
        totalMonto,
        totalEfectivo,
        totalDigital,
        totalMercadoPago,
        totalDebito,
        totalCredito,
      },
    });
  } catch (error) {
    console.error("Error al obtener reportes:", error);
    return NextResponse.json(
      { error: "Error al generar reporte de ventas" },
      { status: 500 }
    );
  }
}
