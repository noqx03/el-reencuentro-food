import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1. Encriptar contraseñas
  const superAdminPassword = await bcrypt.hash("superadmin123", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);
  const ventasPassword = await bcrypt.hash("ventas123", 10);

  // 2. Crear o actualizar usuario SUPERADMIN
  const superAdmin = await prisma.user.upsert({
    where: { email: "mario@elreencuentro.com" },
    update: {
      password: superAdminPassword,
      activo: true,
    },
    create: {
      email: "mario@elreencuentro.com",
      nombre: "Mario Gasparetti",
      password: superAdminPassword,
      rol: Role.SUPERADMIN,
      activo: true,
    },
  });

  // 3. Crear o actualizar usuario ADMIN
  const admin = await prisma.user.upsert({
    where: { email: "admin@elreencuentro.com" },
    update: {
      password: adminPassword,
      activo: true,
    },
    create: {
      email: "admin@elreencuentro.com",
      nombre: "Administrador",
      password: adminPassword,
      rol: Role.ADMIN,
      activo: true,
    },
  });

  // 4. Crear o actualizar usuario VENTAS
  const ventas = await prisma.user.upsert({
    where: { email: "ventas@elreencuentro.com" },
    update: {
      password: ventasPassword,
      activo: true,
    },
    create: {
      email: "ventas@elreencuentro.com",
      nombre: "Vendedor de Prueba",
      password: ventasPassword,
      rol: Role.VENTAS,
      activo: true,
    },
  });

  console.log("✅ Usuarios creados/actualizados exitosamente:");
  console.log({
    superAdmin: superAdmin.email,
    admin: admin.email,
    ventas: ventas.email,
  });

  // 5. Cargar Productos y Categorías
  const productos = [
    { nombre: "Milanesa con papas", precio: 5200, stockActual: 15, categoriaNombre: "Minutas" },
    { nombre: "Empanada de carne", precio: 1200, stockActual: 40, categoriaNombre: "Minutas" },
    { nombre: "Gaseosa 500ml", precio: 1500, stockActual: 25, categoriaNombre: "Bebidas" },
    { nombre: "Flan con dulce", precio: 1800, stockActual: 8, categoriaNombre: "Postres" },
    { nombre: "Hamburguesa Completa", precio: 4800, stockActual: 10, categoriaNombre: "Minutas" },
    { nombre: "Agua Mineral 500ml", precio: 1000, stockActual: 30, categoriaNombre: "Bebidas" },
  ];

  for (const prod of productos) {
    const existe = await prisma.product.findFirst({
      where: { nombre: prod.nombre },
    });

    if (!existe) {
      await prisma.product.create({
        data: {
          nombre: prod.nombre,
          precio: prod.precio,
          stockActual: prod.stockActual,
          activo: true,
          category: {
            connectOrCreate: {
              where: { nombre: prod.categoriaNombre },
              create: { nombre: prod.categoriaNombre },
            },
          },
        },
      });
    } else {
      await prisma.product.update({
        where: { id: existe.id },
        data: {
          precio: prod.precio,
          stockActual: prod.stockActual,
          activo: true,
          category: {
            connectOrCreate: {
              where: { nombre: prod.categoriaNombre },
              create: { nombre: prod.categoriaNombre },
            },
          },
        },
      });
    }
  }

  console.log("✅ Productos y categorías cargados en la base de datos.");
}

// Ejecución de la función principal
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error al sembrar usuarios y productos:", e);
    await prisma.$disconnect();
    process.exit(1);
  });