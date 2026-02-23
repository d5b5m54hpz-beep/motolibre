import { prisma } from "@/lib/prisma";

// ── Porcentajes argentinos (empleado) ──
const JUBILACION = 0.11;
const OBRA_SOCIAL = 0.03;
const LEY_19032 = 0.03; // PAMI

// ── Porcentajes argentinos (empleador) ──
const CONTRIB_JUBILACION = 0.1017;
const CONTRIB_OBRA_SOCIAL = 0.06;
const CONTRIB_LEY_19032 = 0.015;
const CONTRIB_ART = 0.02;

/**
 * Genera próximo número de recibo: REC-2026-XXXXX
 */
export async function proximoNumeroRecibo(): Promise<string> {
  const anio = new Date().getFullYear();
  const prefix = `REC-${anio}-`;
  const ultimo = await prisma.reciboSueldo.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: "desc" },
  });
  const seq = ultimo ? parseInt(ultimo.numero.split("-")[2] ?? "0") + 1 : 1;
  return `${prefix}${seq.toString().padStart(5, "0")}`;
}

/**
 * Genera próximo legajo: EMP-XXX
 */
export async function proximoLegajo(): Promise<string> {
  const ultimo = await prisma.empleado.findFirst({
    orderBy: { legajo: "desc" },
  });
  const seq = ultimo ? parseInt(ultimo.legajo.split("-")[1] ?? "0") + 1 : 1;
  return `EMP-${seq.toString().padStart(3, "0")}`;
}

/**
 * Presentismo: 8.33% del básico si no tiene ausencias injustificadas
 */
export function calcularPresentismo(
  sueldoBasico: number,
  tieneAusenciaInjustificada: boolean
): number {
  return tieneAusenciaInjustificada ? 0 : Math.round(sueldoBasico * 0.0833);
}

/**
 * Antigüedad: 1% por año
 */
export function calcularAntiguedad(
  sueldoBasico: number,
  fechaIngreso: Date
): number {
  const anios = Math.floor(
    (Date.now() - fechaIngreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  return Math.round(sueldoBasico * anios * 0.01);
}

/**
 * Días hábiles entre dos fechas (excluye sáb y dom)
 */
export function calcularDiasHabiles(desde: Date, hasta: Date): number {
  let count = 0;
  const current = new Date(desde);
  while (current <= hasta) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

interface DatosLiquidacion {
  empleadoId: string;
  periodo: string; // "2026-02"
  tipo: "MENSUAL" | "AGUINALDO" | "VACACIONES" | "LIQUIDACION_FINAL";
  horasExtra?: number;
  otrosHaberes?: number;
  sindicato?: number; // % (2-3)
  impuestoGanancias?: number;
  otrasDeduccion?: number;
}

/**
 * Calcula una liquidación completa. No la guarda — retorna preview.
 */
export async function calcularLiquidacion(datos: DatosLiquidacion) {
  const periodoStart = new Date(`${datos.periodo}-01`);
  const periodoEnd = new Date(periodoStart);
  periodoEnd.setMonth(periodoEnd.getMonth() + 1);

  const empleado = await prisma.empleado.findUnique({
    where: { id: datos.empleadoId },
    include: {
      ausencias: {
        where: {
          tipo: "INJUSTIFICADA",
          estado: "APROBADA",
          fechaDesde: { gte: periodoStart },
          fechaHasta: { lt: periodoEnd },
        },
      },
    },
  });

  if (!empleado) throw new Error("Empleado no encontrado");

  const sueldoBasico = Number(empleado.sueldoBasico);
  const tieneInjustificada = empleado.ausencias.length > 0;

  // Haberes
  const presentismo = calcularPresentismo(sueldoBasico, tieneInjustificada);
  const antiguedad = calcularAntiguedad(sueldoBasico, empleado.fechaIngreso);
  const horasExtra = datos.horasExtra || 0;
  const otrosHaberes = datos.otrosHaberes || 0;
  const totalHaberes =
    sueldoBasico + presentismo + antiguedad + horasExtra + otrosHaberes;

  // Deducciones empleado
  const jubilacion = Math.round(totalHaberes * JUBILACION);
  const obraSocial = Math.round(totalHaberes * OBRA_SOCIAL);
  const ley19032 = Math.round(totalHaberes * LEY_19032);
  const sindicato = datos.sindicato
    ? Math.round((totalHaberes * datos.sindicato) / 100)
    : 0;
  const impuestoGanancias = datos.impuestoGanancias || 0;
  const otrasDeduccion = datos.otrasDeduccion || 0;
  const totalDeducciones =
    jubilacion +
    obraSocial +
    ley19032 +
    sindicato +
    impuestoGanancias +
    otrasDeduccion;

  // Neto
  const netoAPagar = totalHaberes - totalDeducciones;

  // Contribuciones empleador
  const contribJubilacion = Math.round(totalHaberes * CONTRIB_JUBILACION);
  const contribObraSocial = Math.round(totalHaberes * CONTRIB_OBRA_SOCIAL);
  const contribLey19032 = Math.round(totalHaberes * CONTRIB_LEY_19032);
  const contribART = Math.round(totalHaberes * CONTRIB_ART);
  const totalContribuciones =
    contribJubilacion + contribObraSocial + contribLey19032 + contribART;

  const costoTotalEmpleador = totalHaberes + totalContribuciones;

  return {
    empleado: {
      id: empleado.id,
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      legajo: empleado.legajo,
    },
    sueldoBasico,
    presentismo,
    antiguedad,
    horasExtra,
    otrosHaberes,
    totalHaberes,
    jubilacion,
    obraSocial,
    ley19032,
    sindicato,
    impuestoGanancias,
    otrasDeduccion,
    totalDeducciones,
    netoAPagar,
    contribJubilacion,
    contribObraSocial,
    contribLey19032,
    contribART,
    totalContribuciones,
    costoTotalEmpleador,
  };
}
