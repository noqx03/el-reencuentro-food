import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET: Obtener lista de usuarios según el rol del que consulta
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentRole = ((session?.user as any)?.rol || (session?.user as any)?.role);

    // Solo ADMIN y SUPERADMIN pueden gestionar usuarios
    if (currentRole !== "ADMIN" && currentRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Un ADMIN solo ve vendedores de VENTAS. El SUPERADMIN ve todos los roles.
    const whereCondition =
      currentRole === "ADMIN" ? { rol: "VENTAS" as const } : {};

    const usuarios = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST: Crear un nuevo usuario
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentRole = ((session?.user as any)?.rol || (session?.user as any)?.role);

    if (currentRole !== "ADMIN" && currentRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, email, password, rol } = body;

    if (!nombre || !email || !password || !rol) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    // Restricción: Un ADMIN solo puede crear usuarios con rol VENTAS
    if (currentRole === "ADMIN" && rol !== "VENTAS") {
      return NextResponse.json(
        { error: "Como ADMIN solo tenés permisos para crear usuarios de VENTAS." },
        { status: 403 }
      );
    }

    // Verificar si el email ya existe
    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe) {
      return NextResponse.json(
        { error: "El correo electrónico ya se encuentra registrado." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.user.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
    });

    return NextResponse.json({ success: true, usuario: nuevoUsuario }, { status: 201 });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json({ error: "Error interno en el servidor" }, { status: 500 });
  }
}

// PATCH: Cambiar estado (Activar/Desactivar) usuario
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentRole = ((session?.user as any)?.rol || (session?.user as any)?.role);

    if (currentRole !== "ADMIN" && currentRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id, activo } = await req.json();

    const usuarioAEstado = await prisma.user.findUnique({ where: { id } });

    if (!usuarioAEstado) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Un ADMIN no puede desactivar a un ADMIN o SUPERADMIN
    if (currentRole === "ADMIN" && usuarioAEstado.rol !== "VENTAS") {
      return NextResponse.json({ error: "No tenés permisos para modificar este usuario." }, { status: 403 });
    }

    const actualizado = await prisma.user.update({
      where: { id },
      data: { activo },
      select: { id: true, nombre: true, activo: true },
    });

    return NextResponse.json({ success: true, usuario: actualizado });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}