export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = new Set<Role>([Role.SUPERADMIN, Role.ADMIN, Role.VENTAS]);

// GET: Obtener lista de usuarios según el rol del que consulta
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentRole = session.user.role || session.user.rol;

    if (currentRole !== "ADMIN" && currentRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const whereCondition =
      currentRole === "ADMIN" ? { rol: Role.VENTAS } : {};

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

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentRole = session.user.role || session.user.rol;

    if (currentRole !== "ADMIN" && currentRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const nombre = String(body.nombre || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rol = String(body.rol || "").toUpperCase() as Role;

    if (!nombre || !email || !password || !rol) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.has(rol)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    if (currentRole === "ADMIN" && rol !== Role.VENTAS) {
      return NextResponse.json(
        { error: "Como ADMIN solo tenés permisos para crear usuarios de VENTAS." },
        { status: 403 }
      );
    }

    if (rol === Role.SUPERADMIN && currentRole !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "No tenés permisos para crear usuarios SUPERADMIN." },
        { status: 403 }
      );
    }

    const existe = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });
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

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentRole = session.user.role || session.user.rol;

    if (currentRole !== "ADMIN" && currentRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body.id || "").trim();
    const activo = body.activo;

    if (!id || typeof activo !== "boolean") {
      return NextResponse.json(
        { error: "ID y estado booleano son obligatorios" },
        { status: 400 }
      );
    }

    if (id === session.user.id && !activo) {
      return NextResponse.json(
        { error: "No podés desactivar tu propio usuario." },
        { status: 400 }
      );
    }

    const usuarioAEstado = await prisma.user.findUnique({ where: { id } });

    if (!usuarioAEstado) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (currentRole === "ADMIN" && usuarioAEstado.rol !== Role.VENTAS) {
      return NextResponse.json(
        { error: "No tenés permisos para modificar este usuario." },
        { status: 403 }
      );
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
