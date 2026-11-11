import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Obtener todos los productos
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.rol || (session?.user as any)?.role;

    if (!session || !session.user || (userRole !== "ADMIN" && userRole !== "SUPERADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const productos = await (prisma as any).product
      ? await (prisma as any).product.findMany({ orderBy: { nombre: "asc" } })
      : await (prisma as any).producto.findMany({ orderBy: { nombre: "asc" } });

    return NextResponse.json(productos);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}

// POST: Crear un nuevo producto
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.rol || (session?.user as any)?.role;

    if (!session || !session.user || (userRole !== "ADMIN" && userRole !== "SUPERADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, precio, categoriaId, stock, activo } = body;

    const targetModel = (prisma as any).product || (prisma as any).producto;

    const nuevoProducto = await targetModel.create({
      data: {
        nombre,
        precio: parseFloat(precio),
        categoriaId,
        stock: parseInt(stock, 10) || 0,
        activo: activo ?? true,
      },
    });

    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}