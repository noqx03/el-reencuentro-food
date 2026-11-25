export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const productos = await prisma.product.findMany({
      where: { activo: true },
      include: {
        category: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: [{ esMenuDia: "desc" }, { nombre: "asc" }],
    });

    return NextResponse.json({ productos });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de productos" },
      { status: 500 }
    );
  }
}
