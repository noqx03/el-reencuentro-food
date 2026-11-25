export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { OrderChannel, OrderStatus, PaymentMethod } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArgentinaTodayStart } from "@/lib/date";

const VALID_PAYMENT_METHODS = new Set<PaymentMethod>([
  PaymentMethod.EFECTIVO,
  PaymentMethod.MERCADOPAGO,
  PaymentMethod.DEBITO,
  PaymentMethod.CREDITO,
]);

const VALID_CHANNELS = new Set<OrderChannel>([
  OrderChannel.MOSTRADOR,
  OrderChannel.WHATSAPP,
  OrderChannel.TELEFONO,
  OrderChannel.PEDIDOSYA,
  OrderChannel.RAPPI,
]);

function normalizePaymentMethod(metodoPago?: string): PaymentMethod {
  const cleaned = (metodoPago || "EFECTIVO")
    .toUpperCase()
    .replace(/[\s_-]+/g, "");

  if (cleaned === "MERCADOPAGO" || cleaned === "MP") {
    return PaymentMethod.MERCADOPAGO;
  }
  if (cleaned === "DEBITO" || cleaned === "TARJETADEBITO") {
    return PaymentMethod.DEBITO;
  }
  if (cleaned === "CREDITO" || cleaned === "TARJETACREDITO") {
    return PaymentMethod.CREDITO;
  }
  if (VALID_PAYMENT_METHODS.has(cleaned as PaymentMethod)) {
    return cleaned as PaymentMethod;
  }
  return PaymentMethod.EFECTIVO;
}

function normalizeChannel(canal?: string): OrderChannel {
  const cleaned = (canal || "MOSTRADOR")
    .toUpperCase()
    .replace(/[\s_-]+/g, "");
  if (VALID_CHANNELS.has(cleaned as OrderChannel)) {
    return cleaned as OrderChannel;
  }
  return OrderChannel.MOSTRADOR;
}

function cleanOptionalText(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLen) : null;
}

class SaleValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return NextResponse.json(
        { error: "Sesión inválida o sin ID de usuario. Volvé a iniciar sesión." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { items, metodoPago, montoPaga } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }

    const parsedItems: Array<{ id: string; quantity: number; nota: string | null }> = [];
    const quantityByProduct = new Map<string, number>();

    for (const rawItem of items) {
      const productId = typeof rawItem?.id === "string" ? rawItem.id.trim() : "";
      const qty = Number(rawItem?.quantity);
      const nota = cleanOptionalText(rawItem?.nota, 150);

      if (!productId || !Number.isInteger(qty) || qty <= 0) {
        return NextResponse.json(
          { error: "Ítem o cantidad inválida en el pedido" },
          { status: 400 }
        );
      }

      parsedItems.push({ id: productId, quantity: qty, nota });
      quantityByProduct.set(
        productId,
        (quantityByProduct.get(productId) || 0) + qty
      );
    }

    const medioPagoFinal = normalizePaymentMethod(metodoPago);
    const canalFinal = normalizeChannel(body.canal);
    const clienteNombre = cleanOptionalText(body.clienteNombre, 80);
    const clienteTelefono = cleanOptionalText(body.clienteTelefono, 30);
    const notas = cleanOptionalText(body.notas, 300);
    const entregaInmediata = Boolean(body.entregaInmediata);

    const rawMontoPaga =
      montoPaga !== undefined && montoPaga !== null && montoPaga !== ""
        ? Number(montoPaga)
        : null;

    if (
      rawMontoPaga !== null &&
      (!Number.isFinite(rawMontoPaga) || rawMontoPaga < 0)
    ) {
      return NextResponse.json(
        { error: "El monto abonado es inválido" },
        { status: 400 }
      );
    }

    const productIds = Array.from(quantityByProduct.keys());
    const todayStart = getArgentinaTodayStart();

    const venta = await prisma.$transaction(async (tx) => {
      const dbProducts = await tx.product.findMany({
        where: {
          id: { in: productIds },
          activo: true,
        },
      });

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      if (dbProducts.length !== productIds.length) {
        throw new SaleValidationError(
          "Uno o más productos no existen o están pausados",
          400
        );
      }

      for (const [productId, totalQty] of quantityByProduct.entries()) {
        const product = productMap.get(productId)!;

        const updated = await tx.product.updateMany({
          where: {
            id: productId,
            activo: true,
            stockActual: { gte: totalQty },
          },
          data: {
            stockActual: { decrement: totalQty },
          },
        });

        if (updated.count !== 1) {
          throw new SaleValidationError(
            `Stock insuficiente para "${product.nombre}" (disponible: ${product.stockActual})`,
            409
          );
        }
      }

      let montoTotal = 0;
      const saleItemsData = parsedItems.map((item) => {
        const product = productMap.get(item.id)!;
        const precioUnitario = Number(product.precio);
        const subtotal = precioUnitario * item.quantity;
        montoTotal += subtotal;

        return {
          productId: item.id,
          cantidad: item.quantity,
          precioUnitario,
          subtotal,
          nota: item.nota,
        };
      });

      let montoPagaFinal: number | null = null;
      let vueltoFinal: number | null = null;

      if (medioPagoFinal === PaymentMethod.EFECTIVO && rawMontoPaga !== null) {
        if (rawMontoPaga < montoTotal) {
          throw new SaleValidationError(
            "El monto abonado en efectivo es menor al total de la venta",
            400
          );
        }
        montoPagaFinal = rawMontoPaga;
        vueltoFinal = rawMontoPaga - montoTotal;
      }

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

      const maxOrder = await tx.sale.aggregate({
        where: {
          createdAt: { gte: todayStart },
        },
        _max: {
          numeroPedido: true,
        },
      });

      const numeroPedido = (maxOrder._max.numeroPedido ?? 0) + 1;
      const now = new Date();

      return tx.sale.create({
        data: {
          userId,
          cashShiftId: cashShift.id,
          numeroPedido,
          estado: entregaInmediata ? OrderStatus.ENTREGADO : OrderStatus.PENDIENTE,
          canal: canalFinal,
          clienteNombre,
          clienteTelefono,
          notas,
          fechaListo: entregaInmediata ? now : null,
          fechaEntregado: entregaInmediata ? now : null,
          medioPago: medioPagoFinal,
          montoTotal,
          montoPaga: montoPagaFinal,
          vuelto: vueltoFinal,
          items: {
            create: saleItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: { select: { nombre: true } },
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        ventaId: venta.id,
        numeroPedido: venta.numeroPedido,
        venta,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Error al registrar la venta:", error);
    return NextResponse.json(
      { error: "Error interno al procesar la venta" },
      { status: 500 }
    );
  }
}
