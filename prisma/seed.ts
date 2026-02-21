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

  // ── Plan de Cuentas FACPCE ──
  console.log("  📋 Creando plan de cuentas contables...");
  const cuentas: Array<{
    codigo: string;
    nombre: string;
    tipo: "ACTIVO" | "PASIVO" | "PATRIMONIO" | "INGRESO" | "EGRESO";
    nivel: number;
    padreCode?: string;
    aceptaMovimientos: boolean;
    descripcion?: string;
  }> = [
    // ═══ NIVEL 1 — RUBROS ═══
    { codigo: "1", nombre: "ACTIVO", tipo: "ACTIVO", nivel: 1, aceptaMovimientos: false },
    { codigo: "2", nombre: "PASIVO", tipo: "PASIVO", nivel: 1, aceptaMovimientos: false },
    { codigo: "3", nombre: "PATRIMONIO NETO", tipo: "PATRIMONIO", nivel: 1, aceptaMovimientos: false },
    { codigo: "4", nombre: "INGRESOS", tipo: "INGRESO", nivel: 1, aceptaMovimientos: false },
    { codigo: "5", nombre: "EGRESOS", tipo: "EGRESO", nivel: 1, aceptaMovimientos: false },

    // ═══ NIVEL 2 — SUBRUBROS ═══
    // Activo
    { codigo: "1.1", nombre: "Activo Corriente", tipo: "ACTIVO", nivel: 2, padreCode: "1", aceptaMovimientos: false },
    { codigo: "1.2", nombre: "Activo No Corriente", tipo: "ACTIVO", nivel: 2, padreCode: "1", aceptaMovimientos: false },
    // Pasivo
    { codigo: "2.1", nombre: "Pasivo Corriente", tipo: "PASIVO", nivel: 2, padreCode: "2", aceptaMovimientos: false },
    // Patrimonio
    { codigo: "3.1", nombre: "Capital", tipo: "PATRIMONIO", nivel: 2, padreCode: "3", aceptaMovimientos: false },
    { codigo: "3.2", nombre: "Resultados Acumulados", tipo: "PATRIMONIO", nivel: 2, padreCode: "3", aceptaMovimientos: false },
    { codigo: "3.3", nombre: "Resultado del Ejercicio", tipo: "PATRIMONIO", nivel: 2, padreCode: "3", aceptaMovimientos: false },
    // Ingresos
    { codigo: "4.1", nombre: "Ingresos Operativos", tipo: "INGRESO", nivel: 2, padreCode: "4", aceptaMovimientos: false },
    { codigo: "4.2", nombre: "Otros Ingresos", tipo: "INGRESO", nivel: 2, padreCode: "4", aceptaMovimientos: false },
    // Egresos
    { codigo: "5.1", nombre: "Costos Operativos", tipo: "EGRESO", nivel: 2, padreCode: "5", aceptaMovimientos: false },
    { codigo: "5.2", nombre: "Gastos de Administración", tipo: "EGRESO", nivel: 2, padreCode: "5", aceptaMovimientos: false },
    { codigo: "5.3", nombre: "Otros Egresos", tipo: "EGRESO", nivel: 2, padreCode: "5", aceptaMovimientos: false },

    // ═══ NIVEL 3 — CUENTAS ═══
    // Activo Corriente
    { codigo: "1.1.01", nombre: "Caja y Bancos", tipo: "ACTIVO", nivel: 3, padreCode: "1.1", aceptaMovimientos: false },
    { codigo: "1.1.02", nombre: "Créditos", tipo: "ACTIVO", nivel: 3, padreCode: "1.1", aceptaMovimientos: false },
    { codigo: "1.1.03", nombre: "Créditos Fiscales", tipo: "ACTIVO", nivel: 3, padreCode: "1.1", aceptaMovimientos: false },
    { codigo: "1.1.04", nombre: "Otros Créditos", tipo: "ACTIVO", nivel: 3, padreCode: "1.1", aceptaMovimientos: false },
    // Activo No Corriente
    { codigo: "1.2.01", nombre: "Bienes de Uso", tipo: "ACTIVO", nivel: 3, padreCode: "1.2", aceptaMovimientos: false },
    // Pasivo Corriente
    { codigo: "2.1.01", nombre: "Deudas Comerciales", tipo: "PASIVO", nivel: 3, padreCode: "2.1", aceptaMovimientos: false },
    { codigo: "2.1.02", nombre: "Deudas Fiscales", tipo: "PASIVO", nivel: 3, padreCode: "2.1", aceptaMovimientos: false },
    { codigo: "2.1.03", nombre: "Depósitos Recibidos", tipo: "PASIVO", nivel: 3, padreCode: "2.1", aceptaMovimientos: false },
    { codigo: "2.1.04", nombre: "Ingresos Diferidos", tipo: "PASIVO", nivel: 3, padreCode: "2.1", aceptaMovimientos: false },
    // Capital
    { codigo: "3.1.01", nombre: "Capital Social", tipo: "PATRIMONIO", nivel: 3, padreCode: "3.1", aceptaMovimientos: false },
    { codigo: "3.2.01", nombre: "Resultados No Asignados", tipo: "PATRIMONIO", nivel: 3, padreCode: "3.2", aceptaMovimientos: false },
    { codigo: "3.3.01", nombre: "Resultado del Ejercicio", tipo: "PATRIMONIO", nivel: 3, padreCode: "3.3", aceptaMovimientos: false },
    // Ingresos Operativos
    { codigo: "4.1.01", nombre: "Ingresos por Alquiler", tipo: "INGRESO", nivel: 3, padreCode: "4.1", aceptaMovimientos: false },
    { codigo: "4.1.02", nombre: "Ingresos por Venta de Motos", tipo: "INGRESO", nivel: 3, padreCode: "4.1", aceptaMovimientos: false },
    { codigo: "4.1.03", nombre: "Ingresos por Repuestos", tipo: "INGRESO", nivel: 3, padreCode: "4.1", aceptaMovimientos: false },
    { codigo: "4.2.01", nombre: "Otros Ingresos", tipo: "INGRESO", nivel: 3, padreCode: "4.2", aceptaMovimientos: false },
    // Costos Operativos
    { codigo: "5.1.01", nombre: "Depreciación", tipo: "EGRESO", nivel: 3, padreCode: "5.1", aceptaMovimientos: false },
    { codigo: "5.1.02", nombre: "Mantenimiento", tipo: "EGRESO", nivel: 3, padreCode: "5.1", aceptaMovimientos: false },
    { codigo: "5.1.03", nombre: "Seguros", tipo: "EGRESO", nivel: 3, padreCode: "5.1", aceptaMovimientos: false },
    // Gastos Administración
    { codigo: "5.2.01", nombre: "Gastos Administrativos", tipo: "EGRESO", nivel: 3, padreCode: "5.2", aceptaMovimientos: false },
    { codigo: "5.2.02", nombre: "Gastos Bancarios", tipo: "EGRESO", nivel: 3, padreCode: "5.2", aceptaMovimientos: false },
    { codigo: "5.2.03", nombre: "Impuestos y Tasas", tipo: "EGRESO", nivel: 3, padreCode: "5.2", aceptaMovimientos: false },
    // Otros Egresos
    { codigo: "5.3.01", nombre: "Otros Egresos", tipo: "EGRESO", nivel: 3, padreCode: "5.3", aceptaMovimientos: false },

    // ═══ NIVEL 4 — SUBCUENTAS (aceptan movimientos) ═══
    // Caja y Bancos
    { codigo: "1.1.01.001", nombre: "Caja en Pesos", tipo: "ACTIVO", nivel: 4, padreCode: "1.1.01", aceptaMovimientos: true },
    { codigo: "1.1.01.002", nombre: "MercadoPago", tipo: "ACTIVO", nivel: 4, padreCode: "1.1.01", aceptaMovimientos: true },
    { codigo: "1.1.01.003", nombre: "Banco BIND", tipo: "ACTIVO", nivel: 4, padreCode: "1.1.01", aceptaMovimientos: true },
    // Créditos
    { codigo: "1.1.02.001", nombre: "Deudores por Alquiler", tipo: "ACTIVO", nivel: 4, padreCode: "1.1.02", aceptaMovimientos: true },
    // Créditos Fiscales
    { codigo: "1.1.03.001", nombre: "IVA Crédito Fiscal", tipo: "ACTIVO", nivel: 4, padreCode: "1.1.03", aceptaMovimientos: true },
    // Otros Créditos
    { codigo: "1.1.04.001", nombre: "Depósitos Dados en Garantía", tipo: "ACTIVO", nivel: 4, padreCode: "1.1.04", aceptaMovimientos: true },
    // Bienes de Uso
    { codigo: "1.2.01.001", nombre: "Rodados — Motos", tipo: "ACTIVO", nivel: 4, padreCode: "1.2.01", aceptaMovimientos: true },
    { codigo: "1.2.01.002", nombre: "(-) Amortización Acumulada Motos", tipo: "ACTIVO", nivel: 4, padreCode: "1.2.01", aceptaMovimientos: true, descripcion: "Cuenta regularizadora — saldo acreedor" },
    // Pasivo
    { codigo: "2.1.01.001", nombre: "Proveedores", tipo: "PASIVO", nivel: 4, padreCode: "2.1.01", aceptaMovimientos: true },
    { codigo: "2.1.02.001", nombre: "IVA Débito Fiscal", tipo: "PASIVO", nivel: 4, padreCode: "2.1.02", aceptaMovimientos: true },
    { codigo: "2.1.03.001", nombre: "Depósitos de Clientes", tipo: "PASIVO", nivel: 4, padreCode: "2.1.03", aceptaMovimientos: true, descripcion: "Primer mes cobrado por adelantado" },
    { codigo: "2.1.04.001", nombre: "Ingresos Diferidos por Alquiler", tipo: "PASIVO", nivel: 4, padreCode: "2.1.04", aceptaMovimientos: true },
    // Patrimonio
    { codigo: "3.1.01.001", nombre: "Capital Social", tipo: "PATRIMONIO", nivel: 4, padreCode: "3.1.01", aceptaMovimientos: true },
    { codigo: "3.2.01.001", nombre: "Resultados No Asignados", tipo: "PATRIMONIO", nivel: 4, padreCode: "3.2.01", aceptaMovimientos: true },
    { codigo: "3.3.01.001", nombre: "Resultado del Ejercicio", tipo: "PATRIMONIO", nivel: 4, padreCode: "3.3.01", aceptaMovimientos: true },
    // Ingresos
    { codigo: "4.1.01.001", nombre: "Ingresos por Alquiler de Motos", tipo: "INGRESO", nivel: 4, padreCode: "4.1.01", aceptaMovimientos: true },
    { codigo: "4.1.02.001", nombre: "Ingresos por Venta de Motos", tipo: "INGRESO", nivel: 4, padreCode: "4.1.02", aceptaMovimientos: true },
    { codigo: "4.1.03.001", nombre: "Ingresos por Venta de Repuestos", tipo: "INGRESO", nivel: 4, padreCode: "4.1.03", aceptaMovimientos: true },
    { codigo: "4.2.01.001", nombre: "Otros Ingresos", tipo: "INGRESO", nivel: 4, padreCode: "4.2.01", aceptaMovimientos: true },
    // Egresos
    { codigo: "5.1.01.001", nombre: "Amortización de Motos", tipo: "EGRESO", nivel: 4, padreCode: "5.1.01", aceptaMovimientos: true },
    { codigo: "5.1.02.001", nombre: "Gastos de Mantenimiento", tipo: "EGRESO", nivel: 4, padreCode: "5.1.02", aceptaMovimientos: true },
    { codigo: "5.1.03.001", nombre: "Gastos de Seguros", tipo: "EGRESO", nivel: 4, padreCode: "5.1.03", aceptaMovimientos: true },
    { codigo: "5.2.01.001", nombre: "Gastos Administrativos Generales", tipo: "EGRESO", nivel: 4, padreCode: "5.2.01", aceptaMovimientos: true },
    { codigo: "5.2.02.001", nombre: "Comisiones MercadoPago", tipo: "EGRESO", nivel: 4, padreCode: "5.2.02", aceptaMovimientos: true },
    { codigo: "5.2.03.001", nombre: "Impuestos y Tasas", tipo: "EGRESO", nivel: 4, padreCode: "5.2.03", aceptaMovimientos: true },
    { codigo: "5.3.01.001", nombre: "Otros Egresos", tipo: "EGRESO", nivel: 4, padreCode: "5.3.01", aceptaMovimientos: true },
  ];

  // Primero crear sin padreId, luego actualizar relaciones
  for (const c of cuentas) {
    await prisma.cuentaContable.upsert({
      where: { codigo: c.codigo },
      update: { nombre: c.nombre },
      create: {
        codigo: c.codigo,
        nombre: c.nombre,
        tipo: c.tipo,
        nivel: c.nivel,
        aceptaMovimientos: c.aceptaMovimientos,
        descripcion: c.descripcion ?? null,
      },
    });
  }

  // Actualizar padreId basándose en padreCode
  for (const c of cuentas) {
    if (c.padreCode) {
      const padre = await prisma.cuentaContable.findUnique({
        where: { codigo: c.padreCode },
      });
      if (padre) {
        await prisma.cuentaContable.update({
          where: { codigo: c.codigo },
          data: { padreId: padre.id },
        });
      }
    }
  }
  console.log(`  ✅ ${cuentas.length} cuentas contables`);

  // ── Período actual ──
  const hoy = new Date();
  const mesesNombres = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  await prisma.periodoContable.upsert({
    where: { anio_mes: { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 } },
    update: {},
    create: {
      anio: hoy.getFullYear(),
      mes: hoy.getMonth() + 1,
      nombre: `${mesesNombres[hoy.getMonth() + 1]} ${hoy.getFullYear()}`,
    },
  });
  console.log("  ✅ Período contable actual");

  // ══════════════════════════════════════════════════════════════
  // PLANES DE MANTENIMIENTO
  // ══════════════════════════════════════════════════════════════
  console.log("📋 Creando planes de mantenimiento...");

  await prisma.planMantenimiento.upsert({
    where: { id: "plan-service-5000km" },
    update: {},
    create: {
      id: "plan-service-5000km",
      nombre: "Service 5000km Estándar",
      tipoService: "SERVICE_5000KM",
      descripcion: "Service preventivo cada 5000km para motos 125cc",
      kmIntervalo: 5000,
      tareas: {
        create: [
          { categoria: "LUBRICACION", descripcion: "Cambio de aceite motor", orden: 1 },
          { categoria: "MOTOR", descripcion: "Cambio filtro de aceite", orden: 2 },
          { categoria: "FRENOS", descripcion: "Revisión pastillas de freno", orden: 3 },
          { categoria: "TRANSMISION", descripcion: "Revisión y lubricación cadena", orden: 4 },
          { categoria: "NEUMATICOS", descripcion: "Control presión neumáticos", orden: 5 },
          { categoria: "ELECTRICA", descripcion: "Revisión luces y batería", orden: 6 },
          { categoria: "INSPECCION", descripcion: "Inspección visual general", orden: 7 },
        ],
      },
      repuestos: {
        create: [
          { nombre: "Aceite motor 10W-40 1L", cantidad: 1 },
          { nombre: "Filtro de aceite", cantidad: 1 },
        ],
      },
    },
  });

  await prisma.planMantenimiento.upsert({
    where: { id: "plan-service-10000km" },
    update: {},
    create: {
      id: "plan-service-10000km",
      nombre: "Service 10000km Completo",
      tipoService: "SERVICE_10000KM",
      descripcion: "Service completo cada 10000km — incluye filtro de aire y bujía",
      kmIntervalo: 10000,
      tareas: {
        create: [
          { categoria: "LUBRICACION", descripcion: "Cambio de aceite motor", orden: 1 },
          { categoria: "MOTOR", descripcion: "Cambio filtro de aceite", orden: 2 },
          { categoria: "MOTOR", descripcion: "Cambio filtro de aire", orden: 3 },
          { categoria: "MOTOR", descripcion: "Cambio bujía", orden: 4 },
          { categoria: "FRENOS", descripcion: "Revisión y ajuste frenos", orden: 5 },
          { categoria: "TRANSMISION", descripcion: "Revisión cadena y piñón", orden: 6 },
          { categoria: "SUSPENSION", descripcion: "Revisión suspensión delantera y trasera", orden: 7 },
          { categoria: "NEUMATICOS", descripcion: "Control desgaste y presión neumáticos", orden: 8 },
          { categoria: "ELECTRICA", descripcion: "Revisión completa sistema eléctrico", orden: 9 },
          { categoria: "INSPECCION", descripcion: "Inspección visual general", orden: 10 },
        ],
      },
      repuestos: {
        create: [
          { nombre: "Aceite motor 10W-40 1L", cantidad: 1 },
          { nombre: "Filtro de aceite", cantidad: 1 },
          { nombre: "Filtro de aire", cantidad: 1 },
          { nombre: "Bujía NGK", cantidad: 1 },
        ],
      },
    },
  });

  console.log("  ✅ Planes de mantenimiento (2)");

  // ══════════════════════════════════════════════════════════════
  // TALLERES Y MECÁNICOS
  // ══════════════════════════════════════════════════════════════
  console.log("🔧 Creando talleres y mecánicos...");

  await prisma.taller.upsert({
    where: { id: "taller-interno-central" },
    update: {},
    create: {
      id: "taller-interno-central",
      nombre: "Taller MotoLibre Central",
      tipo: "INTERNO",
      direccion: "Tucumán 141, CABA",
      especialidades: ["motor", "frenos", "electricidad", "general"],
      mecanicos: {
        create: [
          { nombre: "Carlos", apellido: "Gómez", especialidad: "Motor" },
          { nombre: "Diego", apellido: "Martínez", especialidad: "General" },
        ],
      },
    },
  });

  await prisma.taller.upsert({
    where: { id: "taller-externo-ruiz" },
    update: {},
    create: {
      id: "taller-externo-ruiz",
      nombre: "Taller Ruiz Motos",
      tipo: "EXTERNO",
      direccion: "Av. Juan B. Justo 3456, CABA",
      contacto: "Roberto Ruiz",
      telefono: "11-5555-1234",
      especialidades: ["suspensión", "carrocería"],
      mecanicos: {
        create: [
          { nombre: "Roberto", apellido: "Ruiz", especialidad: "Suspensión" },
        ],
      },
    },
  });

  console.log("  ✅ Talleres (2) + Mecánicos (3)");

  // ── Proveedores ──────────────────────────────────────────────
  await prisma.proveedor.upsert({
    where: { id: "prov-nacional-repuestos" },
    update: {},
    create: {
      id: "prov-nacional-repuestos",
      nombre: "Repuestos Moto Argentina SRL",
      cuit: "30-12345678-9",
      tipoProveedor: "NACIONAL",
      condicionIva: "Responsable Inscripto",
      categorias: ["repuestos", "aceites", "filtros"],
      direccion: "Av. Warnes 2345, CABA",
      telefono: "11-4555-6789",
      email: "ventas@repuestosmoto.com.ar",
      contacto: "María López",
    },
  });

  await prisma.proveedor.upsert({
    where: { id: "prov-internacional-china" },
    update: {},
    create: {
      id: "prov-internacional-china",
      nombre: "Guangzhou Motor Parts Co.",
      tipoProveedor: "INTERNACIONAL",
      pais: "China",
      categorias: ["repuestos", "motos"],
      email: "sales@gzmotorparts.com",
      contacto: "Mr. Zhang Wei",
    },
  });

  console.log("  ✅ Proveedores (2)");

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
