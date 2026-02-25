import { prisma } from "@/lib/prisma";

// ──────────────────────────────────────────────────────────
// TIPOS
// ──────────────────────────────────────────────────────────

export interface TarifaResult {
  tarifaHora: number | null;
  fuente: string | null;
  tipo: "INTERNO" | "EXTERNO" | "CONFIG" | null;
}

export interface CostoMantenimientoMensual {
  marcaMoto: string;
  modeloMoto: string;
  costoMensualEstimado: number;
  planesCount: number;
  desglose: {
    planId: string;
    planNombre: string;
    kmIntervalo: number | null;
    costoRepuestos: number;
    costoManoObra: number;
    costoTotal: number;
    frecuenciaMensual: number; // veces por mes (ej: 0.33 = cada 3 meses)
  }[];
}

const AVG_KM_MES = 1500; // km promedio mensual

// ──────────────────────────────────────────────────────────
// calcularCostoHoraMecanico
// ──────────────────────────────────────────────────────────

/**
 * Calcula la tarifa horaria de un mecánico.
 *
 * - Si es EXTERNO → usa mecanico.tarifaHora o taller.tarifaHora
 * - Si es INTERNO (tiene empleadoId) → calcula desde sueldo + cargas
 * - Fallback → config empresa
 */
export async function calcularCostoHoraMecanico(
  mecanicoId?: string | null
): Promise<TarifaResult> {
  // ── Mecánico específico ──
  if (mecanicoId) {
    const mecanico = await prisma.mecanico.findUnique({
      where: { id: mecanicoId },
      include: {
        taller: { select: { tipo: true, tarifaHora: true, nombre: true } },
        empleado: { select: { sueldoBasico: true } },
      },
    });

    if (!mecanico) {
      return { tarifaHora: null, fuente: "Mecánico no encontrado", tipo: null };
    }

    // Externo: usa tarifaHora del mecánico o del taller
    if (mecanico.taller.tipo === "EXTERNO") {
      const tarifa = mecanico.tarifaHora ?? mecanico.taller.tarifaHora;
      return {
        tarifaHora: tarifa ?? null,
        fuente: mecanico.tarifaHora
          ? `Mecánico: ${mecanico.nombre} ${mecanico.apellido}`
          : `Taller: ${mecanico.taller.nombre}`,
        tipo: "EXTERNO",
      };
    }

    // Interno: calcular desde sueldo del empleado vinculado
    if (mecanico.empleado) {
      const config = await prisma.configuracionEmpresa.findFirst({
        select: { cargasSocialesPct: true, horasLaborablesMes: true },
      });
      const cargas = config?.cargasSocialesPct ?? 0.43;
      const horas = config?.horasLaborablesMes ?? 176;
      const sueldo = Number(mecanico.empleado.sueldoBasico);
      const tarifaHora = Math.round((sueldo * (1 + cargas)) / horas);
      return {
        tarifaHora,
        fuente: `Calculado desde sueldo de ${mecanico.nombre} ${mecanico.apellido}`,
        tipo: "INTERNO",
      };
    }

    // Interno sin empleado vinculado: usa tarifaHora si existe
    if (mecanico.tarifaHora) {
      return {
        tarifaHora: mecanico.tarifaHora,
        fuente: `Mecánico: ${mecanico.nombre} ${mecanico.apellido}`,
        tipo: "INTERNO",
      };
    }
  }

  // ── Fallback: config empresa ──
  return await obtenerTarifaFallback();
}

/**
 * Fallback chain: taller interno → costoHoraMecanico → sueldo bruto
 */
