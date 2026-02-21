import { prisma } from "@/lib/prisma";
import type { TipoAsiento } from "@prisma/client";

/**
 * Busca una cuenta contable por código.
 * Lanza error si no existe (para los handlers automáticos).
 */
export async function getCuentaPorCodigo(codigo: string) {
  const cuenta = await prisma.cuentaContable.findUnique({
    where: { codigo },
  });
  if (!cuenta) {
    throw new Error(`Cuenta contable ${codigo} no encontrada. ¿Falta en el plan de cuentas?`);
  }
  if (!cuenta.aceptaMovimientos) {
    throw new Error(`Cuenta ${codigo} (${cuenta.nombre}) no acepta movimientos — es cuenta resumen`);
  }
  return cuenta;
}

/**
 * Obtiene o crea el período contable para una fecha.
 */
export async function obtenerPeriodo(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth() + 1;

  const meses = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const periodo = await prisma.periodoContable.upsert({
    where: { anio_mes: { anio, mes } },
    update: {},
    create: {
      anio,
      mes,
      nombre: `${meses[mes]} ${anio}`,
    },
  });

  if (periodo.cerrado) {
    throw new Error(`El período ${periodo.nombre} está cerrado. No se pueden crear asientos.`);
  }

  return periodo;
}

/**
 * Crea un asiento contable con sus líneas.
 * Valida que Debe = Haber.
 * Retorna el asiento creado.
 */
export async function crearAsiento(params: {
  fecha: Date;
  tipo: TipoAsiento;
  descripcion: string;
  lineas: Array<{
    cuentaId: string;
    debe: number;
    haber: number;
    descripcion?: string;
  }>;
  origenTipo?: string;
  origenId?: string;
  eventoId?: string;
  userId?: string;
}) {
  const { fecha, tipo, descripcion, lineas, origenTipo, origenId, eventoId, userId } = params;

  // Validar balance
  const totalDebe = lineas.reduce((sum, l) => sum + l.debe, 0);
  const totalHaber = lineas.reduce((sum, l) => sum + l.haber, 0);
  if (Math.abs(totalDebe - totalHaber) >= 0.01) {
    throw new Error(
      `Asiento no balancea: Debe=${totalDebe.toFixed(2)}, Haber=${totalHaber.toFixed(2)}`
    );
  }

  // Validar mínimo 2 líneas
  if (lineas.length < 2) {
    throw new Error("Un asiento debe tener al menos 2 líneas");
  }

  // Obtener período
  const periodo = await obtenerPeriodo(fecha);

  // Crear asiento + líneas en transacción
  const asiento = await prisma.asientoContable.create({
    data: {
      fecha,
      tipo,
      descripcion,
      totalDebe,
      totalHaber,
      origenTipo,
      origenId,
      eventoId,
      periodoId: periodo.id,
      creadoPor: userId,
      lineas: {
        create: lineas.map((l) => ({
          cuentaId: l.cuentaId,
          debe: l.debe,
          haber: l.haber,
          descripcion: l.descripcion,
        })),
      },
    },
    include: {
      lineas: {
        include: { cuenta: { select: { codigo: true, nombre: true } } },
      },
    },
  });

  return asiento;
}

/**
 * Calcula el saldo de una cuenta.
 * ACTIVO/EGRESO: saldo = total DEBE - total HABER (saldo deudor)
 * PASIVO/PATRIMONIO/INGRESO: saldo = total HABER - total DEBE (saldo acreedor)
 */
export async function calcularSaldoCuenta(
  cuentaId: string,
  hastaFecha?: Date
): Promise<number> {
  const cuenta = await prisma.cuentaContable.findUnique({
    where: { id: cuentaId },
  });
  if (!cuenta) throw new Error(`Cuenta ${cuentaId} no encontrada`);

  const where: Record<string, unknown> = { cuentaId };
  if (hastaFecha) {
    where.asiento = { fecha: { lte: hastaFecha } };
  }

  const totales = await prisma.lineaAsiento.aggregate({
    where,
    _sum: { debe: true, haber: true },
  });

  const totalDebe = Number(totales._sum.debe ?? 0);
  const totalHaber = Number(totales._sum.haber ?? 0);

  // Cuentas deudoras vs acreedoras
  if (cuenta.tipo === "ACTIVO" || cuenta.tipo === "EGRESO") {
    return totalDebe - totalHaber;
  } else {
    return totalHaber - totalDebe;
  }
}

/**
 * Códigos de cuentas MotoLibre.
 * Centralizados para que los handlers los referencien fácilmente.
 */
export const CUENTAS = {
  // ── ACTIVO ──
  CAJA: "1.1.01.001",
  BANCO_MP: "1.1.01.002",         // MercadoPago
  BANCO_BIND: "1.1.01.003",       // BIND
  CUENTAS_COBRAR: "1.1.02.001",   // Deudores por alquiler
  IVA_CF: "1.1.03.001",           // IVA Crédito Fiscal
  DEPOSITOS_GARANTIA_ACTIVO: "1.1.04.001", // Depósitos dados en garantía
  MERC_EN_TRANSITO: "1.1.05.001", // Mercadería en Tránsito — Importación
  INVENTARIO_REPUESTOS: "1.1.06.001", // Inventario de Repuestos
  MOTOS: "1.2.01.001",            // Bienes de Uso — Motos
  AMORT_ACUM_MOTOS: "1.2.01.002", // (-) Amortización Acumulada Motos

  // ── PASIVO ──
  PROVEEDORES: "2.1.01.001",      // Proveedores
  PROVEEDORES_EXTERIOR: "2.1.01.002", // Proveedores del Exterior
  IVA_DF: "2.1.02.001",           // IVA Débito Fiscal
  DEPOSITOS_RECIBIDOS: "2.1.03.001", // Depósitos de clientes (primer mes)
  INGRESOS_DIFERIDOS: "2.1.04.001",  // Ingresos cobrados por adelantado

  // ── PATRIMONIO ──
  CAPITAL: "3.1.01.001",
  RESULTADOS_ACUMULADOS: "3.2.01.001",
  RESULTADO_EJERCICIO: "3.3.01.001",

  // ── INGRESOS ──
  INGRESOS_ALQUILER: "4.1.01.001",     // Ingresos por alquiler de motos
  INGRESOS_VENTA_MOTOS: "4.1.02.001",  // Venta de motos (lease-to-own)
  INGRESOS_REPUESTOS: "4.1.03.001",    // Venta de repuestos
  OTROS_INGRESOS: "4.2.01.001",

  // ── EGRESOS ──
  COSTO_DEPRECIACION: "5.1.01.001",    // Amortización motos
  GASTOS_MANTENIMIENTO: "5.1.02.001",  // Service/reparaciones
  GASTOS_SEGUROS: "5.1.03.001",
  GASTOS_ADMINISTRATIVOS: "5.2.01.001",
  GASTOS_BANCARIOS: "5.2.02.001",      // Comisiones MP, bancarias
  GASTOS_IMPUESTOS: "5.2.03.001",
  OTROS_EGRESOS: "5.3.01.001",
} as const;
