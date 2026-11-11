import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
});

async function runSeed() {
  console.log('🌱 Siembra iniciada...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const ventasPassword = await bcrypt.hash('ventas123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@elreencuentro.com' },
    update: {},
    create: {
      email: 'admin@elreencuentro.com',
      nombre: 'Administrador',
      password: adminPassword,
      rol: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'ventas@elreencuentro.com' },
    update: {},
    create: {
      email: 'ventas@elreencuentro.com',
      nombre: 'Vendedor',
      password: ventasPassword,
      rol: 'VENTAS',
    },
  });

  console.log('✅ Usuarios sincronizados.');
}

runSeed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error en el seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });