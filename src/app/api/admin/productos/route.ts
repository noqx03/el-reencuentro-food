export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function hasAdminAccess(session: { user?: { role?: string; rol?: string } } | null) {
  const userRole = session?.user?.role || session?.user?.rol;
  return Boolean(
    session?.user && (userRole === "ADMIN" || userRole === "SUPERADMIN")
  );
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
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!hasAdminAccess(session)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
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
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!hasAdminAccess(session)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const nombre = String(body.nombre || "").trim();
    const descripcion =
      typeof body.descripcion === "string" && body.descripcion.trim()
        ? body.descripcion.trim()
        : null;
    const precio = Number(body.precio);
    const stockActual = Number.isFinite(Number(body.stockActual))
      ? Math.trunc(Number(body.stockActual))
      : 0;
    const stockMinimo = Number.isFinite(Number(body.stockMinimo))
      ? Math.trunc(Number(body.stockMinimo))
      : 5;
    const esMenuDia = typeof body.esMenuDia === "boolean" ? body.esMenuDia : false;
    const activo = typeof body.activo === "boolean" ? body.activo : true;

    if (!nombre || !Number.isFinite(precio) || precio < 0) {
      return NextResponse.json(
        { error: "Nombre y precio válido (>= 0) son obligatorios" },
        { status: 400 }
      );
    }

    if (stockActual < 0 || stockMinimo < 0) {
      return NextResponse.json(
        { error: "El stock no puede ser negativo" },
        { status: 400 }
      );
    }

    const categoryId = await resolveCategoryId(body.categoriaNombre);

    const producto = await prisma.product.create({
      data: {
        nombre,
        descripcion,
        precio,
        stockActual,
        stockMinimo,
        esMenuDia,
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
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!hasAdminAccess(session)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body.id || "").trim();
    const nombre = String(body.nombre || "").trim();
    const descripcion =
      typeof body.descripcion === "string" && body.descripcion.trim()
        ? body.descripcion.trim()
        : null;
    const precio = Number(body.precio);
    const stockActual = Number.isFinite(Number(body.stockActual))
      ? Math.trunc(Number(body.stockActual))
      : 0;
    const stockMinimo = Number.isFinite(Number(body.stockMinimo))
      ? Math.trunc(Number(body.stockMinimo))
      : 5;
    const esMenuDia = typeof body.esMenuDia === "boolean" ? body.esMenuDia : false;
    const activo = typeof body.activo === "boolean" ? body.activo : true;

    if (!id || !nombre || !Number.isFinite(precio) || precio < 0) {
      return NextResponse.json(
        { error: "ID, nombre y precio válido (>= 0) son obligatorios" },
        { status: 400 }
      );
    }

    if (stockActual < 0 || stockMinimo < 0) {
      return NextResponse.json(
        { error: "El stock no puede ser negativo" },
        { status: 400 }
      );
    }

    const categoryId = await resolveCategoryId(body.categoriaNombre);

    const producto = await prisma.product.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        precio,
        stockActual,
        stockMinimo,
        esMenuDia,
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }
    console.error("Error al actualizar producto:", error);
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}
