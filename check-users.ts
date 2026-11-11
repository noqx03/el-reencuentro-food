const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Buscando usuarios en la base de datos...");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      rol: true,
      password: true,
    },
  });
  console.log("Usuarios encontrados:", users);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });