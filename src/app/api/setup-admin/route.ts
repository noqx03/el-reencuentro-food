import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const existingAdminCount = await prisma.user.count({
      where: {
        rol: { in: [Role.ADMIN, Role.SUPERADMIN] },
      },
    });

    if (existingAdminCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "El sistema ya cuenta con un administrador inicializado.",
        },
        { status: 403 }
      );
    }

    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || "admin123";
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    const admin = await prisma.user.create({
      data: {
        email: "admin@elreencuentro.com",
        password: hashedPassword,
        rol: Role.ADMIN,
        nombre: "Administrador",
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Usuario admin inicial creado correctamente",
        admin: admin.email,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en setup-admin:", error);
    return NextResponse.json(
      { success: false, error: "Error al inicializar administrador" },
      { status: 500 }
    );
  }
}
