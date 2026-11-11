import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// URL del Session Pooler IPv4 con el parámetro de tenant obligatorio
const poolerUrl =
  'postgresql://postgres.yqorvekmesnkzxrgzzue:eleybeni1978@aws-0-us-east-1.pooler.supabase.com:5432/postgres?options=reference_id%3Dyqorvekmesnkzxrgzzue';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: poolerUrl,
    },
  },
});

async function runSeed() {
  console.log('🌱 Iniciando la siembra de la base de datos...');

  const ventasPassword = await bcrypt.hash('ventas123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  // 1. Crear o actualizar usuario SUPERADMIN
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@elreencuentro.com' },
    update: {},
    create: {
      email: 'admin@elreencuentro.com',
      nombre: 'Administrador',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // 2. Crear o actualizar usuario VENTAS
  const ventasUser = await prisma.user.upsert({
    where: { email: 'ventas@elreencuentro.com' },
    update: {},
    create: {
      email: 'ventas@elreencuentro.com',
      nombre: 'Vendedor',
      password: ventasPassword,
      role: 'USER',
    },
  });

  console.log('✅ Usuarios creados/actualizados exitosamente.');
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