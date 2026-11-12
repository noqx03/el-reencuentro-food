import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const admin = await prisma.user.upsert({
      where: { email: "admin@elreencuentro.com" },
      update: { 
        password: hashedPassword,
        nombre: "Administrador"
      },
      create: {
        email: "admin@elreencuentro.com",
        password: hashedPassword,
        rol: "admin",
        nombre: "Administrador",
      },
    });

    return NextResponse.json({ success: true, message: "Usuario admin creado correctamente", admin: admin.email });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}