async function obtenerTarifaFallback(): Promise<TarifaResult> {
  // 1. Taller interno con tarifa
  const tallerInterno = await prisma.taller.findFirst({
    where: { tipo: "INTERNO", activo: true, tarifaHora: { not: null } },
    select: { tarifaHora: true, nombre: true },
    orderBy: { createdAt: "asc" },
  });

  if (tallerInterno?.tarifaHora) {
    return {
      tarifaHora: tallerInterno.tarifaHora,
      fuente: `Taller: ${tallerInterno.nombre}`,
      tipo: "INTERNO",
    };
  }

  // 2. Config empresa directa
  const config = await prisma.configuracionEmpresa.findFirst({
    select: {
      costoHoraMecanico: true,
      sueldoBrutoMecanico: true,
      cargasSocialesPct: true,
      horasLaborablesMes: true,
    },
  });

  if (config?.costoHoraMecanico) {
    return {
      tarifaHora: config.costoHoraMecanico,
      fuente: "Configuración empresa",
      tipo: "CONFIG",
    };
  }

  // 3. Calculado desde sueldo bruto
  if (config?.sueldoBrutoMecanico) {
    const cargas = config.cargasSocialesPct ?? 0.43;
    const horas = config.horasLaborablesMes ?? 176;
    const costo = (config.sueldoBrutoMecanico * (1 + cargas)) / horas;
    return {
      tarifaHora: Math.round(costo),
      fuente: "Calculado desde sueldo bruto",
      tipo: "CONFIG",
    };
  }

  return { tarifaHora: null, fuente: null, tipo: null };
}

// ──────────────────────────────────────────────────────────
// calcularCostoMantenimientoMensual
// ──────────────────────────────────────────────────────────

/**
 * Estima el costo mensual de mantenimiento para un modelo.
 * Suma el costo prorrateado de cada plan vigente (publicado) para esa marca/modelo.
 */
export async function calcularCostoMantenimientoMensual(
  marca: string,
  modelo: string
): Promise<CostoMantenimientoMensual> {
  const planes = await prisma.planMantenimiento.findMany({
    where: {
      marcaMoto: marca,
      modeloMoto: modelo,
      estado: "PUBLICADO",
    },
    include: {
      tareas: true,
      repuestos: true,
    },
    orderBy: { kmIntervalo: "asc" },
  });

  // Obtener tarifa de mano de obra (fallback)
  const { tarifaHora } = await obtenerTarifaFallback();
  const tarifaMin = tarifaHora ? tarifaHora / 60 : 0;

  const desglose = planes.map((plan) => {
    const tiempoTotal = plan.tareas.reduce((sum, t) => {
      const tarea = t as typeof t & { tiempoEstimado?: number | null };
      return sum + (tarea.tiempoEstimado ?? 0);
    }, 0);

    const costoRepuestos = plan.repuestos.reduce((sum, r) => {
      const rep = r as typeof r & { precioUnitario?: number | null };
      return sum + (Number(rep.precioUnitario) || 0) * r.cantidad;
    }, 0);

    const costoManoObra = tiempoTotal * tarifaMin;
    const costoTotal = costoRepuestos + costoManoObra;

    // Frecuencia mensual: si es cada 5000km y se recorren 1500km/mes → 0.3 veces/mes
    const frecuenciaMensual = plan.kmIntervalo
      ? AVG_KM_MES / plan.kmIntervalo
      : plan.diasIntervalo
        ? 30 / plan.diasIntervalo
        : 0;

    return {
      planId: plan.id,
      planNombre: plan.nombre,
      kmIntervalo: plan.kmIntervalo,
      costoRepuestos: Math.round(costoRepuestos),
      costoManoObra: Math.round(costoManoObra),
      costoTotal: Math.round(costoTotal),
      frecuenciaMensual: Math.round(frecuenciaMensual * 100) / 100,
    };
  });

  const costoMensualEstimado = desglose.reduce(
    (sum, d) => sum + d.costoTotal * d.frecuenciaMensual,
    0
  );

  return {
    marcaMoto: marca,
    modeloMoto: modelo,
    costoMensualEstimado: Math.round(costoMensualEstimado),
    planesCount: planes.length,
    desglose,
  };
}
