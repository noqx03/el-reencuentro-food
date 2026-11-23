export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_PAYMENT_METHODS = new Set([
  "EFECTIVO",
  "MERCADOPAGO",
  "DEBITO",
  "CREDITO",
]);

function normalizePaymentMethod(metodoPago?: string) {
  const cleaned = (metodoPago || "EFECTIVO")
    .toUpperCase()
    .replace(/[\s_-]+/g, "");

  if (cleaned === "MERCADOPAGO" || cleaned === "MP") return "MERCADOPAGO";
  if (cleaned === "DEBITO" || cleaned === "TARJETADEBITO") return "DEBITO";
  if (cleaned === "CREDITO" || cleaned === "TARJETACREDITO") return "CREDITO";
  if (VALID_PAYMENT_METHODS.has(cleaned)) return cleaned;
  return "EFECTIVO";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!session || !session.user || !userId) {
      return NextResponse.json(
        { error: "Sesión inválida o sin ID de usuario. Volvé a iniciar sesión." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { items, metodoPago, total } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }

    const medioPagoFinal = normalizePaymentMethod(metodoPago);
    const montoTotal = Number(total);

    if (!Number.isFinite(montoTotal) || montoTotal < 0) {
      return NextResponse.json({ error: "Total de venta inválido" }, { status: 400 });
    }

    const venta = await prisma.$transaction(async (tx) => {
      let cashShift = await tx.cashShift.findFirst({
        where: {
          userId,
          estado: "ABIERTA",
        },
      });

      if (!cashShift) {
        cashShift = await tx.cashShift.findFirst({
          where: { estado: "ABIERTA" },
        });
      }

      if (!cashShift) {
        cashShift = await tx.cashShift.create({
          data: {
            userId,
            montoInicial: 0,
            estado: "ABIERTA",
          },
        });
      }

      const computedTotal =
        montoTotal > 0
          ? montoTotal
          : items.reduce(
              (acc: number, item: any) => acc + Number(item.price) * Number(item.quantity),
              0
            );

      const nuevaVenta = await tx.sale.create({
        data: {
          userId,
          cashShiftId: cashShift.id,
          medioPago: medioPagoFinal as any,
          montoTotal: computedTotal,
          items: {
            create: items.map((item: any) => {
              const qty = Number(item.quantity);
              const price = Number(item.price);
              return {
                productId: item.id,
                cantidad: qty,
                precioUnitario: price,
                subtotal: price * qty,
              };
            }),
          },
        },
      });

      for (const item of items) {
        await tx.product.update({
          where: { id: item.id },
          data: {
            stockActual: {
              decrement: Number(item.quantity),
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