export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function hasAdminAccess(session: any) {
  const userRole = session?.user?.rol || session?.user?.role;
  return Boolean(session && session.user && (userRole === "ADMIN" || userRole === "SUPERADMIN"));
}

async function resolveCategoryId(categoriaNombre?: string) {
  const cleanName = (categoriaNombre || "General").trim() || "General";
  const category = await prisma.category.upsert({
    where: { nombre: cleanName },
    update: {},
    create: { nombre: cleanName },
  });
  return category.id;
}

// GET: Obtener productos y categorías para el panel admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!hasAdminAccess(session)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const [productos, categorias] = await Promise.all([
      prisma.product.findMany({
        include: {
          category: {
            select: { id: true, nombre: true },
          },
        },
        orderBy: { nombre: "asc" },
      }),
      prisma.category.findMany({
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
    ]);

    return NextResponse.json({ productos, categorias });
  } catch (error) {
    console.error("Error al obtener productos y categorías:", error);
    return NextResponse.json(
      { error: "Error al cargar el catálogo de productos", productos: [], categorias: [] },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo producto
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasAdminAccess(session)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const nombre = String(body.nombre || "").trim();
    const precio = Number(body.precio);
    const stockActual = Number.isFinite(Number(body.stockActual))
      ? Math.trunc(Number(body.stockActual))
      : 0;
    const activo = typeof body.activo === "boolean" ? body.activo : true;

    if (!nombre || !Number.isFinite(precio) || precio < 0) {
      return NextResponse.json(
        { error: "Nombre y precio válido son obligatorios" },
        { status: 400 }
      );
    }

    const categoryId = await resolveCategoryId(body.categoriaNombre);

    const producto = await prisma.product.create({
      data: {
        nombre,
        precio,
        stockActual,
        activo,
        categoryId,
      },
      include: {
        category: {
          select: { id: true, nombre: true },
        },
      },
    });

    return NextResponse.json({ producto }, { status: 201 });
  } catch (error) {
    console.error("Error al crear producto:", error);
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}

// PUT: Actualizar un producto existente
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasAdminAccess(session)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body.id || "").trim();
    const nombre = String(body.nombre || "").trim();
    const precio = Number(body.precio);
    const stockActual = Number.isFinite(Number(body.stockActual))
      ? Math.trunc(Number(body.stockActual))
      : 0;
    const activo = typeof body.activo === "boolean" ? body.activo : true;

    if (!id || !nombre || !Number.isFinite(precio) || precio < 0) {
      return NextResponse.json(
        { error: "ID, nombre y precio válido son obligatorios" },
        { status: 400 }
      );
    }

    const categoryId = await resolveCategoryId(body.categoriaNombre);

    const producto = await prisma.product.update({
      where: { id },
      data: {
        nombre,
        precio,
        stockActual,
        activo,
        categoryId,
      },
      include: {
        category: {
          select: { id: true, nombre: true },
        },
      },
    });

    return NextResponse.json({ producto });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}