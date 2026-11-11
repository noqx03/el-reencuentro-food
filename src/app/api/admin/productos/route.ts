import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Obtener todos los productos (incluyendo inactivos) con su categoría
export async function GET() {
  try {
    cconst session = await getServerSession(authOptions);

    const userRole = (session?.user as any)?.rol || (session?.user as any)?.role;

  if (!session || !session.user || (userRole !== "ADMIN" && userRole !== "SUPERADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}

    const productos = await prisma.product.findMany({
      include: {
        category: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { nombre: "asc" },
    });

    const categorias = await prisma.category.findMany({
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json({ productos, categorias });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST: Crear un nuevo producto
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, precio, stockActual, categoriaNombre } = body;

    if (!nombre || precio === undefined || stockActual === undefined || !categoriaNombre) {
      return NextResponse.json(
        { error: "Todos los campos obligatorios deben completarse" },
        { status: 400 }
      );
    }

    const nuevoProducto = await prisma.product.create({
      data: {
        nombre,
        precio: Number(precio),
        stockActual: Number(stockActual),
        activo: true,
        category: {
          connectOrCreate: {
            where: { nombre: categoriaNombre },
            create: { nombre: categoriaNombre },
          },
        },
      },
    });

    return NextResponse.json({ success: true, producto: nuevoProducto }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear producto:", error);
    return NextResponse.json({ error: "Error interno en el servidor" }, { status: 500 });
  }
}

// PUT: Editar un producto existente (precio, stock, activo, nombre)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { id, nombre, precio, stockActual, activo, categoriaNombre } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de producto requerido" }, { status: 400 });
    }

    const actualizado = await prisma.product.update({
      where: { id },
      data: {
        nombre,
        precio: Number(precio),
        stockActual: Number(stockActual),
        activo: Boolean(activo),
        ...(categoriaNombre && {
          category: {
            connectOrCreate: {
              where: { nombre: categoriaNombre },
              create: { nombre: categoriaNombre },
            },
          },
        }),
      },
    });

    return NextResponse.json({ success: true, producto: actualizado });
  } catch (error: any) {
    console.error("Error al actualizar producto:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}