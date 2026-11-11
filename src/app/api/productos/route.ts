export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const productos = await prisma.product.findMany({
      where: { activo: true },
      include: {
        category: {
          select: { nombre: true },
        },
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de productos" },
      { status: 500 }
    );
  }
}