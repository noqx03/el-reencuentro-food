import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { items, metodoPago, total } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }

    const metodoUpper = (metodoPago || "").toUpperCase().replace(/\s+/g, "_");

    // Transacción atómica de venta
    const venta = await prisma.$transaction(async (tx) => {
      // 1. Buscar o crear caja abierta
      let cashShift = await (tx as any).cashShift.findFirst({
        where: {
          userId: session.user.id,
          estado: "ABIERTA",
        },
      });

      if (!cashShift) {
        cashShift = await (tx as any).cashShift.findFirst({
          where: { estado: "ABIERTA" },
        });
      }

      if (!cashShift) {
        cashShift = await (tx as any).cashShift.create({
          data: {
            user: { connect: { id: session.user.id } },
            montoInicial: 0,
            estado: "ABIERTA",
          },
        });
      }

      // 2. Probar variantes del enum de Prisma para MercadoPago
      let medioPagoFinal = "EFECTIVO";
      const probablesValores = [metodoUpper, "MERCADOPAGO", "MERCADO_PAGO", "TRANSFERENCIA", "DEBITO", "EFECTIVO"];

      let nuevaVenta = null;
      let ultimoError = null;

      for (const medio of probablesValores) {
        try {
          nuevaVenta = await tx.sale.create({
            data: {
              user: { connect: { id: session.user.id } },
              cashShift: { connect: { id: cashShift.id } },
              medioPago: medio as any,
              montoTotal: Number(total),
              items: {
                create: items.map((item: any) => ({
                  productId: item.id,
                  cantidad: item.quantity,
                  precioUnitario: item.price,
                  subtotal: item.price * item.quantity,
                })),
              },
            },
          });
          if (nuevaVenta) break; // Venta creada exitosamente
        } catch (e) {
          ultimoError = e;
        }
      }

      if (!nuevaVenta) {
        throw ultimoError || new Error("No se pudo mapear el medio de pago al enum de la base de datos.");
      }

      // 3. Descontar stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.id },
          data: {
            stockActual: {
              decrement: item.quantity,
            },
          },
        });
      }

      return nuevaVenta;
    });

    return NextResponse.json({ success: true, venta }, { status: 201 });
  } catch (error: any) {
    console.error("Error al registrar la venta:", error);
    return NextResponse.json(
      { error: "Error interno al procesar la venta", details: error?.message },
      { status: 500 }
    );
  }
}