import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Obtener el estado actual de la caja (turno abierto)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const cashShift = await prisma.cashShift.findFirst({
      where: {
        userId: userId,
        estado: "ABIERTA",
      },
      include: {
        ventas: true,
      },
    });

    return NextResponse.json(cashShift);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener estado de caja" }, { status: 500 });
  }
}

// POST: Abrir una nueva caja
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { montoInicial } = body;

    // Verificar si ya hay una caja abierta para este usuario
    const activeShift = await prisma.cashShift.findFirst({
      where: {
        userId: userId,
        estado: "ABIERTA",
      },
    });

    if (activeShift) {
      return NextResponse.json({ error: "Ya existe una caja abierta" }, { status: 400 });
    }

    const newShift = await prisma.cashShift.create({
      data: {
        userId: userId,
        montoInicial: parseFloat(montoInicial) || 0,
        estado: "ABIERTA",
      },
    });

    return NextResponse.json(newShift, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al abrir la caja" }, { status: 500 });
  }
}

// PATCH: Cerrar caja
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { id, montoFinal, observaciones } = body;

    const updatedShift = await prisma.cashShift.update({
      where: { id },
      data: {
        montoFinal: parseFloat(montoFinal) || 0,
        observaciones,
        estado: "CERRADA",
        fechaCierre: new Date(),
      },
    });

    return NextResponse.json(updatedShift);
  } catch (error) {
    return NextResponse.json({ error: "Error al cerrar la caja" }, { status: 500 });
  }
}