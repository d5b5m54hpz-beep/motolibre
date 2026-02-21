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

  // Motos de prueba
  const motosDemo = [
    {
      marca: "Honda",
      modelo: "CB 125F",
      anio: 2024,
      patente: "AB123CD",
      color: "Negro",
      cilindrada: 125,
      tipo: "NAKED" as const,
      estado: "DISPONIBLE" as const,
      km: 1500,
      precioCompra: 1800000,
      precioAlquilerMensual: 85000,
      fechaCompra: new Date("2024-06-15"),
      ubicacion: "Depósito Central",
      estadoPatentamiento: "COMPLETADO" as const,
      estadoSeguro: "ACTIVO" as const,
      vidaUtilMeses: 60,
      valorResidual: 0,
      fechaAltaContable: new Date("2024-06-15"),
      creadoPor: admin.id,
    },
    {
      marca: "Yamaha",
      modelo: "YBR 125",
      anio: 2024,
      patente: "AC456EF",
      color: "Azul",
      cilindrada: 125,
      tipo: "NAKED" as const,
      estado: "ALQUILADA" as const,
      km: 8200,
      precioCompra: 1950000,
      precioAlquilerMensual: 90000,
      fechaCompra: new Date("2024-05-20"),
      ubicacion: "En uso",
      estadoPatentamiento: "COMPLETADO" as const,
      estadoSeguro: "ACTIVO" as const,
      vidaUtilMeses: 60,
      valorResidual: 0,
      fechaAltaContable: new Date("2024-05-20"),
      creadoPor: admin.id,
    },
    {
      marca: "Bajaj",
      modelo: "Boxer 150",
      anio: 2023,
      patente: "AD789GH",
      color: "Rojo",
      cilindrada: 150,
      tipo: "NAKED" as const,
      estado: "EN_SERVICE" as const,
      km: 15400,
      precioCompra: 1500000,
      precioAlquilerMensual: 75000,
      fechaCompra: new Date("2023-11-10"),
      ubicacion: "Taller Norte",
      estadoPatentamiento: "COMPLETADO" as const,
      estadoSeguro: "ACTIVO" as const,
      vidaUtilMeses: 60,
      valorResidual: 0,
      fechaAltaContable: new Date("2023-11-10"),
      creadoPor: admin.id,
    },
    {
      marca: "Honda",
      modelo: "Wave 110",
      anio: 2024,
      patente: null,
      color: "Blanco",
      cilindrada: 110,
      tipo: "SCOOTER" as const,
      estado: "EN_PATENTAMIENTO" as const,
      km: 0,
      precioCompra: 1200000,
      precioAlquilerMensual: 65000,
      fechaCompra: new Date("2024-12-01"),
      ubicacion: "Depósito Central",
      estadoPatentamiento: "EN_TRAMITE" as const,
      estadoSeguro: "SIN_SEGURO" as const,
      vidaUtilMeses: 60,
      valorResidual: 0,
      fechaAltaContable: new Date("2024-12-01"),
      creadoPor: admin.id,
    },
    {
      marca: "Yamaha",
      modelo: "FZ 25",
      anio: 2023,
      patente: "AE012IJ",
      color: "Negro Mate",
      cilindrada: 250,
      tipo: "NAKED" as const,
      estado: "DISPONIBLE" as const,
      km: 3200,
      precioCompra: 3500000,
      precioAlquilerMensual: 120000,
      fechaCompra: new Date("2023-08-05"),
      ubicacion: "Depósito Central",
      estadoPatentamiento: "COMPLETADO" as const,
      estadoSeguro: "ACTIVO" as const,
      vidaUtilMeses: 60,
      valorResidual: 0,
      fechaAltaContable: new Date("2023-08-05"),
      creadoPor: admin.id,
    },
  ];

  await prisma.moto.createMany({
    data: motosDemo,
    skipDuplicates: true,
  });
  console.log(`  ✅ ${motosDemo.length} motos de prueba`);

  // Clientes demo
  await prisma.cliente.upsert({
    where: { dni: "33456789" },
    update: {},
    create: {
      nombre: "Carlos",
      apellido: "Rodríguez",
      email: "carlos.rodriguez@demo.com",
      telefono: "1155667788",
      dni: "33456789",
      estado: "APROBADO",
      fechaAprobacion: new Date(),
      aprobadoPor: admin.id,
      condicionIva: "MONOTRIBUTISTA",
      plataformas: "Rappi, PedidosYa",
      experienciaMeses: 24,
      tipoLicencia: "A1",
      creadoPor: admin.id,
    },
  });
  await prisma.cliente.upsert({
    where: { dni: "35789012" },
    update: {},
    create: {
      nombre: "María",
      apellido: "González",
      email: "maria.gonzalez@demo.com",
      telefono: "1144556677",
      dni: "35789012",
      estado: "APROBADO",
      fechaAprobacion: new Date(),
      aprobadoPor: admin.id,
      condicionIva: "CONSUMIDOR_FINAL",
      plataformas: "Rappi",
      experienciaMeses: 6,
      tipoLicencia: "A1",
      creadoPor: admin.id,
    },
  });
  console.log("  ✅ 2 clientes demo");

  // Tarifas demo
  const clienteDemo1 = await prisma.cliente.findUnique({ where: { dni: "33456789" } });
  const tarifasDemo = [
    // Honda CB 125F — Nueva
    { marca: "Honda", modelo: "CB 125F", condicion: "NUEVA" as const, plan: "MESES_3" as const, frecuencia: "SEMANAL" as const, precio: 25000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "NUEVA" as const, plan: "MESES_6" as const, frecuencia: "SEMANAL" as const, precio: 23000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "NUEVA" as const, plan: "MESES_6" as const, frecuencia: "MENSUAL" as const, precio: 90000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "NUEVA" as const, plan: "MESES_12" as const, frecuencia: "SEMANAL" as const, precio: 21000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "NUEVA" as const, plan: "MESES_12" as const, frecuencia: "MENSUAL" as const, precio: 82000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "NUEVA" as const, plan: "MESES_24" as const, frecuencia: "SEMANAL" as const, precio: 19000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "NUEVA" as const, plan: "MESES_24" as const, frecuencia: "MENSUAL" as const, precio: 75000 },
    // Honda CB 125F — Usada
    { marca: "Honda", modelo: "CB 125F", condicion: "USADA" as const, plan: "MESES_3" as const, frecuencia: "SEMANAL" as const, precio: 20000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "USADA" as const, plan: "MESES_6" as const, frecuencia: "SEMANAL" as const, precio: 18000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "USADA" as const, plan: "MESES_6" as const, frecuencia: "MENSUAL" as const, precio: 70000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "USADA" as const, plan: "MESES_12" as const, frecuencia: "SEMANAL" as const, precio: 16000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "USADA" as const, plan: "MESES_12" as const, frecuencia: "MENSUAL" as const, precio: 62000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "USADA" as const, plan: "MESES_24" as const, frecuencia: "SEMANAL" as const, precio: 14000 },
    { marca: "Honda", modelo: "CB 125F", condicion: "USADA" as const, plan: "MESES_24" as const, frecuencia: "MENSUAL" as const, precio: 55000 },
    // Yamaha YBR 125 — Nueva
    { marca: "Yamaha", modelo: "YBR 125", condicion: "NUEVA" as const, plan: "MESES_6" as const, frecuencia: "SEMANAL" as const, precio: 24000 },
    { marca: "Yamaha", modelo: "YBR 125", condicion: "NUEVA" as const, plan: "MESES_6" as const, frecuencia: "MENSUAL" as const, precio: 93000 },
    { marca: "Yamaha", modelo: "YBR 125", condicion: "NUEVA" as const, plan: "MESES_12" as const, frecuencia: "SEMANAL" as const, precio: 22000 },
    { marca: "Yamaha", modelo: "YBR 125", condicion: "NUEVA" as const, plan: "MESES_12" as const, frecuencia: "MENSUAL" as const, precio: 85000 },
    { marca: "Yamaha", modelo: "YBR 125", condicion: "NUEVA" as const, plan: "MESES_24" as const, frecuencia: "SEMANAL" as const, precio: 20000 },
    { marca: "Yamaha", modelo: "YBR 125", condicion: "NUEVA" as const, plan: "MESES_24" as const, frecuencia: "MENSUAL" as const, precio: 78000 },
  ];
  await prisma.tarifaAlquiler.createMany({
    data: tarifasDemo.map((t) => ({ ...t, creadoPor: admin.id })),
    skipDuplicates: true,
  });
  console.log(`  ✅ ${tarifasDemo.length} tarifas demo`);

  // Solicitud demo
  if (clienteDemo1) {
    await prisma.solicitud.upsert({
      where: { id: "demo-solicitud-1" },
      update: {},
      create: {
        id: "demo-solicitud-1",
        clienteId: clienteDemo1.id,
        marcaDeseada: "Honda",
        modeloDeseado: "CB 125F",
        condicionDeseada: "NUEVA",
        plan: "MESES_12",
        precioSemanal: 21000,
        precioMensual: 82000,
        montoPrimerMes: 82000,
        estado: "EN_ESPERA",
        mpPaymentId: "demo-mp-123",
        fechaPago: new Date(),
        evaluadoPor: admin.id,
        fechaEvaluacion: new Date(),
        prioridadEspera: 1,
      },
    });
    console.log("  ✅ 1 solicitud demo (en espera)");
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
