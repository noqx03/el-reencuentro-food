export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { OrderStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArgentinaTodayStart } from "@/lib/date";

const VALID_STATUSES = new Set<OrderStatus>([
  OrderStatus.PENDIENTE,
  OrderStatus.EN_PREPARACION,
  OrderStatus.LISTO,
  OrderStatus.ENTREGADO,
  OrderStatus.CANCELADO,
]);

// GET: Listar pedidos del día para tablero de cocina y despacho
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const searchParams = new URL(req.url, `${protocol}://${host}`).searchParams;
    const onlyCount = searchParams.get("summary") === "1";

    const todayStart = getArgentinaTodayStart();

    if (onlyCount) {
      const activosCount = await prisma.sale.count({
        where: {
          createdAt: { gte: todayStart },
          estado: {
            in: [
              OrderStatus.PENDIENTE,
              OrderStatus.EN_PREPARACION,
              OrderStatus.LISTO,
            ],
          },
        },
      });
      return NextResponse.json({ activosCount });
    }

    const pedidos = await prisma.sale.findMany({
      where: {
        createdAt: { gte: todayStart },
      },
      include: {
        user: {
          select: { nombre: true },
        },
        items: {
          include: {
            product: {
              select: { nombre: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    const conteos = {
      pendientes: pedidos.filter((p) => p.estado === OrderStatus.PENDIENTE).length,
      enPreparacion: pedidos.filter(
        (p) => p.estado === OrderStatus.EN_PREPARACION
      ).length,
      listos: pedidos.filter((p) => p.estado === OrderStatus.LISTO).length,
      entregados: pedidos.filter((p) => p.estado === OrderStatus.ENTREGADO).length,
      cancelados: pedidos.filter((p) => p.estado === OrderStatus.CANCELADO).length,
    };

    return NextResponse.json({ pedidos, conteos });
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    return NextResponse.json(
      { error: "Error al obtener la cola de pedidos" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar estado del pedido (cocina/despacho/cancelación)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const nuevoEstado = String(body.estado || "").toUpperCase() as OrderStatus;

    if (!id || !VALID_STATUSES.has(nuevoEstado)) {
      return NextResponse.json(
        { error: "ID de pedido o estado inválido" },
        { status: 400 }
      );
    }

    const userRole = session.user.role || session.user.rol;
    const isAdminOrSuper = userRole === "ADMIN" || userRole === "SUPERADMIN";

    if (nuevoEstado === OrderStatus.CANCELADO && !isAdminOrSuper) {
      return NextResponse.json(
        { error: "Solo un administrador puede cancelar un pedido." },
        { status: 403 }
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const current = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!current) {
        return null;
      }

      if (current.estado === OrderStatus.CANCELADO && nuevoEstado !== OrderStatus.CANCELADO) {
        throw new Error("CANNOT_REOPEN_CANCELLED");
      }

      // Si pasa a CANCELADO desde un estado activo, restaurar el stock de cada ítem
      if (
        nuevoEstado === OrderStatus.CANCELADO &&
        current.estado !== OrderStatus.CANCELADO
      ) {
        for (const item of current.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockActual: { increment: item.cantidad },
            },
          });
        }
      }

      const now = new Date();
      return tx.sale.update({
        where: { id },
        data: {
          estado: nuevoEstado,
          fechaListo:
            nuevoEstado === OrderStatus.LISTO
              ? current.fechaListo || now
              : current.fechaListo,
          fechaEntregado:
            nuevoEstado === OrderStatus.ENTREGADO ? now : current.fechaEntregado,
        },
        include: {
          user: { select: { nombre: true } },
          items: {
            include: {
              product: { select: { nombre: true } },
            },
          },
        },
      });
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, pedido: updatedOrder });
  } catch (error) {
    if (error instanceof Error && error.message === "CANNOT_REOPEN_CANCELLED") {
      return NextResponse.json(
        { error: "No se puede reactivar un pedido que ya fue cancelado." },
        { status: 400 }
      );
    }
    console.error("Error al actualizar estado del pedido:", error);
    return NextResponse.json(
      { error: "Error al actualizar el pedido" },
      { status: 500 }
    );
  }
}
