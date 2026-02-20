import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminPassword = await bcrypt.hash("admin123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "dantebustos@gmail.com" },
    update: {},
    create: {
      email: "dantebustos@gmail.com",
      name: "Dante Bustos",
      password: adminPassword,
      role: "ADMIN",
      provider: "credentials",
    },
  });
  console.log(`  ✅ Admin: ${admin.email} (${admin.role})`);

  // Configuración empresa
  const config = await prisma.configuracionEmpresa.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      razonSocial: "MotoLibre S.A.",
      cuit: "30-71617222-4",
      direccion: "Tucumán 141, Piso 4, Of. I, CABA, CP 1049",
      condicionIva: "RESPONSABLE_INSCRIPTO",
      inicioActividades: new Date("2018-09-14"),
    },
  });
  console.log(`  ✅ Empresa: ${config.razonSocial}`);

  console.log("✅ Seed completado");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
