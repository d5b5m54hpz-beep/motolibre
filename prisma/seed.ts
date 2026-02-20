import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Perfiles de permisos base del sistema.
 * Cada perfil tiene un conjunto de grants sobre operationIds.
 */
const PROFILES: Array<{
  name: string;
  description: string;
  grants: Array<{
    operationId: string;
    canView: boolean;
    canCreate: boolean;
    canExecute: boolean;
    canApprove: boolean;
  }>;
}> = [
  {
    name: "Administrador",
    description: "Acceso total al sistema",
    grants: [
      {
        operationId: "*",
        canView: true,
        canCreate: true,
        canExecute: true,
        canApprove: true,
      },
    ],
  },
  {
    name: "Operador Flota",
    description: "Gestión de motos, contratos y clientes",
    grants: [
      {
        operationId: "fleet.*",
        canView: true,
        canCreate: true,
        canExecute: true,
        canApprove: false,
      },
      {
        operationId: "commercial.*",
        canView: true,
        canCreate: true,
        canExecute: true,
        canApprove: false,
      },
      {
        operationId: "pricing.*",
        canView: true,
        canCreate: false,
        canExecute: false,
        canApprove: false,
      },
    ],
  },
  {
    name: "Contador",
    description: "Facturación, contabilidad y reportes financieros",
    grants: [
      {
        operationId: "invoicing.*",
        canView: true,
        canCreate: true,
        canExecute: true,
        canApprove: true,
      },
      {
        operationId: "accounting.*",
        canView: true,
        canCreate: true,
        canExecute: true,
        canApprove: true,
      },
      {
        operationId: "finance.*",
        canView: true,
        canCreate: false,
        canExecute: false,
        canApprove: true,
      },
      {
        operationId: "fleet.*",
        canView: true,
        canCreate: false,
        canExecute: false,
        canApprove: false,
      },
    ],
  },
  {
    name: "RRHH Manager",
    description: "Gestión de recursos humanos y liquidaciones",
    grants: [
      {
        operationId: "hr.*",
        canView: true,
        canCreate: true,
        canExecute: true,
        canApprove: true,
      },
      {
        operationId: "finance.payroll.*",
        canView: true,
        canCreate: true,
        canExecute: true,
        canApprove: false,
      },
    ],
  },
  {
    name: "Comercial",
    description: "Gestión de contratos, precios y clientes",
    grants: [
      {
        operationId: "commercial.*",
        canView: true,
        canCreate: true,
        canExecute: true,
        canApprove: false,
      },
      {
        operationId: "pricing.*",
        canView: true,
        canCreate: true,
        canExecute: true,
        canApprove: false,
      },
      {
        operationId: "fleet.*",
        canView: true,
        canCreate: false,
        canExecute: false,
        canApprove: false,
      },
    ],
  },
  {
    name: "Mecánico",
    description: "Mantenimiento de flota y gestión de insumos",
    grants: [
      {
        operationId: "maintenance.*",
        canView: true,
        canCreate: true,
        canExecute: true,
        canApprove: false,
      },
      {
        operationId: "supply.*",
        canView: true,
        canCreate: true,
        canExecute: false,
        canApprove: false,
      },
      {
        operationId: "fleet.moto.view",
        canView: true,
        canCreate: false,
        canExecute: false,
        canApprove: false,
      },
    ],
  },
  {
    name: "Cliente",
    description: "Portal de cliente — ver contratos y facturas propias",
    grants: [
      {
        operationId: "commercial.contract.view",
        canView: true,
        canCreate: false,
        canExecute: false,
        canApprove: false,
      },
      {
        operationId: "invoicing.invoice.view",
        canView: true,
        canCreate: false,
        canExecute: false,
        canApprove: false,
      },
    ],
  },
  {
    name: "Auditor",
    description: "Solo lectura en todos los módulos + acceso a anomalías",
    grants: [
      {
        operationId: "*",
        canView: true,
        canCreate: false,
        canExecute: false,
        canApprove: false,
      },
      {
        operationId: "anomaly.*",
        canView: true,
        canCreate: false,
        canExecute: true,
        canApprove: false,
      },
    ],
  },
];

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

  // Perfiles de permisos
  console.log("  📋 Creando perfiles de permisos...");
  for (const profileData of PROFILES) {
    const profile = await prisma.permissionProfile.upsert({
      where: { name: profileData.name },
      update: { description: profileData.description },
      create: {
        name: profileData.name,
        description: profileData.description,
      },
    });

    // Recrear grants (delete + create para mantener idempotencia)
    await prisma.permissionGrant.deleteMany({
      where: { profileId: profile.id },
    });
    await prisma.permissionGrant.createMany({
      data: profileData.grants.map((g) => ({
        profileId: profile.id,
        operationId: g.operationId,
        canView: g.canView,
        canCreate: g.canCreate,
        canExecute: g.canExecute,
        canApprove: g.canApprove,
      })),
    });

    console.log(
      `    ✅ ${profile.name} (${profileData.grants.length} grant(s))`
    );
  }

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
